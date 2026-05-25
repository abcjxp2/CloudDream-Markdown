import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @Bindable var document: MarkdownDocument
    @Binding var appearanceModeRawValue: String
    @Environment(\.colorScheme) private var colorScheme
    @State private var isImporterPresented = false
    @State private var isExporterPresented = false
    @State private var isSettingsPresented = false

    private var appearanceMode: AppearanceMode {
        get { AppearanceMode(rawValue: appearanceModeRawValue) ?? .system }
        nonmutating set { appearanceModeRawValue = newValue.rawValue }
    }

    var body: some View {
        NavigationStack {
            Group {
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
            .navigationTitle(document.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .topBarLeading) {
                    Button("打开") {
                        isImporterPresented = true
                    }
                }

                ToolbarItemGroup(placement: .topBarTrailing) {
                    if document.isEditing {
                        Button("保存") {
                            document.save()
                        }
                        .disabled(!document.canSave)

                        Button("另存") {
                            isExporterPresented = true
                        }

                        Button("完成") {
                            document.toggleEditing()
                        }
                    } else {
                        Button("编辑") {
                            document.toggleEditing()
                        }
                        .disabled(!document.hasDocument)
                    }

                    Button {
                        isSettingsPresented = true
                    } label: {
                        Image(systemName: "gearshape")
                    }
                    .accessibilityLabel("设置")
                }
            }
            .searchable(text: $document.searchText, placement: .navigationBarDrawer(displayMode: .always), prompt: "搜索")
            .fileImporter(
                isPresented: $isImporterPresented,
                allowedContentTypes: [.markdown],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    guard let url = urls.first else { return }
                    document.load(url: url)
                case .failure(let error):
                    document.errorMessage = error.localizedDescription
                }
            }
            .fileExporter(
                isPresented: $isExporterPresented,
                document: MarkdownExportDocument(text: document.draft),
                contentType: .markdown,
                defaultFilename: document.fileURL?.lastPathComponent ?? "未命名.md"
            ) { result in
                switch result {
                case .success(let url):
                    document.markExported(to: url)
                case .failure(let error):
                    document.errorMessage = error.localizedDescription
                }
            }
            .sheet(isPresented: $isSettingsPresented) {
                NavigationStack {
                    Form {
                        Picker("外观", selection: $appearanceModeRawValue) {
                            ForEach(AppearanceMode.allCases) { mode in
                                Text(mode.title).tag(mode.rawValue)
                            }
                        }
                    }
                    .navigationTitle("设置")
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .topBarTrailing) {
                            Button("完成") {
                                isSettingsPresented = false
                            }
                        }
                    }
                }
                .presentationDetents([.medium])
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
        }
        .preferredColorScheme(appearanceMode.colorScheme)
    }

    private var emptyState: some View {
        VStack {
            Button("打开 Markdown 文件") {
                isImporterPresented = true
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var editor: some View {
        TextEditor(text: $document.draft)
            .font(.system(size: 14, design: .monospaced))
            .padding(.horizontal, 14)
            .scrollContentBackground(.hidden)
            .background(Color(.systemBackground))
    }
}
