// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "PracticeKit",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "PracticeKit", targets: ["PracticeKit"])
    ],
    targets: [
        .target(name: "PracticeKit"),
        .testTarget(name: "PracticeKitTests", dependencies: ["PracticeKit"])
    ],
    swiftLanguageModes: [.v6]
)
