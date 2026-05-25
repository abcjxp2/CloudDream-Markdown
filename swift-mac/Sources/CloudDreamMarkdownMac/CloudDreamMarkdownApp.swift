import SwiftUI
import UniformTypeIdentifiers

@main
struct CloudDreamMarkdownApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var document = MarkdownDocument()

    var body: some Scene {
        Window("云梦Markdown", id: "main") {
            ContentView(document: document)
                .frame(minWidth: 760, minHeight: 560)
                .onAppear {
                    appDelegate.document = document
                }
                .onOpenURL { url in
                    document.load(url: url)
                }
        }
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("打开...") {
                    document.open()
                }
                .keyboardShortcut("o")

                Button("保存") {
                    document.save()
                }
                .keyboardShortcut("s")
                .disabled(!document.canSave)

                Button("另存为...") {
                    document.saveAs()
                }
                .keyboardShortcut("s", modifiers: [.command, .shift])
                .disabled(!document.isEditing)
            }

            CommandMenu("编辑模式") {
                Button(document.isEditing ? "退出编辑模式" : "进入编辑模式") {
                    document.toggleEditing()
                }
                .keyboardShortcut("e")
                .disabled(!document.hasDocument)
            }
        }
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    weak var document: MarkdownDocument? {
        didSet {
            guard let document else { return }
            pendingURLs.forEach { document.load(url: $0) }
            pendingURLs.removeAll()
        }
    }

    private var pendingURLs: [URL] = []

    func application(_ application: NSApplication, open urls: [URL]) {
        guard let document else {
            pendingURLs.append(contentsOf: urls)
            return
        }

        urls.forEach { document.load(url: $0) }
    }

    func application(_ sender: NSApplication, openFile filename: String) -> Bool {
        openFilenames([filename])
        return true
    }

    func application(_ sender: NSApplication, openFiles filenames: [String]) {
        openFilenames(filenames)
        sender.reply(toOpenOrPrint: .success)
    }

    private func openFilenames(_ filenames: [String]) {
        let urls = filenames.map { URL(fileURLWithPath: $0) }
        guard let document else {
            pendingURLs.append(contentsOf: urls)
            return
        }

        urls.forEach { document.load(url: $0) }
    }
}
