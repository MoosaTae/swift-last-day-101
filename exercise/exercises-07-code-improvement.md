# Topic 7 — Code Improvement: Practice

A drill pack of 15 small Swift snippets for the closed-book Code Improvement section. Name the failure mode in one short phrase, rewrite the snippet to be safe and idiomatic, and justify the fix in one sentence.

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
struct Cart {
    var items = []          // what type is this?
    mutating func add(_ name: String, price: Double) {
        items.append((name, price))
    }
    func total() -> Double {
        items.reduce(0) { $0 + $1.1 }   // compiler complains
    }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `var items = []` infers `[Any]`, which disables most operations on the elements.
- `$1.1` has no known tuple shape on `Any`, so subscripting fails to compile.
- Promote the implicit tuple to a named struct so each field is documented.

```swift
struct LineItem {
    let name: String
    let price: Double
}

struct Cart {
    var items: [LineItem] = []
    mutating func add(_ name: String, price: Double) {
        items.append(LineItem(name: name, price: price))
    }
    func total() -> Double {
        items.reduce(0) { $0 + $1.price }
    }
}
```

Why: leaving the element type to inference produces `[Any]`, which is almost never what you want; annotate the array or use a named struct so the meaning of each field is explicit.
</details>

### Q4

```swift
func tax(on amount: Double) -> Double {
    var rate = 0.07
    var result = amount * rate
    return result
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `rate` and `result` are assigned exactly once, so `var` misleads the reader.
- `var` also prevents the compiler from treating these bindings as constants.

```swift
func tax(on amount: Double) -> Double {
    let rate = 0.07
    let result = amount * rate
    return result
}
```

Why: `let` documents immutability and lets the compiler optimize; reach for `var` only when something is genuinely reassigned.
</details>

### Q5

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

### Q6

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

### Q7

```swift
final class FeedLoader {
    var items: [String] = []
    func reload() {
        Task {
            let next = await fetch()
            self.items = next
            self.didFinish()
        }
    }
    func fetch() async -> [String] { [] }
    func didFinish() { }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- The `Task { ... }` closure captures `self` strongly, keeping the `FeedLoader` alive while the task runs.
- For long-running or repeating closures stored on `self` this creates a retain cycle.
- Add `[weak self]` plus a `guard let self`.

```swift
final class FeedLoader {
    var items: [String] = []
    func reload() {
        Task { [weak self] in
            guard let self else { return }
            let next = await self.fetch()
            self.items = next
            self.didFinish()
        }
    }
    func fetch() async -> [String] { [] }
    func didFinish() { }
}
```

Why: closures inside reference types capture `self` strongly; `[weak self]` breaks the cycle and `guard let self` re-binds it for the body without sprinkling `?.` everywhere.
</details>

### Q8

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

### Q9

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
- Initializing the model inline with `@ObservedObject` would re-create it on every parent re-render.

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

Why: with the iOS 17 Observation framework, the view owns an `@Observable` model via `@State`, which guarantees one instance per view identity that survives re-renders.
</details>

### Q10

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

### Q11

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

### Q12

```swift
struct SettingsView: View {
    @State private var darkMode = false        // resets every launch
    var body: some View {
        Toggle("Dark mode", isOn: $darkMode)
    }
}
```

What is wrong with this code, and how should it be improved?

<details><summary>Answer</summary>

- `darkMode` is local view state, so toggling it works for the session but resets on next launch.
- User settings should persist via `@AppStorage`.

```swift
struct SettingsView: View {
    @AppStorage("darkMode") private var darkMode: Bool = false
    var body: some View {
        Toggle("Dark mode", isOn: $darkMode)
    }
}
```

Why: `@AppStorage` is the SwiftUI wrapper around `UserDefaults` — it auto-saves on every change and re-renders when the underlying default changes, while still acting like `@State` for binding.
</details>

### Q13

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

### Q14

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

### Q15

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
