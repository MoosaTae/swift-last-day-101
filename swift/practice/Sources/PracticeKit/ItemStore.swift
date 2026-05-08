import Foundation
import Observation

@Observable
public final class ItemStore {
    public private(set) var items: [Item]

    public init(items: [Item] = []) {
        self.items = items
    }

    @discardableResult
    public func add(title: String) -> Item? {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }
        let item = Item(title: trimmed)
        items.append(item)
        return item
    }

    public func toggle(_ id: Item.ID) {
        guard let idx = items.firstIndex(where: { $0.id == id }) else { return }
        items[idx].isDone.toggle()
    }

    public func remove(_ id: Item.ID) {
        items.removeAll { $0.id == id }
    }

    public func remove(atOffsets offsets: IndexSet) {
        for offset in offsets.sorted(by: >) {
            items.remove(at: offset)
        }
    }

    public func sorted(ascending: Bool) -> [Item] {
        items.sorted { lhs, rhs in
            ascending ? lhs.title < rhs.title : lhs.title > rhs.title
        }
    }

    public var remainingCount: Int {
        items.filter { !$0.isDone }.count
    }
}
