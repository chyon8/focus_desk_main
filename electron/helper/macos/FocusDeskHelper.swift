// FocusDeskHelper — the app's only native surface (D-038).
//
// Speaks JSON Lines over stdin/stdout: one command object per line in, one event
// object per line out. Everything platform-specific lives here, so porting to
// Windows means rewriting this file and nothing else.
//
// Build: npm run build:helper

import AppKit
import ApplicationServices
import Foundation
import ScreenCaptureKit

// MARK: - Output

private let outLock = NSLock()

func emit(_ object: [String: Any]) {
    guard let data = try? JSONSerialization.data(withJSONObject: object),
          let line = String(data: data, encoding: .utf8)
    else { return }
    outLock.lock()
    print(line)
    fflush(stdout)
    outLock.unlock()
}

func emitError(_ cmd: String, _ reason: String) {
    emit(["ev": "error", "cmd": cmd, "reason": reason])
}

// MARK: - Installed applications

private let searchRoots = [
    "/Applications",
    "/System/Applications",
    NSHomeDirectory() + "/Applications",
]

/// App bundles in the usual places, one folder deep so /Applications/Utilities is
/// picked up without walking the whole disk.
private func appBundleURLs() -> [URL] {
    let fm = FileManager.default
    var found: [URL] = []

    for root in searchRoots {
        guard let entries = try? fm.contentsOfDirectory(
            at: URL(fileURLWithPath: root),
            includingPropertiesForKeys: nil,
            options: [.skipsHiddenFiles]
        ) else { continue }

        for entry in entries {
            if entry.pathExtension == "app" {
                found.append(entry)
            } else if (try? entry.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true {
                let nested = (try? fm.contentsOfDirectory(
                    at: entry,
                    includingPropertiesForKeys: nil,
                    options: [.skipsHiddenFiles]
                )) ?? []
                found.append(contentsOf: nested.filter { $0.pathExtension == "app" })
            }
        }
    }
    return found
}

/// A square PNG data URI, small enough that a few hundred of them cross the pipe
/// without the list command feeling slow.
private func iconDataURI(for path: String, side: CGFloat = 64) -> String? {
    let image = NSWorkspace.shared.icon(forFile: path)
    let pixels = Int(side)
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: pixels,
        pixelsHigh: pixels,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else { return nil }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    image.draw(in: NSRect(x: 0, y: 0, width: side, height: side))
    NSGraphicsContext.restoreGraphicsState()

    guard let png = rep.representation(using: .png, properties: [:]) else { return nil }
    return "data:image/png;base64," + png.base64EncodedString()
}

private func listApps() {
    var byKey: [String: [String: Any]] = [:]

    for url in appBundleURLs() {
        guard let bundle = Bundle(url: url),
              let appKey = bundle.bundleIdentifier
        else { continue }
        // The same app can sit in more than one root; first one found wins.
        if byKey[appKey] != nil { continue }

        let name = FileManager.default.displayName(atPath: url.path)
        byKey[appKey] = [
            "appKey": appKey,
            "name": name,
            "icon": iconDataURI(for: url.path) ?? NSNull(),
        ]
    }

    let apps = byKey.values.sorted {
        ($0["name"] as? String ?? "").localizedCaseInsensitiveCompare($1["name"] as? String ?? "")
            == .orderedAscending
    }
    emit(["ev": "apps", "apps": apps])
}

// MARK: - Launch

private func launch(_ appKey: String) {
    guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: appKey) else {
        emitError("launch", "not installed: \(appKey)")
        return
    }
    let config = NSWorkspace.OpenConfiguration()
    // Already running is the common case, and this brings it forward rather than
    // starting a second copy.
    config.activates = true
    NSWorkspace.shared.openApplication(at: url, configuration: config) { _, error in
        if let error { emitError("launch", error.localizedDescription) }
    }
}

// MARK: - Window placement

// macOS has no way to make another process's window a child of ours, so a live
// app is a real window moved onto the rectangle the widget occupies (D-038).
// AX positions are top-left points on the primary display, which is exactly what
// Electron reports, so no coordinate conversion happens anywhere.

/// Where each placed window sat before we moved it, so leaving live mode gives
/// the user their window back rather than leaving it widget-shaped.
private var savedFrames: [String: CGRect] = [:]

private func hasAccessibility(prompt: Bool) -> Bool {
    let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
    return AXIsProcessTrustedWithOptions([key: prompt] as CFDictionary)
}

private func runningApp(_ appKey: String) -> NSRunningApplication? {
    NSRunningApplication.runningApplications(withBundleIdentifier: appKey).first
}

/// The app's biggest window — its document window rather than a palette or an
/// inspector, and the same one the thumbnail captures.
///
/// Not `AXMainWindow`: apps whose windows are drawn by their own framework do
/// not report one at all (FL Studio answers with an error), and the attribute is
/// unset on plenty of apps that do have an obvious document window.
private func documentWindow(of app: NSRunningApplication) -> AXUIElement? {
    let axApp = AXUIElementCreateApplication(app.processIdentifier)
    var all: AnyObject?
    guard AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &all) == .success,
          let windows = all as? [AXUIElement]
    else { return nil }

    let area = { (window: AXUIElement) -> CGFloat in
        guard let box = frame(of: window) else { return 0 }
        return box.width * box.height
    }
    return windows.max { area($0) < area($1) }
}

/// An app in native fullscreen owns a Space of its own, and macOS lets no other
/// window join it. Nothing can be placed there; the user has to leave fullscreen.
private func isFullScreen(_ window: AXUIElement) -> Bool {
    var value: AnyObject?
    guard AXUIElementCopyAttributeValue(window, "AXFullScreen" as CFString, &value) == .success
    else { return false }
    return (value as? Bool) ?? false
}

private func isMinimized(_ window: AXUIElement) -> Bool {
    var value: AnyObject?
    guard AXUIElementCopyAttributeValue(window, kAXMinimizedAttribute as CFString, &value)
        == .success
    else { return false }
    return (value as? Bool) ?? false
}

/// Real windows the app owns anywhere, on this desktop or not.
///
/// Accessibility reports an empty window list both for an app that has not opened
/// a window yet and for one whose windows live on another Space — a fullscreen
/// app shows nothing at all. This tells the two apart, so waiting six seconds for
/// a window that will never appear can be skipped.
private func hasWindowsSomewhere(pid: pid_t) -> Bool {
    guard let list = CGWindowListCopyWindowInfo(
        [.optionAll, .excludeDesktopElements],
        kCGNullWindowID
    ) as? [[String: Any]] else { return false }

    return list.contains { entry in
        guard entry[kCGWindowOwnerPID as String] as? pid_t == pid,
              entry[kCGWindowLayer as String] as? Int == 0,
              let boxed = entry[kCGWindowBounds as String] as? NSDictionary,
              let bounds = CGRect(dictionaryRepresentation: boxed)
        else { return false }
        // Past the menu-bar strips and zero-sized helpers an app keeps around.
        return bounds.width > 200 && bounds.height > 200
    }
}

/// Whether the window sits on the desktop the user is currently looking at.
///
/// Windows on another Space are not "on screen", and no public API moves them
/// across — activating the app switches the user's desktop instead, which is why
/// a window on another Space appears to do nothing until Mission Control is used.
/// Bounds rather than window ids, because the id an AXUIElement wraps is private.
private func isOnCurrentSpace(pid: pid_t, frame: CGRect) -> Bool {
    guard let list = CGWindowListCopyWindowInfo(
        [.optionOnScreenOnly, .excludeDesktopElements],
        kCGNullWindowID
    ) as? [[String: Any]] else {
        return true  // Cannot tell — never block on a guess.
    }

    for entry in list {
        guard entry[kCGWindowOwnerPID as String] as? pid_t == pid,
              let boxed = entry[kCGWindowBounds as String] as? NSDictionary,
              let bounds = CGRect(dictionaryRepresentation: boxed)
        else { continue }
        if abs(bounds.width - frame.width) < 2 && abs(bounds.height - frame.height) < 2 {
            return true
        }
    }
    return false
}

/// Whether the window will accept a new size at all. Plenty will not: a window
/// drawn by the app's own toolkit often exposes position but not size, and one
/// written to anyway simply keeps the size it had.
private func isResizable(_ window: AXUIElement) -> Bool {
    var settable: DarwinBoolean = false
    guard AXUIElementIsAttributeSettable(window, kAXSizeAttribute as CFString, &settable)
        == .success
    else { return false }
    return settable.boolValue
}

/// The usable area of the screen a rectangle sits on, converted to the top-left
/// origin AX uses (NSScreen measures from the bottom-left of the primary display).
private func visibleBounds(containing rect: CGRect) -> CGRect {
    let screens = NSScreen.screens
    guard let primary = screens.first else { return rect }
    let flip = primary.frame.height

    let toAX = { (frame: CGRect) in
        CGRect(x: frame.minX, y: flip - frame.maxY, width: frame.width, height: frame.height)
    }
    let center = CGPoint(x: rect.midX, y: rect.midY)
    for screen in screens where toAX(screen.visibleFrame).contains(center) {
        return toAX(screen.visibleFrame)
    }
    return toAX(primary.visibleFrame)
}

/// Keeps a window fully on screen. One larger than the screen is pinned to the
/// top-left corner rather than pushed off the bottom.
private func clamp(_ rect: CGRect, into bounds: CGRect) -> CGRect {
    CGRect(
        x: min(max(rect.minX, bounds.minX), max(bounds.minX, bounds.maxX - rect.width)),
        y: min(max(rect.minY, bounds.minY), max(bounds.minY, bounds.maxY - rect.height)),
        width: rect.width,
        height: rect.height
    )
}

private func frame(of window: AXUIElement) -> CGRect? {
    var positionValue: AnyObject?
    var sizeValue: AnyObject?
    guard AXUIElementCopyAttributeValue(window, kAXPositionAttribute as CFString, &positionValue)
        == .success,
        AXUIElementCopyAttributeValue(window, kAXSizeAttribute as CFString, &sizeValue) == .success
    else { return nil }

    var origin = CGPoint.zero
    var size = CGSize.zero
    AXValueGetValue(positionValue as! AXValue, .cgPoint, &origin)
    AXValueGetValue(sizeValue as! AXValue, .cgSize, &size)
    return CGRect(origin: origin, size: size)
}

private func setPosition(_ window: AXUIElement, _ origin: CGPoint) {
    var value = origin
    if let boxed = AXValueCreate(.cgPoint, &value) {
        AXUIElementSetAttributeValue(window, kAXPositionAttribute as CFString, boxed)
    }
}

private func setSize(_ window: AXUIElement, _ size: CGSize) {
    var value = size
    if let boxed = AXValueCreate(.cgSize, &value) {
        AXUIElementSetAttributeValue(window, kAXSizeAttribute as CFString, boxed)
    }
}

/// Size, move, size again. A window sitting near a screen edge has its first
/// resize clipped to the room it has there; the second write lands once it has
/// been moved somewhere with space.
private func setFrame(_ window: AXUIElement, _ rect: CGRect) {
    setSize(window, rect.size)
    setPosition(window, rect.origin)
    setSize(window, rect.size)
}

/// How long to keep waiting for a window while an app that was not running starts up.
private let placeAttempts = 12
private let placeRetryDelay = 0.5

private func place(_ appKey: String, _ rect: CGRect, attempt: Int = 0) {
    guard hasAccessibility(prompt: true) else {
        emitError("place", "accessibility")
        return
    }

    let again = {
        if attempt + 1 >= placeAttempts { return false }
        DispatchQueue.main.asyncAfter(deadline: .now() + placeRetryDelay) {
            place(appKey, rect, attempt: attempt + 1)
        }
        return true
    }

    guard let app = runningApp(appKey) else {
        // Opening a space's app for the first time: start it, then keep looking.
        if attempt == 0 { launch(appKey) }
        if !again() { emitError("place", "notRunning") }
        return
    }
    guard let window = documentWindow(of: app), let current = frame(of: window) else {
        // Windows on another Space are invisible to Accessibility, so an empty
        // list can mean either "not opened yet" or "over there".
        if hasWindowsSomewhere(pid: app.processIdentifier) {
            emitError("place", "otherSpace")
            return
        }
        if !again() { emitError("place", "noWindow") }
        return
    }

    // A minimised window has nothing to place; bring it back and look again.
    if isMinimized(window) {
        AXUIElementSetAttributeValue(window, kAXMinimizedAttribute as CFString, false as CFTypeRef)
        if !again() { emitError("place", "minimized") }
        return
    }
    // Both of these are the user's to undo — macOS offers no way across a Space
    // boundary, and activating the app would drag them off this desktop instead.
    if isFullScreen(window) {
        emitError("place", "fullscreen")
        return
    }
    if !isOnCurrentSpace(pid: app.processIdentifier, frame: current) {
        emitError("place", "otherSpace")
        return
    }

    // Only the first placement is the user's own layout; following the widget
    // around afterwards must not overwrite it.
    if savedFrames[appKey] == nil { savedFrames[appKey] = current }

    let resizable = isResizable(window)
    // A window that will not resize keeps its size, so centre it on the widget.
    // Pinning its top-left there instead leaves a window taller than the space
    // hanging off the bottom of the screen, out of reach of its own title bar —
    // which is exactly how this went wrong the first time.
    let wanted =
        resizable
        ? rect
        : CGRect(
            x: rect.midX - current.width / 2,
            y: rect.midY - current.height / 2,
            width: current.width,
            height: current.height
        )
    let target = clamp(wanted, into: visibleBounds(containing: wanted))

    if resizable {
        setFrame(window, target)
    } else {
        setPosition(window, target.origin)
    }

    // What it actually took, which an app with a minimum size may not match.
    let actual = frame(of: window) ?? target
    app.activate()
    AXUIElementPerformAction(window, kAXRaiseAction as CFString)

    emit([
        "ev": "placed",
        "appKey": appKey,
        "resizable": resizable,
        "rect": ["x": actual.origin.x, "y": actual.origin.y,
                 "width": actual.size.width, "height": actual.size.height],
    ])
}

private func restore(_ appKey: String) {
    guard let saved = savedFrames.removeValue(forKey: appKey),
          let app = runningApp(appKey),
          let window = documentWindow(of: app)
    else { return }
    // Clamped too: the window may have been saved from a display that is gone.
    setFrame(window, clamp(saved, into: visibleBounds(containing: saved)))
}

// MARK: - Window capture

// A widget shows the app's window as a live thumbnail while it is not placed.
// The window is behind Focus Desk rather than hidden at that point, which is
// exactly why it can still be captured — a hidden window cannot be (D-038).

private func captureWindow(_ appKey: String, maxWidth: Int) {
    guard CGPreflightScreenCaptureAccess() else {
        emitError("capture", "screenRecording")
        return
    }

    Task {
        do {
            let content = try await SCShareableContent.excludingDesktopWindows(
                true,
                onScreenWindowsOnly: false
            )
            // Biggest window wins: the document window rather than a palette or
            // an inspector.
            let windows = content.windows.filter {
                $0.owningApplication?.bundleIdentifier == appKey
                    && $0.frame.width > 120 && $0.frame.height > 120
            }
            guard let window = windows.max(by: {
                $0.frame.width * $0.frame.height < $1.frame.width * $1.frame.height
            }) else {
                emitError("capture", "no window")
                return
            }

            let config = SCStreamConfiguration()
            let scale = min(1.0, Double(maxWidth) / window.frame.width)
            config.width = Int(window.frame.width * scale)
            config.height = Int(window.frame.height * scale)
            config.showsCursor = false

            let image = try await SCScreenshotManager.captureImage(
                contentFilter: SCContentFilter(desktopIndependentWindow: window),
                configuration: config
            )
            // JPEG, not PNG: this crosses the pipe once a second, and a screenshot
            // of a UI encodes to roughly a tenth of the size with no visible cost
            // at thumbnail scale.
            guard let jpeg = NSBitmapImageRep(cgImage: image)
                .representation(using: .jpeg, properties: [.compressionFactor: 0.6])
            else {
                emitError("capture", "encode failed")
                return
            }
            emit([
                "ev": "capture",
                "appKey": appKey,
                "image": "data:image/jpeg;base64," + jpeg.base64EncodedString(),
            ])
        } catch {
            emitError("capture", error.localizedDescription)
        }
    }
}

// MARK: - Frontmost application

// NSWorkspace posts this without any permission prompt, and it is event-driven,
// so nothing here polls.
private var watching = false

private func startWatching() {
    if watching { return }
    watching = true

    NSWorkspace.shared.notificationCenter.addObserver(
        forName: NSWorkspace.didActivateApplicationNotification,
        object: nil,
        queue: .main
    ) { note in
        let app = note.userInfo?[NSWorkspace.applicationUserInfoKey] as? NSRunningApplication
        emit(["ev": "frontmost", "appKey": app?.bundleIdentifier ?? NSNull()])
    }

    // The state at subscribe time, so the renderer does not wait for the next switch.
    let current = NSWorkspace.shared.frontmostApplication?.bundleIdentifier
    emit(["ev": "frontmost", "appKey": current ?? NSNull()])
}

// MARK: - Command loop

private func handle(_ line: String) {
    guard let data = line.data(using: .utf8),
          let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let cmd = object["cmd"] as? String
    else { return }

    switch cmd {
    case "list":
        listApps()
    case "launch":
        guard let appKey = object["appKey"] as? String else {
            emitError("launch", "missing appKey")
            return
        }
        launch(appKey)
    case "watch":
        startWatching()
    case "permissions":
        emit([
            "ev": "permissions",
            "accessibility": hasAccessibility(prompt: false),
            "screenRecording": CGPreflightScreenCaptureAccess(),
        ])
    case "ask-capture-access":
        // Shows the system prompt; the answer only takes effect on a restart.
        CGRequestScreenCaptureAccess()
    case "capture":
        guard let appKey = object["appKey"] as? String else {
            emitError("capture", "missing appKey")
            return
        }
        captureWindow(appKey, maxWidth: object["maxWidth"] as? Int ?? 480)
    case "place":
        guard let appKey = object["appKey"] as? String,
              let rect = object["rect"] as? [String: Double],
              let x = rect["x"], let y = rect["y"],
              let width = rect["width"], let height = rect["height"]
        else {
            emitError("place", "bad arguments")
            return
        }
        place(appKey, CGRect(x: x, y: y, width: width, height: height))
    case "restore":
        guard let appKey = object["appKey"] as? String else {
            emitError("restore", "missing appKey")
            return
        }
        restore(appKey)
    default:
        emitError(cmd, "unknown command")
    }
}

private var pending = Data()

private func readStdin() {
    FileHandle.standardInput.readabilityHandler = { handle in
        let chunk = handle.availableData
        // Empty read means the parent went away; there is nothing left to serve.
        // Quitting from the main queue lets commands already queued there finish.
        if chunk.isEmpty {
            DispatchQueue.main.async { exit(0) }
            return
        }

        pending.append(chunk)
        while let breakAt = pending.firstIndex(of: 0x0A) {
            let line = pending[pending.startIndex..<breakAt]
            pending = pending[pending.index(after: breakAt)...]
            if let text = String(data: line, encoding: .utf8), !text.isEmpty {
                // Commands touch AppKit, which wants the main thread.
                DispatchQueue.main.async { handle_line(text) }
            }
        }
    }
}

private func handle_line(_ text: String) { handle(text) }

// An AppKit run loop, but never in the Dock or the app switcher.
let nsApp = NSApplication.shared
nsApp.setActivationPolicy(.prohibited)
readStdin()
nsApp.run()
