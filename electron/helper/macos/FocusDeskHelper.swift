// FocusDeskHelper — the app's only native surface (D-038).
//
// Speaks JSON Lines over stdin/stdout: one command object per line in, one event
// object per line out. Everything platform-specific lives here, so porting to
// Windows means rewriting this file and nothing else.
//
// Build: npm run build:helper

import AppKit
import ApplicationServices
import CoreServices
import Foundation

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
/// picked up without walking the whole disk. Kept alongside the Spotlight query
/// because this half always works, index or no index (D-068).
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

/// Every application macOS has indexed, wherever it sits — the only way to find
/// one kept outside the usual folders, which is where they end up more often than
/// not (an app run straight out of ~/Downloads). Synchronous because the helper
/// answers one command at a time. An empty result means the index is off or does
/// not cover this machine's apps; the renderer says so rather than silently
/// showing a short list.
private func spotlightAppURLs() -> [URL] {
    guard let query = MDQueryCreate(
        kCFAllocatorDefault,
        "kMDItemContentType == 'com.apple.application-bundle'" as CFString,
        nil,
        nil
    ), MDQueryExecute(query, CFOptionFlags(kMDQuerySynchronous.rawValue)) else { return [] }

    var found: [URL] = []
    for index in 0..<MDQueryGetResultCount(query) {
        guard let raw = MDQueryGetResultAtIndex(query, index) else { continue }
        let item = unsafeBitCast(raw, to: MDItem.self)
        guard let path = MDItemCopyAttribute(item, kMDItemPath) as? String else { continue }
        found.append(URL(fileURLWithPath: path))
    }
    return found
}

/// Bundles that are not an app anyone opens: the copies bundled inside another
/// app, and everything under a Library folder — updater caches, printer drivers,
/// build products. The folder crawl never reaches these; the index is full of
/// them.
private func isOfferable(_ url: URL) -> Bool {
    let path = url.path
    return !path.contains(".app/") && !path.contains("/Library/")
}

/// Info.plist booleans are written both ways — `<true/>` and `<string>1</string>`.
private func infoFlag(_ info: [String: Any]?, _ key: String) -> Bool {
    if let number = info?[key] as? NSNumber { return number.boolValue }
    if let text = info?[key] as? String { return text == "1" || text.lowercased() == "true" }
    return false
}

/// An app that never opens a window: menu bar items, agents, updaters. There is
/// nothing for a widget to stand in for, so it is not offered at all (D-068).
private func isBackgroundOnly(_ bundle: Bundle) -> Bool {
    let info = bundle.infoDictionary
    return infoFlag(info, "LSUIElement") || infoFlag(info, "LSBackgroundOnly")
}

/// When the app was last opened, for ordering the picker. Comes from the same
/// index as the search above, so it is nil for everything when Spotlight is off.
private func lastUsed(_ url: URL) -> Date? {
    guard let item = MDItemCreate(kCFAllocatorDefault, url.path as CFString) else { return nil }
    return MDItemCopyAttribute(item, kMDItemLastUsedDate) as? Date
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
    let indexed = spotlightAppURLs()
    var byKey: [String: [String: Any]] = [:]
    var order: [(key: String, name: String, used: Date?)] = []

    // Crawl first, so the copy in /Applications is the one that wins over any
    // duplicate the index turns up elsewhere.
    for url in appBundleURLs() + indexed where isOfferable(url) {
        guard let bundle = Bundle(url: url),
              let appKey = bundle.bundleIdentifier,
              byKey[appKey] == nil,
              !isBackgroundOnly(bundle)
        else { continue }

        let name = FileManager.default.displayName(atPath: url.path)
        byKey[appKey] = [
            "appKey": appKey,
            "name": name,
            "icon": iconDataURI(for: url.path) ?? NSNull(),
        ]
        order.append((appKey, name, lastUsed(url)))
    }

    // Recently opened first: a list of a hundred apps is only useful if the few
    // the user actually works in are at the top. The rest fall back to
    // alphabetical, which is all of them when there are no dates to sort by.
    order.sort {
        switch ($0.used, $1.used) {
        case let (mine?, theirs?): return mine > theirs
        case (_?, nil): return true
        case (nil, _?): return false
        default:
            return $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending
        }
    }

    emit([
        "ev": "apps",
        "apps": order.compactMap { byKey[$0.key] },
        "spotlight": !indexed.isEmpty,
    ])
}

// MARK: - Launch

/// Starts the app, or brings it forward if it is already running.
///
/// `activate: false` is for opening a space's apps as it is entered: they are
/// wanted running and capturable, but taking the front away from the desk on
/// every space switch would be the opposite of what the switch was for.
private func launch(_ appKey: String, activate: Bool = true) {
    guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: appKey) else {
        emitError("launch", "not installed: \(appKey)")
        return
    }
    let config = NSWorkspace.OpenConfiguration()
    // Already running is the common case, and this brings it forward rather than
    // starting a second copy.
    config.activates = activate
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

/// The frame each placed window was last put at, so a change the user made — an
/// edge dragged, a window-manager shortcut — can be told apart from our own.
private var expectedFrames: [String: CGRect] = [:]
private var frameWatch: Timer?

/// The title of the window each app was last placed by, so `raise` and `restore`
/// stay on that window rather than following the app's focus elsewhere.
private var placedTitles: [String: String] = [:]

private func hasAccessibility(prompt: Bool) -> Bool {
    let key = kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String
    return AXIsProcessTrustedWithOptions([key: prompt] as CFDictionary)
}

private func runningApp(_ appKey: String) -> NSRunningApplication? {
    NSRunningApplication.runningApplications(withBundleIdentifier: appKey).first
}

private func title(of window: AXUIElement) -> String? {
    var value: AnyObject?
    guard AXUIElementCopyAttributeValue(window, kAXTitleAttribute as CFString, &value) == .success,
          let text = value as? String, !text.isEmpty
    else { return nil }
    return text
}

/// The window an app widget stands for: the one it had last time, else the one
/// the user was last in, else the biggest.
///
/// There is no window id in this protocol (D-040), so `wanted` — the title of the
/// window this widget placed before — is how one editor window is told from
/// another. It is only a preference: a title that no longer exists (the project
/// was closed) falls through to the same choice as before rather than failing.
///
/// `avoid` holds the titles other widgets in the space have already claimed, so
/// a second widget pointed at the same app does not land on the first one's
/// window — which is what happens otherwise, since the window the first widget
/// just used is also the focused one.
///
/// Not `AXMainWindow`: apps whose windows are drawn by their own framework do not
/// report one at all (FL Studio answers with an error), and it is unset on plenty
/// of apps that do have an obvious document window.
private func axWindows(of app: NSRunningApplication) -> [AXUIElement] {
    let axApp = AXUIElementCreateApplication(app.processIdentifier)
    var all: AnyObject?
    guard AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &all) == .success
    else { return [] }
    return (all as? [AXUIElement]) ?? []
}

private func documentWindow(
    of app: NSRunningApplication,
    wanted: String? = nil,
    avoid: Set<String> = []
) -> AXUIElement? {
    let windows = axWindows(of: app)

    if let wanted, let match = windows.first(where: { title(of: $0) == wanted }) {
        return match
    }

    let free = windows.filter { window in
        guard let text = title(of: window) else { return true }
        return !avoid.contains(text)
    }

    var focused: AnyObject?
    if AXUIElementCopyAttributeValue(
        AXUIElementCreateApplication(app.processIdentifier),
        kAXFocusedWindowAttribute as CFString,
        &focused
    ) == .success, let window = focused, CFGetTypeID(window) == AXUIElementGetTypeID() {
        let element = window as! AXUIElement
        // Skipping the focused window is only right when there is another one to
        // go to; a single claimed window still beats nothing at all.
        if avoid.isEmpty || free.isEmpty || free.contains(where: { CFEqual($0, element) }) {
            return element
        }
    }

    let area = { (window: AXUIElement) -> CGFloat in
        guard let box = frame(of: window) else { return 0 }
        return box.width * box.height
    }
    return (free.isEmpty ? windows : free).max { area($0) < area($1) }
}

private let fullScreenAttribute = "AXFullScreen" as CFString

/// An app in native fullscreen owns a Space of its own, which no other window can
/// join. Most windows will leave fullscreen when asked, though, so this is a thing
/// to undo rather than a reason to refuse.
private func isFullScreen(_ window: AXUIElement) -> Bool {
    var value: AnyObject?
    guard AXUIElementCopyAttributeValue(window, fullScreenAttribute, &value) == .success
    else { return false }
    return (value as? Bool) ?? false
}

/// Asks the window to leave fullscreen. False when it will not be asked.
private func leaveFullScreen(_ window: AXUIElement) -> Bool {
    var settable: DarwinBoolean = false
    guard AXUIElementIsAttributeSettable(window, fullScreenAttribute, &settable) == .success,
          settable.boolValue
    else { return false }
    AXUIElementSetAttributeValue(window, fullScreenAttribute, false as CFTypeRef)
    return true
}

private func isMinimized(_ window: AXUIElement) -> Bool {
    var value: AnyObject?
    guard AXUIElementCopyAttributeValue(window, kAXMinimizedAttribute as CFString, &value)
        == .success
    else { return false }
    return (value as? Bool) ?? false
}

/// How many real windows the app owns anywhere, on this desktop or not.
///
/// Accessibility reports an empty window list both for an app that has not opened
/// a window yet and for one whose windows live on another Space — a fullscreen
/// app shows nothing at all. This tells the two apart, so waiting six seconds for
/// a window that will never appear can be skipped, and the difference between the
/// two counts is how many windows are on some other desktop.
///
/// Only the count: window *titles* from this list would need Screen Recording,
/// which this app no longer asks for (D-047).
private func windowCount(pid: pid_t) -> Int {
    guard let list = CGWindowListCopyWindowInfo(
        [.optionAll, .excludeDesktopElements],
        kCGNullWindowID
    ) as? [[String: Any]] else { return 0 }

    return list.filter { entry in
        guard entry[kCGWindowOwnerPID as String] as? pid_t == pid,
              entry[kCGWindowLayer as String] as? Int == 0,
              let boxed = entry[kCGWindowBounds as String] as? NSDictionary,
              let bounds = CGRect(dictionaryRepresentation: boxed)
        else { return false }
        // Past the menu-bar strips and zero-sized helpers an app keeps around.
        return bounds.width > 200 && bounds.height > 200
    }.count
}

private func hasWindowsSomewhere(pid: pid_t) -> Bool { windowCount(pid: pid) > 0 }

/// Every window the app has open on this desktop, for the user to pick from, plus
/// how many it has somewhere else. A widget stands for one window (D-048), and
/// guessing is only right until the second window opens.
private func listWindows(_ appKey: String) {
    guard let app = runningApp(appKey) else {
        emit(["ev": "windows", "appKey": appKey, "running": false,
              "windows": [], "elsewhere": 0])
        return
    }
    guard hasAccessibility(prompt: true) else {
        emitError("windows", "accessibility")
        return
    }

    let axApp = AXUIElementCreateApplication(app.processIdentifier)
    var all: AnyObject?
    let windows =
        AXUIElementCopyAttributeValue(axApp, kAXWindowsAttribute as CFString, &all) == .success
        ? (all as? [AXUIElement]) ?? [] : []

    let described = windows.map { window -> [String: Any] in
        let box = frame(of: window) ?? .zero
        return [
            "title": title(of: window) ?? NSNull(),
            "width": box.width,
            "height": box.height,
            "minimized": isMinimized(window),
        ]
    }
    emit([
        "ev": "windows",
        "appKey": appKey,
        "running": true,
        "windows": described,
        // Windows macOS will not show accessibility: another Space, or fullscreen.
        "elsewhere": max(0, windowCount(pid: app.processIdentifier) - windows.count),
    ])
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
/// Long enough for an app to finish the layout pass that ate the first resize.
private let settleRetryDelay = 0.09

private func place(
    _ appKey: String,
    _ rect: CGRect,
    wanted: String? = nil,
    avoid: Set<String> = [],
    raise: Bool = true,
    attempt: Int = 0
) {
    guard hasAccessibility(prompt: true) else {
        emitError("place", "accessibility")
        return
    }

    let again = {
        if attempt + 1 >= placeAttempts { return false }
        DispatchQueue.main.asyncAfter(deadline: .now() + placeRetryDelay) {
            place(appKey, rect, wanted: wanted, avoid: avoid, raise: raise, attempt: attempt + 1)
        }
        return true
    }

    guard let app = runningApp(appKey) else {
        // Opening a space's app for the first time: start it, then keep looking.
        if attempt == 0 { launch(appKey) }
        if !again() { emitError("place", "notRunning") }
        return
    }
    // An assigned window that is not here has to be waited for, not replaced: the
    // widget was pointed at that window on purpose, and moving whichever other
    // window happens to be focused is worse than saying where it went. Only when
    // the app has none hidden away is a missing title treated as gone for good.
    if let wanted,
       !axWindows(of: app).contains(where: { title(of: $0) == wanted }),
       windowCount(pid: app.processIdentifier) > axWindows(of: app).count {
        if attempt == 0 { launch(appKey) }
        if !again() { emitError("place", "otherSpace") }
        return
    }

    guard let window = documentWindow(of: app, wanted: wanted, avoid: avoid),
          let current = frame(of: window)
    else {
        // Accessibility cannot see a window that lives on another Space, so an
        // empty list means either "no window yet" or "over there".
        //
        // Over there is recoverable: activating the app brings its Space forward,
        // and from there the window is an ordinary window again — which is
        // exactly what reaching for Mission Control was doing by hand. Once it is
        // visible the fullscreen check below sends it back to a shared desktop.
        if hasWindowsSomewhere(pid: app.processIdentifier) {
            // Through LaunchServices, not `activate()`: this helper is a
            // background process and never active itself, and macOS ignores an
            // activation request from one of those.
            if attempt == 0 { launch(appKey) }
            if !again() { emitError("place", "otherSpace") }
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
    // Fullscreen means a Space of its own, which this window cannot be placed
    // into — but asking it to leave usually works, and refusing outright would
    // break every app that would have come quietly.
    if isFullScreen(window) {
        if leaveFullScreen(window), again() { return }
        emitError("place", "fullscreen")
        return
    }

    // Only the first placement is the user's own layout; following the widget
    // around afterwards must not overwrite it.
    if savedFrames[appKey] == nil { savedFrames[appKey] = current }
    // What `raise` and `restore` should act on, so they keep meaning this window
    // even once the user has focused another one of the app's.
    placedTitles[appKey] = title(of: window)

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
    let finish = { (actual: CGRect) in
        expectedFrames[appKey] = actual
        startFrameWatch()
        // Not on every placement: a window already sitting on its widget must not
        // jump in front of the desk every time the canvas is zoomed.
        if raise {
            app.activate()
            AXUIElementPerformAction(window, kAXRaiseAction as CFString)
        }
        emit([
            "ev": "placed",
            "appKey": appKey,
            "resizable": resizable,
            // The widget stores this and asks for the same window next time.
            "title": placedTitles[appKey] ?? NSNull(),
            "rect": ["x": actual.origin.x, "y": actual.origin.y,
                     "width": actual.size.width, "height": actual.size.height],
        ])
    }

    let landed = frame(of: window) ?? target
    // Apps that lay themselves out asynchronously — anything Electron-based, and
    // this editor is one — swallow a frame that arrives while they are still
    // working through the last one. An app just starting up is worse: it puts its
    // window back where it left it, after we have already moved it, so the window
    // ends up the widget's size at its own old position. Either way one more pass
    // once it has caught up, then report whatever it settled on.
    let missed =
        abs(landed.minX - target.minX) > 2 || abs(landed.minY - target.minY) > 2
        || (resizable
            && (abs(landed.width - target.width) > 2 || abs(landed.height - target.height) > 2))
    if missed {
        DispatchQueue.main.asyncAfter(deadline: .now() + settleRetryDelay) {
            if resizable {
                setFrame(window, target)
            } else {
                setPosition(window, target.origin)
            }
            finish(frame(of: window) ?? target)
        }
        return
    }
    finish(landed)
}

/// Position only, for a window following its widget across the canvas. Resizing
/// is what makes an app lay its interface out again, so panning must not do it.
private func move(_ appKey: String, _ origin: CGPoint) {
    guard savedFrames[appKey] != nil,
          let app = runningApp(appKey),
          let window = documentWindow(of: app, wanted: placedTitles[appKey]),
          let current = frame(of: window)
    else { return }
    let wanted = CGRect(origin: origin, size: current.size)
    let target = clamp(wanted, into: visibleBounds(containing: wanted))
    setPosition(window, target.origin)
    expectedFrames[appKey] = CGRect(origin: target.origin, size: current.size)
}

/// Reports a placed window that has ended up somewhere we did not put it. Polled
/// rather than observed: one accessibility read per open window, a few times a
/// second, against an `AXObserver` per window that has to be torn down by hand.
private func startFrameWatch() {
    guard frameWatch == nil else { return }
    frameWatch = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { _ in
        for (appKey, expected) in expectedFrames {
            // Quitting the app itself is how a placed window most often ends, and
            // nothing else notices: no window means no frame to report, so the
            // desk would go on treating it as live for the rest of the session.
            guard runningApp(appKey) != nil else {
                expectedFrames.removeValue(forKey: appKey)
                placedTitles.removeValue(forKey: appKey)
                savedFrames.removeValue(forKey: appKey)
                emit(["ev": "gone", "appKey": appKey])
                continue
            }
            guard let app = runningApp(appKey),
                  let window = documentWindow(of: app, wanted: placedTitles[appKey]),
                  let current = frame(of: window)
            else { continue }
            if abs(current.minX - expected.minX) < 2, abs(current.minY - expected.minY) < 2,
               abs(current.width - expected.width) < 2, abs(current.height - expected.height) < 2 {
                continue
            }
            expectedFrames[appKey] = current
            emit([
                "ev": "window",
                "appKey": appKey,
                "rect": ["x": current.origin.x, "y": current.origin.y,
                         "width": current.size.width, "height": current.size.height],
            ])
        }
    }
}

private func restore(_ appKey: String) {
    expectedFrames.removeValue(forKey: appKey)
    let placed = placedTitles.removeValue(forKey: appKey)
    guard let saved = savedFrames.removeValue(forKey: appKey),
          let app = runningApp(appKey),
          let window = documentWindow(of: app, wanted: placed)
    else { return }
    // Clamped too: the window may have been saved from a display that is gone.
    setFrame(window, clamp(saved, into: visibleBounds(containing: saved)))
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
        launch(appKey, activate: object["activate"] as? Bool ?? true)
    case "windows":
        guard let appKey = object["appKey"] as? String else {
            emitError("windows", "missing appKey")
            return
        }
        listWindows(appKey)
    case "watch":
        startWatching()
    case "permissions":
        emit([
            "ev": "permissions",
            "accessibility": hasAccessibility(prompt: false),
        ])
    case "place":
        guard let appKey = object["appKey"] as? String,
              let rect = object["rect"] as? [String: Double],
              let x = rect["x"], let y = rect["y"],
              let width = rect["width"], let height = rect["height"]
        else {
            emitError("place", "bad arguments")
            return
        }
        place(
            appKey,
            CGRect(x: x, y: y, width: width, height: height),
            wanted: object["title"] as? String,
            avoid: Set(object["avoid"] as? [String] ?? []),
            raise: object["raise"] as? Bool ?? true
        )
    case "move":
        guard let appKey = object["appKey"] as? String,
              let rect = object["rect"] as? [String: Double],
              let x = rect["x"], let y = rect["y"]
        else {
            emitError("move", "bad arguments")
            return
        }
        move(appKey, CGPoint(x: x, y: y))
    case "raise":
        guard let appKey = object["appKey"] as? String else {
            emitError("raise", "missing appKey")
            return
        }
        // Only for an app that is already running: `raise` means "come forward",
        // and one of these is sent for every live app at once, so starting
        // anything here opens apps the user never asked for.
        guard let app = runningApp(appKey) else { return }
        // Through LaunchServices for the same reason `place` does: a background
        // process cannot activate anything by asking directly.
        launch(appKey)
        if let window = documentWindow(of: app, wanted: placedTitles[appKey]) {
            AXUIElementPerformAction(window, kAXRaiseAction as CFString)
        }
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

// Normally the pipe closing is what ends this process, but a parent that is
// killed outright can leave its write end held elsewhere and the read never
// ends — one stray helper per crash, each still holding Accessibility and still
// sitting on windows it will now never put back.
private func watchParent() {
    Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
        if getppid() == 1 { exit(0) }
    }
}

// An AppKit run loop, but never in the Dock or the app switcher.
let nsApp = NSApplication.shared
nsApp.setActivationPolicy(.prohibited)
readStdin()
watchParent()
nsApp.run()
