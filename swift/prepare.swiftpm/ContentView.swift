import SwiftUI

struct ContentView: View {
    @StateObject private var store = ItemStore(items: [
        Item(title: "Read instruction.md"),
        Item(title: "Drill flashcards"),
        Item(title: "Practice SwiftUI navigation"),
    ])
    @State private var showingAdd = false
    @AppStorage("sortAscending") private var sortAscending: Bool = true

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.sorted(ascending: sortAscending)) { item in
                    NavigationLink(value: item.id) {
                        HStack {
                            Button {
                                store.toggle(item.id)
                            } label: {
                                Image(systemName: item.isDone ? "checkmark.circle.fill" : "circle")
                                    .foregroundStyle(item.isDone ? .green : .secondary)
                            }
                            .buttonStyle(.borderless)

                            Text(item.title)
                                .strikethrough(item.isDone)
                                .foregroundStyle(item.isDone ? .secondary : .primary)

                            Spacer()
                        }
                    }
                }
                .onDelete { offsets in
                    // Translate offsets in the *sorted* view back to store ids.
                    let visible = store.sorted(ascending: sortAscending)
                    for i in offsets { store.remove(visible[i].id) }
                }
            }
            .navigationTitle("Items")
            .navigationDestination(for: UUID.self) { id in
                ItemDetailView(itemID: id, store: store)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    NavigationLink { SettingsView() } label: {
                        Image(systemName: "gear")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAdd = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
                ToolbarItem(placement: .bottomBar) {
                    Text("\(store.remainingCount) remaining")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .sheet(isPresented: $showingAdd) {
                AddItemSheet(store: store)
            }
        }
    }
}

#Preview {
    ContentView()
}
