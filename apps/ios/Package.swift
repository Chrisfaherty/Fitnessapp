// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "FitnessCoach",
    platforms: [.iOS(.v17)],
    dependencies: [
        .package(
            url: "https://github.com/supabase/supabase-swift.git",
            .upToNextMajor(from: "2.0.0")
        ),
    ],
    targets: [
        .target(
            name: "FitnessCoach",
            dependencies: [
                .product(name: "Supabase", package: "supabase-swift"),
            ],
            path: "FitnessCoach",
            resources: [
                .process("Resources"),
            ]
        ),
        .testTarget(
            name: "FitnessCoachTests",
            dependencies: ["FitnessCoach"],
            path: "FitnessCoachTests"
        ),
    ]
)
