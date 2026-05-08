import SwiftUI

struct ItemDetailView: View {
    let itemID: UUID
    @ObservedObject var store: ItemStore

    /// Two-way Binding into the store's item, looked up by id on each access.
    /// Demonstrates the "find by id, mutate in place" pattern.
    private var itemBinding: Binding<Item>? {
        guard let index = store.items.firstIndex(where: { $0.id == itemID }) else {
            return nil
        }
        return Binding(
            get: { store.items[index] },
            set: { store.items[index] = $0 }
        )
    }

    var body: some View {
        Group {
            if let binding = itemBinding {
                Form {
                    Section("Title") {
                        TextField("Title", text: binding.title)
                    }
                    Section {
                        Toggle("Done", isOn: binding.isDone)
                    }
                    Section {
                        Text("ID: \(binding.wrappedValue.id.uuidString)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .navigationTitle(binding.wrappedValue.title)
                .navigationBarTitleDisplayMode(.inline)
            } else {
                ContentUnavailableViewCompat(title: "Item not found")
            }
        }
    }
}

/// Small fallback so we don't need iOS 17's ContentUnavailableView.
private struct ContentUnavailableViewCompat: View {
    let title: String
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "questionmark.folder")
                .font(.largeTitle)
                .foregroundStyle(.secondary)
            Text(title).font(.headline)
        }
        .padding()
    }
}
