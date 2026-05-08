import SwiftUI

struct AddItemSheet: View {
    @ObservedObject var store: ItemStore
    @Environment(\.dismiss) private var dismiss
    @State private var title: String = ""

    private var trimmed: String {
        title.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Title") {
                    TextField("e.g. Buy milk", text: $title)
                        .textInputAutocapitalization(.sentences)
                        .onSubmit(save)
                }
            }
            .navigationTitle("New Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save)
                        .disabled(trimmed.isEmpty)
                }
            }
        }
    }

    private func save() {
        guard store.add(title: title) != nil else { return }
        dismiss()
    }
}

#Preview {
    AddItemSheet(store: ItemStore())
}
