import SwiftUI

struct SettingsView: View {
    @AppStorage("username") private var username: String = ""
    @AppStorage("sortAscending") private var sortAscending: Bool = true

    var body: some View {
        Form {
            Section("Profile") {
                TextField("Username", text: $username)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                if !username.isEmpty {
                    Text("Hello, \(username)!")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            Section("List") {
                Toggle("Sort A -> Z", isOn: $sortAscending)
            }
            Section("Networking demo") {
                NavigationLink("Remote posts") { RemoteFetchView() }
            }
            Section {
                Button(role: .destructive) {
                    username = ""
                    sortAscending = true
                } label: {
                    Text("Reset")
                }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack { SettingsView() }
}
