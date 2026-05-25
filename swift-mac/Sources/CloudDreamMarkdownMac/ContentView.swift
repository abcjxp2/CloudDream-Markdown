import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @Bindable var document: MarkdownDocument
    let appearanceMode: AppearanceMode
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 0) {
            if document.isEditing {
                editor
            } else if document.hasDocument {
                MarkdownPreview(
                    markdown: document.content,
                    searchText: document.searchText,
                    colorScheme: colorScheme
                )
            } else {
                emptyState
            }
        }
        .background(Color(nsColor: .textBackgroundColor))
        .navigationTitle(document.title)
        .background(WindowTitleSetter(title: document.title))
        .toolbar {
            ToolbarItemGroup {
                if document.isEditing {
                    Button("保存") {
                        document.save()
                    }
                    .disabled(!document.canSave)

                    Button("另存为") {
                        document.saveAs()
                    }

                    Button("退出编辑") {
                        document.toggleEditing()
                    }
                } else {
                    Button("编辑") {
                        document.toggleEditing()
                    }
                    .disabled(!document.hasDocument)
                }

                Button("打开") {
                    document.open()
                }

                TextField("搜索", text: $document.searchText)
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 220)
                    .disabled(document.isEditing || !document.hasDocument)
            }
        }
        .alert("打开失败", isPresented: Binding(
            get: { document.errorMessage != nil },
            set: { if !$0 { document.errorMessage = nil } }
        )) {
            Button("确定") {
                document.errorMessage = nil
            }
        } message: {
            Text(document.errorMessage ?? "")
        }
        .onDrop(of: [.fileURL], isTargeted: nil) { providers in
            guard let provider = providers.first else { return false }
            provider.loadItem(forTypeIdentifier: "public.file-url", options: nil) { item, _ in
                guard let data = item as? Data,
                      let url = URL(dataRepresentation: data, relativeTo: nil) else {
                    return
                }
                Task { @MainActor in
                    document.load(url: url)
                }
            }
            return true
        }
    }

    private var emptyState: some View {
        VStack {
            Button("打开 Markdown 文件") {
                document.open()
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var editor: some View {
        TextEditor(text: $document.draft)
            .font(.system(size: 13, design: .monospaced))
            .scrollContentBackground(.hidden)
            .padding(18)
            .background(Color(nsColor: .textBackgroundColor))
    }
}

private struct WindowTitleSetter: NSViewRepresentable {
    let title: String

    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        updateTitle(for: view)
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        updateTitle(for: nsView)
    }

    private func updateTitle(for view: NSView) {
        DispatchQueue.main.async {
            view.window?.title = title
        }
    }
}
