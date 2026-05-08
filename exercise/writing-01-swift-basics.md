# Topic 1 -- Swift Basics & Data Structures: Writing Drills

Hands-on counterpart to `exercises-01-swift-basics.md`. You write the code; the
solution block is for grading yourself afterwards. Pure Swift, no SwiftUI.
Tests use real `XCTest` APIs.

Six exercises, easy -> exam-level. Budget per exercise is in the heading.
Topic 1 has no UI, so wireframes are replaced with "given input -> expected
output, write the function" specs.

---

## Ex 1 -- Spec-to-function: `safeDivide` (~5 min)

Signature:

```swift
func safeDivide(_ a: Int, by b: Int) -> Int?
```

Behavior: return `a / b` (integer division) when `b != 0`. Return `nil`
when `b == 0`. No traps. No `try`. Just an Optional.

Input -> Output rows (write these into a quick mental table before coding):

| a   | b   | result        |
| --- | --- | ------------- |
| 10  | 2   | Optional(5)   |
| 7   | 3   | Optional(2)   |
| 0   | 4   | Optional(0)   |
| 9   | 0   | nil           |
| -8  | 2   | Optional(-4)  |

Write the function. Then write one client line that prints the result of
`safeDivide(9, by: 0)` falling back to the string `"undefined"`.

<details><summary>Solution</summary>

```swift
func safeDivide(_ a: Int, by b: Int) -> Int? {
    guard b != 0 else { return nil }
    return a / b
}

let shown = safeDivide(9, by: 0).map(String.init) ?? "undefined"
print(shown)   // undefined
```

Why: `guard` with the failure path first keeps the happy return flat.
`Optional.map` lifts the conversion to `String` only when there is a value;
`??` supplies the fallback for the `nil` case so the final type is plain
`String`.
</details>

---

## Ex 2 -- Refactor bad -> good: `Inventory` and `priceTag` (~10 min)

This compiles in places it should not, crashes in places it does, and uses
the wrong type kind in two places. List every smell, then rewrite the whole
snippet.

```swift
import Foundation

class Item {
    var name: String
    var qty: Int
    init(name: String, qty: Int) {
        self.name = name; self.qty = qty
    }
}

class Inventory {
    var items: [Item] = []
    func addStock(name: String, qty: Int) {
        items.append(Item(name: name, qty: qty))
    }
    func total() -> Int {
        var n = 0
        for i in items { n = n + i.qty }
        return n
    }
}

func priceTag(raw: String, taxRate: Any) -> String {
    let price = Int(raw)!
    let rate = taxRate as! Double
    let final = Double(price) * (1 + rate)
    return "THB " + String(Int(final))
}

var totals: [Int] = []
let inv = Inventory()
inv.addStock(name: "pen", qty: 10)
inv.addStock(name: "ink", qty: 5)
for x in [1, 2, 3] {
    let bump = { totals.append(x * 100) }
    bump()
}
print(priceTag(raw: "120", taxRate: 0.07))
print(inv.total())
```

<details><summary>Solution</summary>

Smells (six):

- `class Item` has no identity beyond its data -- it should be a `struct` so
  copies cannot accidentally alias.
- `Int(raw)!` force-unwraps user-shaped input; any non-digit string crashes.
- `taxRate as! Double` is a force-cast from `Any`; if the caller passes an
  `Int` (e.g. `7`), this traps. Take a typed parameter instead.
- Magic numbers: the literal `100` inside the loop and the tax math should
  be named, and `String(Int(final))` silently truncates the satang/cents.
- The closure captures the loop variable `x` by reference. In Swift this
  particular case happens to work because `for-in` rebinds `x` each
  iteration, but appending to the captured `var totals` from inside a
  closure-in-loop is exactly the pattern graders flag -- a plain `for-in`
  with no closure says the intent better.
- `Inventory.total()` is fine, but `total` is derivable from `items`, so it
  should be a computed property, not a method that walks state on call.

Rewritten:

```swift
import Foundation

struct Item {
    let name: String
    var qty: Int
}

struct Inventory {
    private(set) var items: [Item] = []

    var total: Int { items.reduce(0) { $0 + $1.qty } }

    mutating func addStock(name: String, qty: Int) {
        items.append(Item(name: name, qty: qty))
    }
}

enum PriceError: Error { case badNumber }

func priceTag(raw: String, taxRate: Double) throws -> String {
    guard let price = Double(raw) else { throw PriceError.badNumber }
    let final = price * (1 + taxRate)
    return String(format: "THB %.2f", final)
}

let bumpStep = 100
var totals: [Int] = []
for x in [1, 2, 3] {
    totals.append(x * bumpStep)
}

var inv = Inventory()
inv.addStock(name: "pen", qty: 10)
inv.addStock(name: "ink", qty: 5)

if let tag = try? priceTag(raw: "120", taxRate: 0.07) {
    print(tag)        // THB 128.40
}
print(inv.total)      // 15
```

Why: value types remove aliasing; `throws` replaces the force-unwrap with
an explicit error path; the typed `Double` parameter removes the force-cast;
`bumpStep` names the magic number; the loop drops the unnecessary closure;
and `total` is a computed property because it is a pure function of `items`.
</details>

---

## Ex 3 -- Mini-project: `Temperature` value type with `willSet`/`didSet` (~15 min)

Spec:

- A `struct Temperature` stores `celsius: Double`.
- A computed `fahrenheit: Double` returns `celsius * 9/5 + 32` for reads
  and, when set, writes back the inverse `(newValue - 32) * 5/9` into
  `celsius`.
- A stored `var lastDelta: Double = 0` tracks the last change to `celsius`
  using `didSet`. Specifically, after any write to `celsius`, `lastDelta`
  must equal `newValue - oldValue` (using the `oldValue` Swift exposes
  inside `didSet`).
- A `mutating func clampToFridge()` clamps `celsius` into the closed range
  `0...8`. After the clamp runs, `lastDelta` reflects the clamp's
  delta (because the clamp goes through the `celsius` setter).
- A static method `Temperature.average(_ xs: [Temperature]) -> Temperature?`
  returns `nil` for an empty array; otherwise the temperature whose
  `celsius` is the arithmetic mean.

Starter:

```swift
struct Temperature {
    var celsius: Double {
        didSet { /* TODO */ }
    }
    var lastDelta: Double = 0
    var fahrenheit: Double {
        get { 0 /* TODO */ }
        set { /* TODO */ }
    }

    init(celsius: Double) { self.celsius = celsius }

    mutating func clampToFridge() { /* TODO */ }

    static func average(_ xs: [Temperature]) -> Temperature? { nil /* TODO */ }
}
```

Failing tests (your code is "done" when these pass):

```swift
import XCTest
@testable import App

final class TemperatureTests: XCTestCase {
    func test_fahrenheit_get() {
        let t = Temperature(celsius: 100)
        XCTAssertEqual(t.fahrenheit, 212, accuracy: 1e-9)
    }

    func test_fahrenheit_set_writes_back_celsius() {
        var t = Temperature(celsius: 0)
        t.fahrenheit = 32
        XCTAssertEqual(t.celsius, 0, accuracy: 1e-9)
        t.fahrenheit = 212
        XCTAssertEqual(t.celsius, 100, accuracy: 1e-9)
    }

    func test_didSet_records_lastDelta() {
        var t = Temperature(celsius: 10)
        XCTAssertEqual(t.lastDelta, 0)
        t.celsius = 25
        XCTAssertEqual(t.lastDelta, 15, accuracy: 1e-9)
        t.celsius = 5
        XCTAssertEqual(t.lastDelta, -20, accuracy: 1e-9)
    }

    func test_clampToFridge_uses_setter() {
        var t = Temperature(celsius: 30)
        t.clampToFridge()
        XCTAssertEqual(t.celsius, 8, accuracy: 1e-9)
        XCTAssertEqual(t.lastDelta, -22, accuracy: 1e-9)

        var cold = Temperature(celsius: -5)
        cold.clampToFridge()
        XCTAssertEqual(cold.celsius, 0, accuracy: 1e-9)
        XCTAssertEqual(cold.lastDelta, 5, accuracy: 1e-9)
    }

    func test_average_empty_is_nil() {
        XCTAssertNil(Temperature.average([]))
    }

    func test_average_nonempty() {
        let avg = Temperature.average([
            Temperature(celsius: 0),
            Temperature(celsius: 10),
            Temperature(celsius: 20),
        ])
        XCTAssertEqual(avg?.celsius, 10, accuracy: 1e-9)
    }
}
```

<details><summary>Solution</summary>

```swift
struct Temperature {
    var celsius: Double {
        didSet { lastDelta = celsius - oldValue }
    }
    var lastDelta: Double = 0

    var fahrenheit: Double {
        get { celsius * 9 / 5 + 32 }
        set { celsius = (newValue - 32) * 5 / 9 }
    }

    init(celsius: Double) { self.celsius = celsius }

    mutating func clampToFridge() {
        celsius = min(8, max(0, celsius))
    }

    static func average(_ xs: [Temperature]) -> Temperature? {
        guard !xs.isEmpty else { return nil }
        let sum = xs.reduce(0.0) { $0 + $1.celsius }
        return Temperature(celsius: sum / Double(xs.count))
    }
}
```

Why: the `fahrenheit` setter routes through `celsius`, so `didSet` fires
once and records the right delta -- including for `clampToFridge`, which
also writes through the same setter. `oldValue` is implicitly bound inside
`didSet`. `average` rejects the empty case with `guard` instead of dividing
by zero.
</details>

---

## Ex 4 -- Spec-to-function: generic `firstNonNil` and `Result`-returning parser (~15 min)

Two functions in one exercise. Both ramp on Optionals and generics.

**Part A.** Signature:

```swift
func firstNonNil<T>(_ values: [T?]) -> T?
```

Return the first element that is not `nil`, or `nil` if every element is
`nil` (or the array is empty). Do not use `compactMap`; use `for-in` and
optional binding -- the point is the unwrap toolkit.

| values                            | result        |
| --------------------------------- | ------------- |
| `[nil, nil, "hi", "lo"]`          | Optional("hi")|
| `[Int?]([nil, nil, nil])`         | nil           |
| `[]` typed as `[String?]`         | nil           |
| `[Optional(7), nil, Optional(9)]` | Optional(7)   |

**Part B.** Signature:

```swift
enum ParseError: Error, Equatable {
    case empty
    case notANumber(String)
    case outOfRange(Int)
}

func parsePositive(_ raw: String, max: Int) -> Result<Int, ParseError>
```

Trim whitespace. If the result is empty, return `.failure(.empty)`. If it
does not parse as `Int`, return `.failure(.notANumber(trimmed))`. If it
parses but the value is `< 1` or `> max`, return
`.failure(.outOfRange(value))`. Otherwise `.success(value)`.

| raw          | max | result                          |
| ------------ | --- | ------------------------------- |
| `"   "`      | 10  | .failure(.empty)                |
| `"abc"`      | 10  | .failure(.notANumber("abc"))    |
| `"0"`        | 10  | .failure(.outOfRange(0))        |
| `"  7  "`    | 10  | .success(7)                     |
| `"99"`       | 10  | .failure(.outOfRange(99))       |

<details><summary>Solution</summary>

```swift
func firstNonNil<T>(_ values: [T?]) -> T? {
    for v in values {
        if let v = v { return v }
    }
    return nil
}

enum ParseError: Error, Equatable {
    case empty
    case notANumber(String)
    case outOfRange(Int)
}

func parsePositive(_ raw: String, max: Int) -> Result<Int, ParseError> {
    let trimmed = raw.trimmingCharacters(in: .whitespaces)
    guard !trimmed.isEmpty else { return .failure(.empty) }
    guard let n = Int(trimmed) else { return .failure(.notANumber(trimmed)) }
    guard (1...max).contains(n) else { return .failure(.outOfRange(n)) }
    return .success(n)
}
```

Why: `firstNonNil` is the spelled-out version of the optional-binding loop
graders look for; the generic parameter is constrained only by the `T?`
storage, so it works for any `T`. `parsePositive` uses a stack of guards so
each failure category produces a precise enum case -- easier to test and
easier to localize than a single boolean.
</details>

---

## Ex 5 -- Mini-project: `Library` Codable + nested types + lookup (~20 min)

Spec:

- A `Library` value type owns a list of `Book`. Both must be `Codable`,
  `Equatable`, and `Hashable` via synthesis (so all stored properties must
  be `Hashable`).
- `Book` has: `id: UUID`, `title: String`, `author: String`,
  `tags: Set<String>`, and `status: Status` where
  `enum Status: String, Codable { case available, lent, lost }`.
- `Library` exposes:
  - `add(_ book: Book)` -- appends.
  - `remove(id: UUID)` -- removes by id; no-op if missing.
  - `book(for id: UUID) -> Book?` -- O(n) lookup.
  - `count(taggedWith tag: String) -> Int` -- count of books containing
    `tag`.
  - `decode(from data: Data) throws -> Library` (static) and
    `func encode() throws -> Data` round-trip via `JSONEncoder` /
    `JSONDecoder`.
- Decoding garbage data must throw, not crash. Encoding must be lossless
  (decode-of-encode equals the original).

Starter:

```swift
import Foundation

enum Status: String, Codable { case available, lent, lost }

struct Book: Codable, Equatable, Hashable {
    let id: UUID
    var title: String
    var author: String
    var tags: Set<String>
    var status: Status
}

struct Library: Codable, Equatable, Hashable {
    private(set) var books: [Book] = []

    mutating func add(_ book: Book) { /* TODO */ }
    mutating func remove(id: UUID) { /* TODO */ }
    func book(for id: UUID) -> Book? { nil /* TODO */ }
    func count(taggedWith tag: String) -> Int { 0 /* TODO */ }

    static func decode(from data: Data) throws -> Library {
        throw NSError(domain: "TODO", code: 0)
    }
    func encode() throws -> Data {
        throw NSError(domain: "TODO", code: 0)
    }
}
```

Failing tests:

```swift
import XCTest
@testable import App

final class LibraryTests: XCTestCase {
    private func sample() -> Library {
        let a = Book(id: UUID(uuidString: "00000000-0000-0000-0000-000000000001")!,
                     title: "Swift", author: "AC", tags: ["lang", "ios"], status: .available)
        let b = Book(id: UUID(uuidString: "00000000-0000-0000-0000-000000000002")!,
                     title: "Networking", author: "BD", tags: ["ios"], status: .lent)
        var lib = Library()
        lib.add(a)
        lib.add(b)
        return lib
    }

    func test_add_appends() {
        var lib = Library()
        XCTAssertEqual(lib.books.count, 0)
        lib.add(Book(id: UUID(), title: "X", author: "Y", tags: [], status: .available))
        XCTAssertEqual(lib.books.count, 1)
    }

    func test_remove_by_id_is_noop_for_missing() {
        var lib = sample()
        lib.remove(id: UUID())
        XCTAssertEqual(lib.books.count, 2)
    }

    func test_remove_by_id_drops_match() {
        var lib = sample()
        let target = lib.books[0].id
        lib.remove(id: target)
        XCTAssertEqual(lib.books.count, 1)
        XCTAssertNil(lib.book(for: target))
    }

    func test_book_for_id_finds_match() {
        let lib = sample()
        let id = lib.books[1].id
        XCTAssertEqual(lib.book(for: id)?.title, "Networking")
    }

    func test_count_taggedWith() {
        let lib = sample()
        XCTAssertEqual(lib.count(taggedWith: "ios"), 2)
        XCTAssertEqual(lib.count(taggedWith: "lang"), 1)
        XCTAssertEqual(lib.count(taggedWith: "missing"), 0)
    }

    func test_codable_round_trip() throws {
        let lib = sample()
        let data = try lib.encode()
        let back = try Library.decode(from: data)
        XCTAssertEqual(lib, back)
    }

    func test_decode_garbage_throws() {
        let bad = Data("not json".utf8)
        XCTAssertThrowsError(try Library.decode(from: bad))
    }

    func test_hashable_synthesis() {
        let s: Set<Library> = [sample(), sample()]
        XCTAssertEqual(s.count, 1)
    }
}
```

<details><summary>Solution</summary>

```swift
import Foundation

enum Status: String, Codable { case available, lent, lost }

struct Book: Codable, Equatable, Hashable {
    let id: UUID
    var title: String
    var author: String
    var tags: Set<String>
    var status: Status
}

struct Library: Codable, Equatable, Hashable {
    private(set) var books: [Book] = []

    mutating func add(_ book: Book) {
        books.append(book)
    }

    mutating func remove(id: UUID) {
        books.removeAll { $0.id == id }
    }

    func book(for id: UUID) -> Book? {
        books.first { $0.id == id }
    }

    func count(taggedWith tag: String) -> Int {
        books.reduce(0) { $0 + ($1.tags.contains(tag) ? 1 : 0) }
    }

    static func decode(from data: Data) throws -> Library {
        try JSONDecoder().decode(Library.self, from: data)
    }

    func encode() throws -> Data {
        try JSONEncoder().encode(self)
    }
}
```

Why: every stored property is already `Hashable`/`Codable`/`Equatable`, so
the compiler synthesizes all three conformances for `Book` and `Library`.
`removeAll(where:)` and `first(where:)` are the idiomatic id-based ops.
`JSONDecoder.decode` already throws for malformed input -- no extra work
needed for the `throws` test, just propagate.
</details>

---

## Ex 6 -- Mini-project: `Deck` of cards with shuffle, draw, error throwing (~30 min)

Exam-level. Multiple types collaborating, one enum with associated values,
one error type, copy-on-write semantics tested directly.

Spec:

- `enum Suit: String, CaseIterable, Codable { case clubs, diamonds, hearts, spades }`.
- `enum Rank: Int, CaseIterable, Codable { case two = 2, three, four, five,
  six, seven, eight, nine, ten, jack, queen, king, ace }`.
- `struct Card: Hashable, Codable { let rank: Rank; let suit: Suit }`.
- `enum DeckEvent { case drew(Card); case reshuffled; case empty }`.
- `enum DeckError: Error, Equatable { case outOfCards; case alreadyHas(Card) }`.
- `struct Deck`:
  - Stores `private(set) var cards: [Card]` -- top of deck is the LAST
    element (so `removeLast` is the draw).
  - `init(seed: UInt64? = nil)` builds a full 52-card deck in canonical
    order (clubs 2..ace, diamonds 2..ace, hearts 2..ace, spades 2..ace).
    If `seed` is non-nil, shuffle deterministically using a seeded RNG
    (use `SystemRandomNumberGenerator` if seed is nil; otherwise use the
    RNG provided in the solution -- tests pass a seed and expect the
    same card to come off the top).
  - `mutating func draw() throws -> Card` -- removes and returns the top
    card; throws `.outOfCards` when the deck is empty.
  - `mutating func putBack(_ card: Card) throws` -- inserts at the top
    (i.e. appends). Throws `.alreadyHas(card)` if `cards.contains(card)`.
  - `var isEmpty: Bool` -- computed.
  - `mutating func drawMany(_ n: Int) -> [DeckEvent]` -- draws up to `n`
    cards, returning `.drew(c)` for each successful draw and a single
    `.empty` when it runs out before `n`. Never throws.
- Copy-on-write must work: assigning a `Deck` to another `var`, drawing
  from one, must not affect the other.

Starter (uses a tiny seedable RNG so tests are deterministic):

```swift
import Foundation

enum Suit: String, CaseIterable, Codable { case clubs, diamonds, hearts, spades }
enum Rank: Int, CaseIterable, Codable {
    case two = 2, three, four, five, six, seven, eight, nine, ten, jack, queen, king, ace
}

struct Card: Hashable, Codable {
    let rank: Rank
    let suit: Suit
}

enum DeckEvent: Equatable { case drew(Card); case reshuffled; case empty }
enum DeckError: Error, Equatable { case outOfCards; case alreadyHas(Card) }

// Tiny seeded RNG for tests.
struct SeededRNG: RandomNumberGenerator {
    private var state: UInt64
    init(seed: UInt64) { self.state = seed == 0 ? 0xdead_beef : seed }
    mutating func next() -> UInt64 {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        return state
    }
}

struct Deck {
    private(set) var cards: [Card] = []

    init(seed: UInt64? = nil) {
        // TODO: build canonical 52-card deck. If seed != nil, shuffle with SeededRNG(seed:).
    }

    var isEmpty: Bool { cards.isEmpty /* TODO if you want to verify */ }

    mutating func draw() throws -> Card { throw DeckError.outOfCards /* TODO */ }
    mutating func putBack(_ card: Card) throws { /* TODO */ }
    mutating func drawMany(_ n: Int) -> [DeckEvent] { [] /* TODO */ }
}
```

Failing tests:

```swift
import XCTest
@testable import App

final class DeckTests: XCTestCase {
    func test_fresh_deck_has_52_cards() {
        let d = Deck()
        XCTAssertEqual(d.cards.count, 52)
        XCTAssertFalse(d.isEmpty)
    }

    func test_canonical_order_top_is_ace_of_spades() throws {
        var d = Deck()
        let top = try d.draw()
        XCTAssertEqual(top, Card(rank: .ace, suit: .spades))
    }

    func test_draw_decreases_count_and_preserves_uniqueness() throws {
        var d = Deck()
        var seen: Set<Card> = []
        for _ in 0..<52 {
            let c = try d.draw()
            XCTAssertFalse(seen.contains(c))
            seen.insert(c)
        }
        XCTAssertTrue(d.isEmpty)
        XCTAssertEqual(seen.count, 52)
    }

    func test_draw_on_empty_throws() throws {
        var d = Deck()
        for _ in 0..<52 { _ = try d.draw() }
        XCTAssertThrowsError(try d.draw()) { err in
            XCTAssertEqual(err as? DeckError, .outOfCards)
        }
    }

    func test_putBack_rejects_duplicate() throws {
        var d = Deck()
        let c = try d.draw()
        try d.putBack(c)
        XCTAssertThrowsError(try d.putBack(c)) { err in
            XCTAssertEqual(err as? DeckError, .alreadyHas(c))
        }
    }

    func test_drawMany_short_circuits_with_empty_event() throws {
        var d = Deck()
        for _ in 0..<50 { _ = try d.draw() }
        let events = d.drawMany(5)
        // 2 drews + 1 .empty
        XCTAssertEqual(events.count, 3)
        XCTAssertEqual(events.last, .empty)
        let drew = events.filter { if case .drew = $0 { return true } else { return false } }
        XCTAssertEqual(drew.count, 2)
    }

    func test_value_semantics_copy_on_write() throws {
        var a = Deck()
        var b = a
        _ = try b.draw()
        XCTAssertEqual(a.cards.count, 52)
        XCTAssertEqual(b.cards.count, 51)
    }

    func test_seed_is_deterministic() throws {
        var d1 = Deck(seed: 42)
        var d2 = Deck(seed: 42)
        let top1 = try d1.draw()
        let top2 = try d2.draw()
        XCTAssertEqual(top1, top2)
    }

    func test_seed_shuffles_off_canonical() throws {
        var canonical = Deck()
        var shuffled = Deck(seed: 42)
        // It is astronomically unlikely the seeded shuffle leaves ace of spades on top.
        let topC = try canonical.draw()
        let topS = try shuffled.draw()
        XCTAssertEqual(topC, Card(rank: .ace, suit: .spades))
        XCTAssertNotEqual(topS, topC)
    }
}
```

<details><summary>Solution</summary>

```swift
import Foundation

enum Suit: String, CaseIterable, Codable { case clubs, diamonds, hearts, spades }
enum Rank: Int, CaseIterable, Codable {
    case two = 2, three, four, five, six, seven, eight, nine, ten, jack, queen, king, ace
}

struct Card: Hashable, Codable {
    let rank: Rank
    let suit: Suit
}

enum DeckEvent: Equatable { case drew(Card); case reshuffled; case empty }
enum DeckError: Error, Equatable { case outOfCards; case alreadyHas(Card) }

struct SeededRNG: RandomNumberGenerator {
    private var state: UInt64
    init(seed: UInt64) { self.state = seed == 0 ? 0xdead_beef : seed }
    mutating func next() -> UInt64 {
        state ^= state << 13
        state ^= state >> 7
        state ^= state << 17
        return state
    }
}

struct Deck {
    private(set) var cards: [Card] = []

    init(seed: UInt64? = nil) {
        var built: [Card] = []
        for suit in Suit.allCases {
            for rank in Rank.allCases {
                built.append(Card(rank: rank, suit: suit))
            }
        }
        if let seed = seed {
            var rng = SeededRNG(seed: seed)
            built.shuffle(using: &rng)
        }
        self.cards = built
    }

    var isEmpty: Bool { cards.isEmpty }

    mutating func draw() throws -> Card {
        guard let top = cards.last else { throw DeckError.outOfCards }
        cards.removeLast()
        return top
    }

    mutating func putBack(_ card: Card) throws {
        if cards.contains(card) { throw DeckError.alreadyHas(card) }
        cards.append(card)
    }

    mutating func drawMany(_ n: Int) -> [DeckEvent] {
        var out: [DeckEvent] = []
        for _ in 0..<max(0, n) {
            if let top = cards.last {
                cards.removeLast()
                out.append(.drew(top))
            } else {
                out.append(.empty)
                return out
            }
        }
        return out
    }
}
```

Why: the canonical build walks suits then ranks so the LAST card pushed is
`(ace, spades)` -- top of deck, so the first `draw()` returns it. The
seeded RNG path uses `Array.shuffle(using:)`, which the standard library
ships specifically to take a `RandomNumberGenerator`. `draw()` is the
throwing variant; `drawMany` is the non-throwing convenience that emits a
single `.empty` event when supply runs out, mirroring the spec's "no
exception, just an event". `Deck` is a `struct`, so the
copy-on-write test passes for free -- assigning `a` to `b` and mutating
`b` does not touch `a` because `Array` itself is COW.
</details>
