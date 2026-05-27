import SwiftUI
import UniformTypeIdentifiers

struct ContentView: View {
    @Bindable var document: MarkdownDocument
    @Binding var appearanceModeRawValue: String
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var isImporterPresented = false
    @State private var isExporterPresented = false
    @State private var isSettingsPresented = false

    private var appearanceMode: AppearanceMode {
        get { AppearanceMode(rawValue: appearanceModeRawValue) ?? .system }
        nonmutating set { appearanceModeRawValue = newValue.rawValue }
    }

    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                topBar

                if document.hasDocument && !document.isEditing {
                    searchField
                        .padding(.horizontal, horizontalPadding)
                        .padding(.top, 10)
                }

                content
            }
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

    @ViewBuilder
    private var content: some View {
        if document.isEditing {
            editor
        } else if document.hasDocument {
            MarkdownPreview(
                markdown: document.content,
                searchText: document.searchText,
                colorScheme: colorScheme
            )
            .padding(.top, 6)
        } else {
            emptyState
        }
    }

    private var topBar: some View {
        HStack(spacing: 12) {
            Text(document.hasDocument ? document.title : "云梦 Markdown")
                .font(.system(size: 22, weight: .semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.76)

            Spacer(minLength: 12)

            if document.isEditing {
                Button {
                    document.save()
                } label: {
                    Text("保存")
                        .font(.system(size: 15, weight: .semibold))
                }
                .buttonStyle(.borderedProminent)
                .disabled(!document.canSave)

                Button {
                    isExporterPresented = true
                } label: {
                    Image(systemName: "square.and.arrow.down")
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("另存")

                Button("完成") {
                    document.toggleEditing()
                }
                .font(.system(size: 15, weight: .semibold))
            } else if document.hasDocument {
                Button {
                    document.toggleEditing()
                } label: {
                    Image(systemName: "pencil")
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("编辑")

                Button {
                    isImporterPresented = true
                } label: {
                    Image(systemName: "folder")
                }
                .buttonStyle(.bordered)
                .accessibilityLabel("打开")

                settingsButton
            } else {
                settingsButton
            }
        }
        .padding(.horizontal, horizontalPadding)
        .padding(.top, 12)
        .padding(.bottom, 8)
    }

    private var settingsButton: some View {
        Button {
            isSettingsPresented = true
        } label: {
            Image(systemName: "gearshape")
        }
        .buttonStyle(.bordered)
        .accessibilityLabel("设置")
    }

    private var searchField: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.secondary)

            TextField("搜索当前文档", text: $document.searchText)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .submitLabel(.search)

            if !document.searchText.isEmpty {
                Button {
                    document.searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .accessibilityLabel("清空搜索")
            }
        }
        .font(.system(size: 16))
        .padding(.horizontal, 14)
        .frame(height: 44)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var emptyState: some View {
        VStack(spacing: 22) {
            Spacer()

            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 56, weight: .regular))
                .foregroundStyle(.blue)
                .symbolRenderingMode(.hierarchical)

            VStack(spacing: 8) {
                Text("打开 Markdown 文件")
                    .font(.system(size: 26, weight: .semibold))

                Text("阅读、搜索和轻量编辑都在这里完成")
                    .font(.system(size: 16))
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button {
                isImporterPresented = true
            } label: {
                Label("选择文件", systemImage: "folder")
                    .font(.system(size: 17, weight: .semibold))
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

            Spacer()
            Spacer()
        }
        .padding(.horizontal, 28)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var editor: some View {
        TextEditor(text: $document.draft)
            .font(.system(size: 14, design: .monospaced))
            .padding(.horizontal, horizontalPadding - 6)
            .padding(.top, 6)
            .scrollContentBackground(.hidden)
            .background(Color(.systemBackground))
    }

    private var horizontalPadding: CGFloat {
        horizontalSizeClass == .regular ? 34 : 20
    }
}
