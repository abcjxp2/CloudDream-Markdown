import Foundation
import Observation
import UniformTypeIdentifiers
import SwiftUI

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

    func load(url: URL) {
        guard Self.isSupportedMarkdownURL(url) else {
            errorMessage = "这里只接受 Markdown 文件。"
            return
        }

        let didAccess = url.startAccessingSecurityScopedResource()
        defer {
            if didAccess {
                url.stopAccessingSecurityScopedResource()
            }
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
            draft = content
            isEditing = false
        } else if hasDocument {
            draft = content
            isEditing = true
        }
    }

    func save() {
        guard let fileURL else {
            return
        }

        let didAccess = fileURL.startAccessingSecurityScopedResource()
        defer {
            if didAccess {
                fileURL.stopAccessingSecurityScopedResource()
            }
        }

        do {
            try draft.write(to: fileURL, atomically: true, encoding: .utf8)
            content = draft
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func markExported(to url: URL) {
        fileURL = url
        content = draft
        errorMessage = nil
    }

    static func isSupportedMarkdownURL(_ url: URL) -> Bool {
        let pathExtension = url.pathExtension.lowercased()
        return pathExtension == "md" || pathExtension == "markdown"
    }
}

struct MarkdownExportDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.markdown] }

    var text: String

    init(text: String) {
        self.text = text
    }

    init(configuration: ReadConfiguration) throws {
        guard let data = configuration.file.regularFileContents,
              let text = String(data: data, encoding: .utf8) else {
            throw CocoaError(.fileReadCorruptFile)
        }

        self.text = text
    }

    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: Data(text.utf8))
    }
}

extension UTType {
    static let markdown = UTType(filenameExtension: "md") ?? .plainText
}
