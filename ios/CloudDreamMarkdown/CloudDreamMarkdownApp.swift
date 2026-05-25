import SwiftUI

@main
struct CloudDreamMarkdownApp: App {
    @AppStorage("appearanceMode") private var appearanceModeRawValue = AppearanceMode.system.rawValue
    @State private var document = MarkdownDocument()

    private var appearanceMode: AppearanceMode {
        AppearanceMode(rawValue: appearanceModeRawValue) ?? .system
    }

    var body: some Scene {
        WindowGroup {
            ContentView(document: document, appearanceModeRawValue: $appearanceModeRawValue)
                .preferredColorScheme(appearanceMode.colorScheme)
        }
    }
}
