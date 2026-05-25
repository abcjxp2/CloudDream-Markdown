import AppKit
import Observation
import UniformTypeIdentifiers

@MainActor
@Observable
final class MarkdownDocument {
    var fileURL: URL?
    var content = ""
    var draft = ""
    var isEditing = false
    var searchText = ""
    var errorMessage: String?

    var hasDocument: Bool {
        fileURL != nil || !content.isEmpty
    }

    var title: String {
        fileURL?.lastPathComponent ?? "云梦Markdown"
    }

    var canSave: Bool {
        isEditing && fileURL != nil
    }

    var isDirty: Bool {
        isEditing && draft != content
    }

    func open() {
        guard confirmDiscardIfNeeded() else { return }

        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.markdown]
        panel.allowsMultipleSelection = false
        panel.canChooseDirectories = false
        panel.canChooseFiles = true

        if panel.runModal() == .OK, let url = panel.url {
            load(url: url)
        }
    }

    func load(url: URL) {
        guard Self.isSupportedMarkdownURL(url) else {
            errorMessage = "这里只接受 Markdown 文件。"
            return
        }

        do {
            let loaded = try String(contentsOf: url, encoding: .utf8)
            fileURL = url
            content = loaded
            draft = loaded
            isEditing = false
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func toggleEditing() {
        if isEditing {
            guard confirmDiscardIfNeeded() else { return }
            draft = content
            isEditing = false
        } else if hasDocument {
            draft = content
            isEditing = true
        }
    }

    func save() {
        guard let fileURL else {
            saveAs()
            return
        }

        do {
            try draft.write(to: fileURL, atomically: true, encoding: .utf8)
            content = draft
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func saveAs() {
        let panel = NSSavePanel()
        panel.allowedContentTypes = [.markdown]
        panel.nameFieldStringValue = fileURL?.lastPathComponent ?? "未命名.md"

        if panel.runModal() == .OK, let url = panel.url {
            fileURL = Self.normalizedMarkdownURL(url)
            save()
        }
    }

    static func isSupportedMarkdownURL(_ url: URL) -> Bool {
        let pathExtension = url.pathExtension.lowercased()
        return pathExtension == "md" || pathExtension == "markdown"
    }

    private static func normalizedMarkdownURL(_ url: URL) -> URL {
        url.pathExtension.isEmpty ? url.appendingPathExtension("md") : url
    }

    private func confirmDiscardIfNeeded() -> Bool {
        guard isDirty else { return true }

        let alert = NSAlert()
        alert.messageText = "有未保存修改，确定放弃？"
        alert.addButton(withTitle: "放弃")
        alert.addButton(withTitle: "取消")
        return alert.runModal() == .alertFirstButtonReturn
    }
}

extension UTType {
    static let markdown = UTType(filenameExtension: "md") ?? .plainText
}
