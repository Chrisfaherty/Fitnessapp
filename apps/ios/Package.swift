// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FitCoach",
    platforms: [.iOS(.v17)],
    dependencies: [
        .package(
            url: "https://github.com/supabase/supabase-swift.git",
            .upToNextMajor(from: "2.0.0")
        ),
    ],
    targets: [
        .target(
            name: "FitCoach",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            path: "FitCoach",
            resources: [
                .process("Resources"),
            ]
        ),
        .testTarget(
            name: "FitCoachTests",
            dependencies: ["FitCoach"],
            path: "FitCoachTests"
        ),
    ]
)
