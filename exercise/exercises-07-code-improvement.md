# Topic 7 — Code Improvement: Practice

A drill pack for the closed-book Code Improvement section. Mocks routinely demand 2-4 distinct issues per snippet (1-1.5 pt each). For each card: enumerate every issue, explain WHY it is wrong, then rewrite. The compound cards (Q12-Q15) mirror the multi-bug mock format.

---

## Section A — Code Improvement

### Q1

```swift
func ageInTenYears(from text: String) -> Int {
    let n = Int(text)!
    return n + 10
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `Int(text)` returns `Int?`; `!` crashes on any non-numeric input.
- User-facing strings must never crash the app — use `guard let` or `??`.

```swift
func ageInTenYears(from text: String) -> Int {
    guard let n = Int(text) else { return 0 }
    return n + 10
}
// or:  let n = Int(text) ?? 0
```

Why: `Int(_:)` is a failable initializer, so replace `!` with `if let` / `guard let` / `??` to turn a bad string into a graceful default instead of a runtime crash.
</details>

### Q2

```swift
func describe(_ any: Any) -> String {
    let s = any as! String
    return "len=\(s.count)"
}

print(describe(42))
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `as!` crashes when the runtime type is not `String`.
- `describe(42)` passes an `Int`, so the program crashes — use `as?` and handle the failure path.

```swift
func describe(_ any: Any) -> String {
    if let s = any as? String {
        return "len=\(s.count)"
    }
    return "not a string"
}
```

Why: `as?` returns an `Optional` so the failure path is recoverable; `as!` is the reference-type counterpart to `Int("abc")!` — same red flag, same fix.
</details>

### Q3

```swift
class Coordinate {
    var x = 0
    var y = 0
}

let origin = Coordinate()
let a = origin
a.x = 99
print(origin.x)        // surprise mutation
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `Coordinate` is a tiny piece of data with no identity, but `class` makes assignment share the same instance.
- `let` on a class only freezes the reference, not the properties, so `a.x = 99` mutates `origin` too.
- Use a `struct` so assignment copies the value.

```swift
struct Coordinate {
    var x = 0
    var y = 0
}

var origin = Coordinate()
var a = origin
a.x = 99
print(origin.x)        // 0 — independent copy
```

Why: SwiftUI and the Swift idiom prefer value semantics for plain data; reach for `class` only when you actually need shared identity.
</details>

### Q4

```swift
struct Order {
    var status: String      // "pending", "paid", "shipped", "cancelled"
}

func badge(for o: Order) -> String {
    if o.status == "paid"      { return "green"  }
    if o.status == "shippped"  { return "blue"   }   // typo, silently wrong
    if o.status == "cancelled" { return "red"    }
    return "gray"
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- Comparing arbitrary strings makes typos compile (`"shippped"` vs `"shipped"`).
- The compiler cannot warn about a missing case, so misspellings silently return `"gray"`.
- Replace the string with an enum and a `switch`.

```swift
enum Status: String {
    case pending, paid, shipped, cancelled
}

struct Order {
    var status: Status
}

func badge(for o: Order) -> String {
    switch o.status {
    case .paid:      return "green"
    case .shipped:   return "blue"
    case .cancelled: return "red"
    case .pending:   return "gray"
    }
}
```

Why: an enum closes the set of valid values and `switch` forces every case to be handled, so misspellings stop compiling and new cases flag every site that needs an update.
</details>

### Q5

```swift
struct PrimeListView: View {
    @State private var limit = 50
    var body: some View {
        let primes = (2...10_000).filter { n in
            (2..<n).allSatisfy { n % $0 != 0 }
        }                                       // ~10k filter on every render
        List(primes.prefix(limit), id: \.self) { Text("\($0)") }
    }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `body` runs every time SwiftUI invalidates the view, so the 10,000-element prime sieve recomputes on every render.
- Move state-independent work out of `body` into a `static let` (or compute once in `.task` and store in `@State`).

```swift
struct PrimeListView: View {
    @State private var limit = 50
    private static let primes: [Int] = (2...10_000).filter { n in
        (2..<n).allSatisfy { n % $0 != 0 }
    }
    var body: some View {
        List(Self.primes.prefix(limit), id: \.self) { Text("\($0)") }
    }
}
```

Why: `body` must stay cheap because it is called frequently; the view's job is to describe UI, not to recompute heavy data on every render.
</details>

### Q6

```swift
import Observation

@Observable
final class CounterModel {
    var n = 0
}

struct CounterView: View {
    @ObservedObject var model = CounterModel()    // wrong wrapper too
    var body: some View {
        Button("\(model.n)") { model.n += 1 }
    }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `@ObservedObject` works only on `ObservableObject` classes; `@Observable` requires `@State` (or a stored `@Bindable` parameter).
- Initializing the model inline with `@ObservedObject` would re-create it on every parent re-render, losing state.

```swift
import Observation

@Observable
final class CounterModel {
    var n = 0
}

struct CounterView: View {
    @State private var model = CounterModel()
    var body: some View {
        Button("\(model.n)") { model.n += 1 }
    }
}
```

Why: with the iOS 17 Observation framework, the view owns an `@Observable` model via `@State`, which guarantees one instance per view identity that survives re-renders. Children that need to write into the model should receive it as `@Bindable var model: CounterModel`.
</details>

### Q7

```swift
struct GreetView: View {
    @State private var name = ""
    var body: some View {
        name = name.uppercased()                 // body mutates state
        return Text(name.isEmpty ? "?" : name)
    }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- Writing to `@State` from `body` schedules another render, which writes again, causing an infinite re-render loop (or runtime warning).
- `body` must be a pure function of state — derive the displayed value inline instead of storing it back.

```swift
struct GreetView: View {
    @State private var name = ""
    var body: some View {
        VStack {
            TextField("Name", text: $name)
            Text(name.isEmpty ? "?" : name.uppercased())   // derive, do not mutate
        }
    }
}
```

Why: the SwiftUI mental model is Action -> State -> Re-render, so side effects belong in event handlers or `.task`/`.onAppear`, not in `body`.
</details>

### Q8

```swift
@MainActor
final class PostsVM: ObservableObject {
    @Published var titles: [String] = []
    @Published var errorText: String?

    func load() async {
        guard let url = URL(string: "https://api.example.com/posts") else { return }
        let data = try? await URLSession.shared.data(from: url).0
        let posts = try? JSONDecoder().decode([Post].self, from: data ?? Data())
        titles = (posts ?? []).map(\.title)
    }
}

struct Post: Codable { let title: String }
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- Every failure (bad network, non-200, decode mismatch) collapses into `nil`, leaving the user with an empty list and no explanation.
- `errorText` is never set, and decoding `Data()` after a network failure runs a guaranteed-to-fail decode.
- Replace `try?` with `do/catch` and surface the error.

```swift
@MainActor
final class PostsVM: ObservableObject {
    @Published var titles: [String] = []
    @Published var errorText: String?

    func load() async {
        guard let url = URL(string: "https://api.example.com/posts") else {
            errorText = "Bad URL"
            return
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let posts = try JSONDecoder().decode([Post].self, from: data)
            titles = posts.map(\.title)
            errorText = nil
        } catch {
            errorText = error.localizedDescription
        }
    }
}

struct Post: Codable { let title: String }
```

Why: `try?` is appropriate only when you genuinely do not care which failure happened; for network calls, `do/catch` lets you tell the user *why* it failed.
</details>

### Q9

```swift
struct GuestList: View {
    let guests = ["Alex", "Sam", "Alex", "Jamie"]   // duplicates allowed
    var body: some View {
        List {
            ForEach(guests, id: \.self) { name in
                Text(name)
            }
        }
    }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `id: \.self` uses the string value as row identity, but `"Alex"` appears twice.
- SwiftUI sees two rows with the same ID, prints a runtime warning, and diffs unpredictably on insert/delete.
- Wrap the data in an `Identifiable` struct with a `UUID`.

```swift
struct Guest: Identifiable {
    let id = UUID()
    let name: String
}

struct GuestList: View {
    let guests = [
        Guest(name: "Alex"),
        Guest(name: "Sam"),
        Guest(name: "Alex"),
        Guest(name: "Jamie"),
    ]
    var body: some View {
        List(guests) { g in
            Text(g.name)
        }
    }
}
```

Why: `ForEach`/`List` need stable, unique IDs to diff rows correctly, and `id: \.self` works only when values are guaranteed unique.
</details>

### Q10

```swift
final class WeatherVM: ObservableObject {
    @Published var temperature: String = "--"

    func reload() {
        guard let url = URL(string: "https://api.example.com/temp") else { return }
        URLSession.shared.dataTask(with: url) { data, _, _ in
            if let data, let t = String(data: data, encoding: .utf8) {
                self.temperature = t            // background-thread UI update
            }
        }.resume()
    }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `dataTask` invokes its completion handler on a background queue, so writing to a `@Published` property off the main actor warns at runtime.
- The `dataTask` completion-handler API has been superseded by `async/await`.
- Mark the class `@MainActor` and use `URLSession.shared.data(from:)`.

```swift
@MainActor
final class WeatherVM: ObservableObject {
    @Published var temperature: String = "--"

    func reload() async {
        guard let url = URL(string: "https://api.example.com/temp") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            temperature = String(data: data, encoding: .utf8) ?? "--"
        } catch {
            temperature = "--"
        }
    }
}
```

Why: SwiftUI requires `@Published` mutations on the main actor; `@MainActor` plus `async` URLSession delivers the result on the main actor without any manual `DispatchQueue` hop.
</details>

### Q11

```swift
struct RootView: View {
    var body: some View {
        NavigationView {
            List(0..<5, id: \.self) { i in
                NavigationLink(destination: Text("Detail \(i)")) {
                    Text("Row \(i)")
                }
            }
            .navigationTitle("Items")
        }
    }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `NavigationView` is deprecated in iOS 16+ and has ambiguous push behavior on iPad/macOS.
- The modern container is `NavigationStack`, ideally with value-based navigation.

```swift
struct RootView: View {
    var body: some View {
        NavigationStack {
            List(0..<5, id: \.self) { i in
                NavigationLink("Row \(i)", value: i)
            }
            .navigationTitle("Items")
            .navigationDestination(for: Int.self) { i in
                Text("Detail \(i)")
            }
        }
    }
}
```

Why: `NavigationStack` plus `NavigationLink(_, value:)` and `.navigationDestination(for:)` separates *what to navigate to* from *how to render the destination*, unlocking deep linking and programmatic navigation.
</details>

### Q12 — Modifier-order trap (compound)

```swift
struct PillView: View {
    var body: some View {
        Text("Hi")
            .cornerRadius(12)
            .background(.blue)
            .frame(width: 200, height: 60)
            .padding()
    }
}
```

The visual result is wrong on every dimension. Enumerate the issues and fix.

<details><summary>Answer</summary>

Three independent issues:

1. **`.cornerRadius` runs before `.background`** — corner-rounding is applied to the un-coloured Text first, then `.background(.blue)` paints a fresh rectangle BEHIND it. Result: square blue corners.
2. **`.frame(width: 200, height: 60)` runs after `.background`** — the colored area is sized to the original Text, then a 200x60 transparent frame is drawn around it. Result: small blue pill floating inside a big invisible box.
3. **`.padding` runs last** — the padding wraps the already-framed view, adding outer space, but the colour does not extend into the padding.

The rule is **inside-out**: content -> sizing -> coloring -> rounding -> spacing.

```swift
struct PillView: View {
    var body: some View {
        Text("Hi")
            .frame(width: 200, height: 60)
            .background(.blue)
            .cornerRadius(12)
            .padding()
    }
}
```

Why: each SwiftUI modifier wraps the prior view in a new view, so visual order = nesting order. `.background` paints whatever is currently sized; `.cornerRadius` clips whatever is currently coloured. Mock 4 B2 anchor pattern.
</details>

### Q13 — Codable key/date mismatch (compound)

```swift
struct Post: Codable {
    let displayName: String
    let createdAt: Date
    let likeCount: Int
}

func loadPosts() async -> [Post] {
    let url = URL(string: "https://api.example.com/posts")!
    let (data, _) = try! await URLSession.shared.data(from: url)
    let posts = try! JSONDecoder().decode([Post].self, from: data)
    return posts
}

// Server returns:
// [{ "display_name": "Tae", "created_at": 1715225400, "like_count": 4 }]
```

Decoding always crashes. Enumerate the issues and fix.

<details><summary>Answer</summary>

Four independent issues:

1. **Key mismatch** — server uses snake_case (`display_name`, `created_at`, `like_count`) but the struct uses camelCase. Vanilla `JSONDecoder` does not bridge these. Either declare `CodingKeys` or set `decoder.keyDecodingStrategy = .convertFromSnakeCase`.
2. **Date strategy missing** — server sends Unix epoch seconds (a number), not an ISO8601 string. Default `dateDecodingStrategy` expects `Date.timeIntervalSinceReferenceDate` doubles, so decode fails. Set `decoder.dateDecodingStrategy = .secondsSince1970`.
3. **`try!` on the network call** — any I/O error (offline, DNS, timeout) crashes the app. Use `try` inside `do/catch` and propagate via `throws` or return optional.
4. **No HTTP status-code check** — even on success, a 4xx/5xx body might be HTML or an error JSON that decodes-and-throws. Guard `(response as? HTTPURLResponse)?.statusCode` is in `200..<300`.

```swift
struct Post: Codable {
    let displayName: String
    let createdAt: Date
    let likeCount: Int

    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case createdAt   = "created_at"
        case likeCount   = "like_count"
    }
}

func loadPosts() async throws -> [Post] {
    let url = URL(string: "https://api.example.com/posts")!
    let (data, response) = try await URLSession.shared.data(from: url)
    guard let http = response as? HTTPURLResponse,
          (200..<300).contains(http.statusCode) else {
        throw URLError(.badServerResponse)
    }

    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .secondsSince1970
    return try decoder.decode([Post].self, from: data)
}
```

Why: each issue maps to a separate mock-rubric line. Mock 5 B1+B2 anchor pattern.
</details>

### Q14 — Struct mutation / inout (compound)

```swift
struct CartItem {
    var price: Double
    var qty: Int
}

func applyDiscount(item: CartItem, amount: Double) {
    item.price -= amount        // does not compile
}

var line = CartItem(price: 100, qty: 1)
applyDiscount(item: line, amount: 10)
print(line.price)               // expecting 90
```

Enumerate the issues and fix.

<details><summary>Answer</summary>

Two independent issues:

1. **Cannot mutate a `let` parameter on a value type** — function parameters are `let` by default, and `CartItem` is a struct. The line `item.price -= amount` does not compile.
2. **Even with `var item = item` shadowing, the caller does not see the change** — structs are value types, so the function would mutate a local copy and the caller's `line.price` would still be `100`.

There are two correct fixes depending on intent:

**Variant 1 — `inout` (mutate caller's copy):**

```swift
func applyDiscount(item: inout CartItem, amount: Double) {
    item.price -= amount
}

var line = CartItem(price: 100, qty: 1)
applyDiscount(item: &line, amount: 10)
print(line.price)               // 90
```

**Variant 2 — return a new struct (functional style, often preferred):**

```swift
func applyDiscount(item: CartItem, amount: Double) -> CartItem {
    var copy = item
    copy.price -= amount
    return copy
}

var line = CartItem(price: 100, qty: 1)
line = applyDiscount(item: line, amount: 10)
print(line.price)               // 90
```

Why: contrast with classes — if `CartItem` were a class, the original code would compile and mutate `line` directly because both names share the same reference. Mock 1 B2 anchor pattern.
</details>

### Q15 — Sibling-shared VM (compound)

```swift
import Observation

@Observable
final class Counter {
    var n = 0
}

struct ChildA: View {
    @StateObject var counter = Counter()
    var body: some View { Button("A: \(counter.n)") { counter.n += 1 } }
}

struct ChildB: View {
    @StateObject var counter = Counter()
    var body: some View { Button("B: \(counter.n)") { counter.n += 1 } }
}

struct ParentView: View {
    var body: some View {
        VStack {
            ChildA()
            ChildB()
        }
    }
}
```

The two children should share one counter, but they don't. Enumerate the issues and fix.

<details><summary>Answer</summary>

Three independent issues:

1. **Each child owns its own VM** — `@StateObject var counter = Counter()` in `ChildA` and `ChildB` creates two separate instances. The siblings cannot share state because they don't share a model.
2. **`@StateObject` does not work with `@Observable`** — `@StateObject` is for `ObservableObject` conformers. With the iOS 17 Observation framework, the owner uses `@State` and receivers use `@Bindable` (or plain `let`).
3. **Ownership is in the wrong place** — to share state across siblings, the parent must own the model and pass it down.

```swift
@Observable
final class Counter {
    var n = 0
}

struct ChildA: View {
    @Bindable var counter: Counter
    var body: some View { Button("A: \(counter.n)") { counter.n += 1 } }
}

struct ChildB: View {
    @Bindable var counter: Counter
    var body: some View { Button("B: \(counter.n)") { counter.n += 1 } }
}

struct ParentView: View {
    @State private var counter = Counter()
    var body: some View {
        VStack {
            ChildA(counter: counter)
            ChildB(counter: counter)
        }
    }
}
```

Why: the iOS-17 stack is **owner uses `@State`, receiver uses `@Bindable`**. Both children now reference the same `Counter` instance held by the parent, so incrementing in either updates both labels. Mock 4 B3 anchor pattern.
</details>
