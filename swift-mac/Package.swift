// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CloudDreamMarkdownMac",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "CloudDreamMarkdownMac", targets: ["CloudDreamMarkdownMac"])
    ],
    targets: [
        .executableTarget(
            name: "CloudDreamMarkdownMac",
            resources: [
                .process("Resources")
            ]
        )
    ]
)
