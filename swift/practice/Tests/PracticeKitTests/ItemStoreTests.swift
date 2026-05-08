import XCTest
@testable import PracticeKit

final class ItemStoreTests: XCTestCase {
    func test_init_isEmptyByDefault() {
        let store = ItemStore()
        XCTAssertTrue(store.items.isEmpty)
        XCTAssertEqual(store.remainingCount, 0)
    }

    func test_add_appendsItemWithUniqueID() {
        let store = ItemStore()
        let a = store.add(title: "buy milk")
        let b = store.add(title: "walk dog")
        XCTAssertEqual(store.items.count, 2)
        XCTAssertNotEqual(a?.id, b?.id)
        XCTAssertEqual(store.items.map(\.title), ["buy milk", "walk dog"])
    }

    func test_add_rejectsBlankTitle() {
        let store = ItemStore()
        XCTAssertNil(store.add(title: "   "))
        XCTAssertNil(store.add(title: ""))
        XCTAssertTrue(store.items.isEmpty)
    }

    func test_add_trimsWhitespace() {
        let store = ItemStore()
        let item = store.add(title: "  hello  ")
        XCTAssertEqual(item?.title, "hello")
    }

    func test_toggle_flipsIsDone() {
        let store = ItemStore()
        let a = store.add(title: "task")!
        XCTAssertFalse(store.items[0].isDone)
        store.toggle(a.id)
        XCTAssertTrue(store.items[0].isDone)
        store.toggle(a.id)
        XCTAssertFalse(store.items[0].isDone)
    }

    func test_toggle_unknownIDIsNoOp() {
        let store = ItemStore()
        store.add(title: "task")
        let snapshot = store.items
        store.toggle(UUID())
        XCTAssertEqual(store.items, snapshot)
    }

    func test_remove_byID() {
        let store = ItemStore()
        let a = store.add(title: "a")!
        store.add(title: "b")
        store.remove(a.id)
        XCTAssertEqual(store.items.map(\.title), ["b"])
    }

    func test_remainingCount_excludesDone() {
        let store = ItemStore()
        let a = store.add(title: "a")!
        store.add(title: "b")
        store.toggle(a.id)
        XCTAssertEqual(store.remainingCount, 1)
    }

    func test_sorted_respectsAscendingFlag() {
        let store = ItemStore()
        store.add(title: "charlie")
        store.add(title: "alpha")
        store.add(title: "bravo")
        XCTAssertEqual(store.sorted(ascending: true).map(\.title),
                       ["alpha", "bravo", "charlie"])
        XCTAssertEqual(store.sorted(ascending: false).map(\.title),
                       ["charlie", "bravo", "alpha"])
    }

    func test_codable_roundTrip() throws {
        let original = Item(title: "ship app", isDone: true)
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(Item.self, from: data)
        XCTAssertEqual(decoded, original)
    }
}
