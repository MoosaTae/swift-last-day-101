import Foundation
import Combine

// Legacy ObservableObject form so this app compiles on iOS 16
// (Package.swift is auto-generated and locked at iOS 16). The cheat sheet
// covers both forms — `@Observable` is the iOS 17 modern equivalent.
final class ItemStore: ObservableObject {
    @Published var items: [Item] = []

    init(items: [Item] = []) {
        self.items = items
    }

    /// Trims whitespace, rejects blank input, returns the inserted Item or nil.
    @discardableResult
    func add(title: String) -> Item? {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let item = Item(title: trimmed)
        items.append(item)
        return item
    }

    func toggle(_ id: UUID) {
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        items[i].isDone.toggle()
    }

    func remove(_ id: UUID) {
        items.removeAll { $0.id == id }
    }

    func remove(atOffsets offsets: IndexSet) {
        items.remove(atOffsets: offsets)
    }

    func sorted(ascending: Bool) -> [Item] {
        items.sorted { lhs, rhs in
            ascending
                ? lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
                : lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedDescending
        }
    }

    var remainingCount: Int {
        items.lazy.filter { !$0.isDone }.count
    }
}
