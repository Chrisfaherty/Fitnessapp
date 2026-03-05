import SwiftUI

struct ExerciseDetailView: View {
    let exercise: Exercise

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {

                // Muscle map
                MuscleMapView(
                    primaryMuscles: exercise.primaryMuscles,
                    secondaryMuscles: exercise.secondaryMuscles
                )
                .frame(height: 280)
                .background(Color.appSurfaceFallback)
                .cornerRadius(16)

                // Muscle chips
                VStack(alignment: .leading, spacing: 8) {
                    Text("MUSCLES").font(.caption).fontWeight(.semibold)
                        .foregroundColor(.appTextSecondaryFallback).tracking(1)
                    FlowLayout(spacing: 6) {
                        ForEach(exercise.primaryMuscles, id: \.self) { m in
                            MuscleChip(name: m, isPrimary: true)
                        }
                        ForEach(exercise.secondaryMuscles, id: \.self) { m in
                            MuscleChip(name: m, isPrimary: false)
                        }
                    }
                }

                // Metadata
                HStack(spacing: 16) {
                    MetaBadge(icon: "chart.bar.fill", label: exercise.level.capitalized)
                    if let eq = exercise.equipment {
                        MetaBadge(icon: "dumbbell.fill", label: eq.capitalized)
                    }
                    if let mech = exercise.mechanic {
                        MetaBadge(icon: "arrow.triangle.2.circlepath", label: mech.capitalized)
                    }
                }

                // Instructions
                VStack(alignment: .leading, spacing: 12) {
                    Text("INSTRUCTIONS").font(.caption).fontWeight(.semibold)
                        .foregroundColor(.appTextSecondaryFallback).tracking(1)

                    ForEach(Array(exercise.instructions.enumerated()), id: \.offset) { idx, step in
                        HStack(alignment: .top, spacing: 12) {
                            Text("\(idx + 1)")
                                .font(.caption).fontWeight(.bold)
                                .foregroundColor(.accentFG)
                                .frame(width: 22, height: 22)
                                .background(Color.accent)
                                .clipShape(Circle())
                            Text(step)
                                .font(.body)
                                .foregroundColor(.appTextFallback)
                        }
                    }
                }
            }
            .padding()
        }
        .background(Color.appBackgroundFallback.ignoresSafeArea())
        .navigationTitle(exercise.name)
        .navigationBarTitleDisplayMode(.large)
    }
}

struct MuscleChip: View {
    let name: String
    let isPrimary: Bool

    var body: some View {
        Text(name.capitalized)
            .font(.caption).fontWeight(.medium)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(isPrimary ? Color.accent.opacity(0.2) : Color.appBorderFallback)
            .foregroundColor(isPrimary ? .accent : .appTextSecondaryFallback)
            .cornerRadius(20)
    }
}

struct MetaBadge: View {
    let icon: String
    let label: String

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.caption2).foregroundColor(.accent)
            Text(label).font(.caption).foregroundColor(.appTextSecondaryFallback)
        }
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Color.appSurfaceFallback)
        .cornerRadius(8)
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.appBorderFallback, lineWidth: 1))
    }
}

// Simple flow layout for chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) -> CGSize {
        let width = proposal.width ?? 300
        var height: CGFloat = 0
        var x: CGFloat = 0
        var rowH: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > width { x = 0; height += rowH + spacing; rowH = 0 }
            x += size.width + spacing
            rowH = max(rowH, size.height)
        }
        height += rowH
        return CGSize(width: width, height: height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout Void) {
        var x = bounds.minX
        var y = bounds.minY
        var rowH: CGFloat = 0
        for sub in subviews {
            let size = sub.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX { x = bounds.minX; y += rowH + spacing; rowH = 0 }
            sub.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowH = max(rowH, size.height)
        }
    }
}
