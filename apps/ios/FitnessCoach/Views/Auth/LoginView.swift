import SwiftUI

struct LoginView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false

    var body: some View {
        ZStack {
            Color.appBackgroundFallback.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 80)

                    // Logo
                    VStack(spacing: 12) {
                        ZStack {
                            RoundedRectangle(cornerRadius: 20)
                                .fill(Color.accent)
                                .frame(width: 72, height: 72)
                            Image(systemName: "bolt.heart.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.accentFG)
                        }
                        Text("FitnessCoach")
                            .font(.largeTitle).bold()
                            .foregroundColor(.appTextFallback)
                        Text("Your all-in-one coaching platform")
                            .font(.subheadline)
                            .foregroundColor(.appTextSecondaryFallback)
                    }
                    .padding(.bottom, 48)

                    // Form card
                    VStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("EMAIL").font(.caption).fontWeight(.semibold)
                                .foregroundColor(.appTextSecondaryFallback)
                                .tracking(1)
                            TextField("you@example.com", text: $email)
                                .textFieldStyle(.plain)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .padding()
                                .background(Color.appSurfaceFallback)
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.appBorderFallback, lineWidth: 1))
                        }

                        VStack(alignment: .leading, spacing: 6) {
                            Text("PASSWORD").font(.caption).fontWeight(.semibold)
                                .foregroundColor(.appTextSecondaryFallback)
                                .tracking(1)
                            SecureField("••••••••", text: $password)
                                .textFieldStyle(.plain)
                                .padding()
                                .background(Color.appSurfaceFallback)
                                .cornerRadius(12)
                                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.appBorderFallback, lineWidth: 1))
                        }

                        if let err = authVM.errorMessage {
                            HStack(spacing: 6) {
                                Image(systemName: "exclamationmark.circle.fill")
                                    .foregroundColor(.systemDanger)
                                Text(err)
                                    .font(.footnote)
                                    .foregroundColor(.systemDanger)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button {
                            Task { await signIn() }
                        } label: {
                            Group {
                                if isLoading {
                                    ProgressView().tint(.accentFG)
                                } else {
                                    Text("Sign In")
                                        .fontWeight(.semibold)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color.accent)
                            .foregroundColor(.accentFG)
                            .cornerRadius(14)
                        }
                        .disabled(isLoading || email.isEmpty || password.isEmpty)
                        .opacity(isLoading || email.isEmpty || password.isEmpty ? 0.6 : 1)
                    }
                    .padding(24)
                    .background(Color.appSurfaceFallback)
                    .cornerRadius(20)
                    .padding(.horizontal, 24)

                    Spacer()
                }
            }
        }
    }

    private func signIn() async {
        isLoading = true
        await authVM.signIn(email: email, password: password)
        isLoading = false
    }
}

#Preview {
    LoginView().environmentObject(AuthViewModel())
}
