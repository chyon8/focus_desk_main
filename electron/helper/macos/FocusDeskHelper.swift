// FocusDeskHelper — the app's only native surface (D-038).
//
// Speaks JSON Lines over stdin/stdout: one command object per line in, one event
// object per line out. Everything platform-specific lives here, so porting to
// Windows means rewriting this file and nothing else.
//
// Phase A implements list / launch / watch. windows / place / capture come with
// thumbnails and live placement (see docs/APP-SURFACE.md).
//
// Build: npm run build:helper

import AppKit
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
