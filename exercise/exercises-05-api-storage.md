# Topic 5 — API Calls & AppStorage: Practice

> **React framing — this topic maps very cleanly:**
> - `URLSession.shared.data(from:)` ≈ `fetch(url)`
> - `JSONDecoder().decode(T.self, from: data)` ≈ `JSON.parse(text) as T` (or Zod)
> - `Codable` struct ≈ TypeScript interface + Zod schema (shape + parse)
> - `@AppStorage("k")` ≈ `useLocalStorage("k", default)` custom hook over `localStorage`
> - `.task { ... }` ≈ `useEffect(() => { load(); return () => abort() }, [])` with built-in cancellation
> - `async/await` syntax is identical.

## Section A — Output Prediction

### A1. Decode simple JSON

```swift
struct User: Codable {
    let id: Int
    let name: String
}

let json = #"{"id": 7, "name": "Ada"}"#.data(using: .utf8)!
let u = try JSONDecoder().decode(User.self, from: json)
print("\(u.id)-\(u.name)")
```

<details><summary>Answer</summary>

```
7-Ada
```

Why: Property names match JSON keys exactly, so default Codable synthesis fills them in.

> **React/TS:** equivalent to `const u = JSON.parse(json) as User;` — but TS `as` is unchecked at runtime, while `Codable` actually validates types.
</details>

### A2. snake_case JSON without CodingKeys

```swift
struct Post: Codable {
    let userId: Int
    let title: String
}

let json = #"{"user_id": 1, "title": "hi"}"#.data(using: .utf8)!
do {
    let p = try JSONDecoder().decode(Post.self, from: json)
    print(p.userId)
} catch {
    print("decode failed")
}
```

<details><summary>Answer</summary>

```
decode failed
```

Why: The JSON key is `user_id` but the struct expects `userId`; without `CodingKeys` or `.convertFromSnakeCase`, decoding throws and the catch branch runs.

> **React/TS:** `JSON.parse` doesn't rename keys — `obj.userId` is `undefined` if JSON has `user_id`. TS won't catch it; only Zod or a manual mapper does what `Codable` enforces.
</details>

### A3. Missing field in JSON

```swift
struct Item: Codable {
    let id: Int
    let name: String
}

let json = #"{"id": 9}"#.data(using: .utf8)!
do {
    _ = try JSONDecoder().decode(Item.self, from: json)
    print("ok")
} catch {
    print("missing")
}
```

<details><summary>Answer</summary>

```
missing
```

Why: `name` is non-optional and absent from the JSON, so decoding throws `keyNotFound` and the catch branch prints "missing".

> **React/TS:** TS would let this through silently (`name` is `undefined` at runtime). Zod throws a similar validation error to Swift's `keyNotFound`.
</details>

### A4. Sequential await order

```swift
func a() async -> Int { print("A"); return 1 }
func b() async -> Int { print("B"); return 2 }

func run() async {
    let x = await a()
    let y = await b()
    print("done \(x + y)")
}

await run()
```

<details><summary>Answer</summary>

```
A
B
done 3
```

Why: Sequential `await` calls run one after the other; each prints before the next is invoked.

> **React/JS:** identical behavior — `await a(); await b();` runs sequentially. Use `Promise.all([a(), b()])` for concurrent. Swift equivalent: `async let`.
</details>

### A5. AppStorage first read returns default

```swift
struct DemoView: View {
    @AppStorage("greeting_unused_key_xyz") var greeting: String = "hello"
    var body: some View {
        Text(greeting)
            .onAppear { print(greeting) }
    }
}
```

<details><summary>Answer</summary>

```
hello
```

Why: With no value previously written under that UserDefaults key, `@AppStorage` returns the declared default.

> **React:** equivalent to `useLocalStorage("greeting_unused", "hello")` — the second arg is the default when the key is absent.
</details>

### A6. AppStorage after write

```swift
@AppStorage("usernameABC") var username: String = ""
// earlier in the run:
UserDefaults.standard.set("tae", forKey: "usernameABC")
print(username)
```

<details><summary>Answer</summary>

```
tae
```

Why: `@AppStorage` is a thin wrapper over `UserDefaults`; once a value is written under the same key, subsequent reads return that value instead of the default.

> **React:** equivalent to writing `localStorage.setItem("username", "tae")` and then having `useLocalStorage("username", "")` read it back.
</details>

### A7. Encoding to JSON

```swift
struct Point: Codable { let x: Int; let y: Int }
let p = Point(x: 3, y: 4)
let data = try JSONEncoder().encode(p)
print(String(data: data, encoding: .utf8)!)
```

<details><summary>Answer</summary>

```
{"x":3,"y":4}
```

Why: `JSONEncoder` emits a flat object whose keys are the property names and values match the stored values; default output has no whitespace.

> **React/JS:** `JSON.stringify({x:3, y:4})` produces the same string.
</details>

### A8. Decode array count

```swift
struct Post: Codable { let id: Int }
let json = #"[{"id":1},{"id":2},{"id":3}]"#.data(using: .utf8)!
let posts = try JSONDecoder().decode([Post].self, from: json)
print(posts.count)
```

<details><summary>Answer</summary>

```
3
```

Why: `[Post].self` decodes a JSON array; the resulting Swift array's count equals the number of array elements.

> **React/JS:** `(JSON.parse(json) as Post[]).length === 3`.
</details>

### A9. HTTPURLResponse status-code guard

```swift
func loadJSON() async throws -> Data {
    guard let url = URL(string: "https://api.example.com/items") else {
        throw URLError(.badURL)
    }
    let (data, response) = try await URLSession.shared.data(from: url)
    // What goes here before decoding?
    return data
}
```

Why is decoding without checking the status code unsafe, and what is the canonical guard?

<details><summary>Answer</summary>

If the server returns 4xx/5xx, `data` is often an HTML error page or a different JSON shape (e.g. `{"error": "..."}`) than the success type. Decoding that body throws an unhelpful "missing key" error and hides the real problem (auth, rate limit, server outage).

```swift
let (data, response) = try await URLSession.shared.data(from: url)
guard let http = response as? HTTPURLResponse,
      (200..<300).contains(http.statusCode) else {
    throw URLError(.badServerResponse)
}
return data
```

`(200..<300)` covers all "OK" responses. Cast `response` to `HTTPURLResponse` to access `statusCode`. Throwing `URLError(.badServerResponse)` (or a custom error) lets the caller distinguish network-fail from decode-fail.

> **React/JS:** `if (!res.ok) throw new Error(res.statusText)` is the same idea — `fetch` does not auto-throw on 4xx/5xx, you must check.
</details>

## Section B — Code Improvement

### B1. Force-unwrapped URL

Bad:
```swift
func load() async {
    let url = URL(string: "https://jsonplaceholder.typicode.com/posts")!
    let (data, _) = try! await URLSession.shared.data(from: url)
    _ = data
}
```

<details><summary>Improved code & reasons</summary>

```swift
func load() async {
    guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts") else {
        return
    }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        _ = data
    } catch {
        print(error.localizedDescription)
    }
}
```

Reasons: Force-unwrapping `URL(string:)` crashes on a typo. `try!` crashes on any network/parse error. Use `guard let` plus a `do/catch`.

> **React/JS:** `new URL(...)` throws on a bad string and `fetch` rejects on network failure — wrap in `try { await fetch(...) } catch (e) { ... }`. Same lesson: never `!` user-facing failure points.
</details>

### B2. Missing await

Bad:
```swift
func load() async throws {
    let url = URL(string: "https://jsonplaceholder.typicode.com/posts/1")!
    let (data, _) = try URLSession.shared.data(from: url)
    print(data.count)
}
```

<details><summary>Improved code & reasons</summary>

```swift
func load() async throws {
    guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts/1") else { return }
    let (data, _) = try await URLSession.shared.data(from: url)
    print(data.count)
}
```

Reasons: `URLSession.shared.data(from:)` is `async throws`; without `await` it does not compile.

> **React/JS:** identical compile-error mechanic — calling an `async` function without `await` returns a `Promise<T>`, not `T`. Same fix.
</details>

### B3. Missing try on decode

Bad:
```swift
struct Post: Codable { let id: Int; let title: String }

func parse(_ data: Data) {
    let post = JSONDecoder().decode(Post.self, from: data)
    print(post.title)
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct Post: Codable { let id: Int; let title: String }

func parse(_ data: Data) {
    do {
        let post = try JSONDecoder().decode(Post.self, from: data)
        print(post.title)
    } catch {
        print("decode failed: \(error)")
    }
}
```

Reasons: `decode(_:from:)` throws; you must use `try` and handle errors with `do/catch` (or `throws`).

> **React/JS:** `JSON.parse` also throws — wrap `try { JSON.parse(text) } catch (e) { ... }`. Swift's `try` keyword forces you to acknowledge it; JS lets you forget until production.
</details>

### B4. Calling async from sync context

Bad:
```swift
struct ContentView: View {
    var body: some View {
        Button("Reload") {
            await load()
        }
    }
    func load() async { /* ... */ }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct ContentView: View {
    var body: some View {
        Button("Reload") {
            Task { await load() }
        }
    }
    func load() async { /* ... */ }
}
```

Reasons: A `Button` action closure is synchronous, so `await` is illegal there. Wrap the call in `Task { ... }` to bridge into an async context.

> **React:** identical — `<button onClick={() => { void load() }}>` or `<button onClick={async () => await load()}>`. `Task { ... }` is Swift's "fire-and-forget Promise"; `() => { load() }` is JS's.
</details>

### B5. Property names mismatch JSON

Bad:
```swift
struct Post: Codable {
    let userId: Int
    let id: Int
    let title: String
}
// JSON: {"user_id": 1, "id": 1, "title": "hi"}
```

<details><summary>Improved code & reasons</summary>

```swift
struct Post: Codable {
    let userId: Int
    let id: Int
    let title: String
    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case id
        case title
    }
}
// or set decoder.keyDecodingStrategy = .convertFromSnakeCase
```

Reasons: Without a key mapping, decoding the `user_id` field into `userId` fails. `CodingKeys` (or the snake-case strategy) bridges the two naming styles.

> **React/TS:** in TS you'd manually map: `{ userId: raw.user_id, id: raw.id, title: raw.title }` — or use a Zod transform. `CodingKeys` is the declarative form.
</details>

### B6. Int field where JSON sends String

Bad:
```swift
struct Product: Codable {
    let id: Int
    let price: Int
}
// JSON: {"id": 1, "price": "1990"}
```

<details><summary>Improved code & reasons</summary>

```swift
struct Product: Codable {
    let id: Int
    let priceText: String
    var price: Int { Int(priceText) ?? 0 }
    enum CodingKeys: String, CodingKey {
        case id
        case priceText = "price"
    }
}
```

Reasons: JSON `"1990"` is a string, not a number, so decoding into `Int` throws a type-mismatch. Decode into `String` and convert when reading.

> **React/TS:** equivalent to receiving `price: string` then computing `Number(price)` in a getter or `useMemo`.
</details>

### B7. Optional fields not marked Optional

Bad:
```swift
struct User: Codable {
    let id: Int
    let name: String
    let email: String   // sometimes absent in JSON
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct User: Codable {
    let id: Int
    let name: String
    let email: String?
}
```

Reasons: Non-optional Codable properties throw if the key is missing or null. Declaring possibly-absent fields as `Optional` lets decoding succeed.

> **React/TS:** TS interface `email?: string` (or `email: string | undefined`) — same idea.
</details>

### B8. Completion-handler API mixed with async

Bad:
```swift
func load() async -> Data? {
    var result: Data?
    URLSession.shared.dataTask(with: URL(string: "https://jsonplaceholder.typicode.com/posts/1")!) { data, _, _ in
        result = data
    }.resume()
    return result
}
```

<details><summary>Improved code & reasons</summary>

```swift
func load() async -> Data? {
    guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts/1") else { return nil }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    } catch {
        return nil
    }
}
```

Reasons: The completion handler runs after the function returns, so `result` is always `nil`. Use the modern `data(from:)` async API instead.

> **React/JS:** the same bug shape as returning before a callback fires. Modern `await fetch(...)` replaces callback-style XHR or `dataTask`.
</details>

### B9. Mutating @Published off the main thread

Bad:
```swift
final class PostsVM: ObservableObject {
    @Published var posts: [Post] = []
    func load() async {
        guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts") else { return }
        let (data, _) = try! await URLSession.shared.data(from: url)
        posts = try! JSONDecoder().decode([Post].self, from: data)
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
@MainActor
final class PostsVM: ObservableObject {
    @Published var posts: [Post] = []
    func load() async {
        guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            posts = try JSONDecoder().decode([Post].self, from: data)
        } catch {
            print(error.localizedDescription)
        }
    }
}
```

Reasons: SwiftUI requires `@Published` mutations on the main actor. Annotating the class `@MainActor` guarantees that, and replacing `try!` with `do/catch` avoids crashes.

> **React/JS:** JS is single-threaded by default, so this specific bug doesn't exist. The closest analog: when posting from a Web Worker back to the UI thread, you must `postMessage`. `@MainActor` is "always run this on the UI thread."
</details>

### B10. .onAppear with await

Bad:
```swift
struct PostsView: View {
    @StateObject var vm = PostsVM()
    var body: some View {
        List(vm.posts) { Text($0.title) }
            .onAppear { await vm.load() }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct PostsView: View {
    @StateObject var vm = PostsVM()
    var body: some View {
        List(vm.posts) { Text($0.title) }
            .task { await vm.load() }
    }
}
```

Reasons: `onAppear`'s closure is synchronous, so `await` is a compile error. `.task` provides an async context tied to the view's lifetime.

> **React:** `.onAppear` ≈ `useEffect(() => { load() }, [])` (no cleanup). `.task` ≈ `useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [])` — the cancellation is built in. Always prefer `.task` for fetches.
</details>

### B11. Date decoding — snake_case + Unix epoch

Bad:
```swift
struct Post: Codable {
    let displayName: String
    let createdAt: Date
}

func decode(_ data: Data) throws -> [Post] {
    try JSONDecoder().decode([Post].self, from: data)
}

// Server sends:
// [{ "display_name": "Tae", "created_at": 1715225400 }]
```

Decoding always nils. Why, and how do you fix it?

<details><summary>Improved code & reasons</summary>

Two independent issues:

1. **Key mismatch** — server uses `display_name` and `created_at` but the struct uses camelCase. Vanilla `JSONDecoder` does not bridge these.
2. **Date strategy missing** — server sends Unix epoch seconds (a number). The default `dateDecodingStrategy` expects `Date.timeIntervalSinceReferenceDate` (a different epoch base), so decode throws a type-mismatch.

```swift
struct Post: Codable {
    let displayName: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case displayName = "display_name"
        case createdAt   = "created_at"
    }
}

func decode(_ data: Data) throws -> [Post] {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .secondsSince1970
    return try decoder.decode([Post].self, from: data)
}
```

Alternative for keys: `decoder.keyDecodingStrategy = .convertFromSnakeCase` (works when *every* key is snake_case). Use `CodingKeys` when only some keys differ.

Mock 5 B2 anchor pattern.
</details>

## Section C — Practical Mini-Tasks

### C1. Fetch posts and list titles

Starter:
```swift
import SwiftUI

struct Post: Codable, Identifiable {
    let id: Int
    let title: String
}

struct PostListView: View {
    @State private var posts: [Post] = []

    var body: some View {
        // TODO: show titles in a List and fetch on appear
        Text("TODO")
    }

    func load() async {
        // TODO
    }
}
```

Your task: complete `PostListView` so it fetches `/posts` from `https://jsonplaceholder.typicode.com` and displays each post's title in a `List`.

<details><summary>Reference solution</summary>

```swift
import SwiftUI

struct Post: Codable, Identifiable {
    let id: Int
    let title: String
}

struct PostListView: View {
    @State private var posts: [Post] = []
    @State private var errorMessage: String?

    var body: some View {
        List(posts) { post in
            Text(post.title)
        }
        .overlay {
            if let m = errorMessage { Text(m).foregroundStyle(.red) }
        }
        .task { await load() }
    }

    func load() async {
        guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts") else {
            errorMessage = "Bad URL"
            return
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            posts = try JSONDecoder().decode([Post].self, from: data)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

> **React:** equivalent shape:
> ```tsx
> const [posts, setPosts] = useState<Post[]>([]);
> const [err, setErr] = useState<string|null>(null);
> useEffect(() => {
>   (async () => {
>     try {
>       const r = await fetch("https://.../posts");
>       setPosts(await r.json());
>     } catch (e) { setErr(String(e)); }
>   })();
> }, []);
> ```
</details>

### C2. snake_case mismatch without renaming

Starter:
```swift
struct Post: Codable {
    let userId: Int
    let id: Int
    let title: String
}
// JSON sample: {"user_id": 1, "id": 1, "title": "hi"}
let data: Data = /* given */ Data()
let post = try JSONDecoder().decode(Post.self, from: data) // throws
```

Your task: decode this JSON without renaming `userId` in the Swift struct.

<details><summary>Reference solution</summary>

Option 1 — `CodingKeys`:
```swift
struct Post: Codable {
    let userId: Int
    let id: Int
    let title: String

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case id
        case title
    }
}
```

Option 2 — decoder strategy:
```swift
let decoder = JSONDecoder()
decoder.keyDecodingStrategy = .convertFromSnakeCase
let post = try decoder.decode(Post.self, from: data)
```

Either keeps the Swift property `userId` while accepting `user_id` in JSON.

> **React/TS:** Option 1 is a Zod transform: `z.object({ userId: z.number().describe("user_id"), ... })` with manual remap. Option 2 is a project-wide convention you'd implement in your fetch wrapper.
</details>

### C3. Persist user's name across launches

Starter:
```swift
import SwiftUI

struct WelcomeView: View {
    @State private var name: String = ""

    var body: some View {
        VStack(alignment: .leading) {
            Text("Welcome, \(name.isEmpty ? "guest" : name)")
            TextField("Your name", text: $name)
                .textFieldStyle(.roundedBorder)
        }
        .padding()
    }
}
```

Your task: make `name` survive app relaunches using `@AppStorage`.

<details><summary>Reference solution</summary>

```swift
import SwiftUI

struct WelcomeView: View {
    @AppStorage("user_name") private var name: String = ""

    var body: some View {
        VStack(alignment: .leading) {
            Text("Welcome, \(name.isEmpty ? "guest" : name)")
            TextField("Your name", text: $name)
                .textFieldStyle(.roundedBorder)
        }
        .padding()
    }
}
```

`@AppStorage` writes to `UserDefaults` on every change and reads it back on launch, so the name persists.

> **React:** swap `useState("")` for `useLocalStorage("user_name", "")`. Same one-line refactor — the wrapper handles read-on-mount and write-on-change.
</details>

### C4. Refactor onAppear to .task

Starter:
```swift
struct FeedView: View {
    @StateObject var vm = FeedVM()
    var body: some View {
        List(vm.items, id: \.self) { Text($0) }
            .onAppear {
                Task { await vm.load() }
            }
    }
}

@MainActor
final class FeedVM: ObservableObject {
    @Published var items: [String] = []
    func load() async { items = ["a", "b", "c"] }
}
```

Your task: replace `.onAppear { Task { ... } }` with `.task` and explain why it is preferable.

<details><summary>Reference solution</summary>

```swift
struct FeedView: View {
    @StateObject var vm = FeedVM()
    var body: some View {
        List(vm.items, id: \.self) { Text($0) }
            .task { await vm.load() }
    }
}
```

`.task` already provides an async context, eliminates the need for an explicit `Task { }`, and automatically cancels the work when the view leaves the hierarchy. `.onAppear` runs synchronously and does not handle cancellation.

> **React:** `useEffect(() => { load() }, [])` (no cleanup) → `useEffect(() => { const c = new AbortController(); load(c.signal); return () => c.abort(); }, [])`. `.task` is the latter for free.
</details>

### C5. Persisted favorites Set<Int>

Starter:
```swift
import SwiftUI

struct Post: Codable, Identifiable {
    let id: Int
    let title: String
}

struct FavoritesListView: View {
    @State private var posts: [Post] = []
    // TODO: persisted favorites here

    var body: some View {
        List(posts) { post in
            // TODO: tap to toggle favorite, show indicator
            Text(post.title)
        }
        .task { await load() }
    }

    func load() async {
        guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts") else { return }
        if let (data, _) = try? await URLSession.shared.data(from: url),
           let decoded = try? JSONDecoder().decode([Post].self, from: data) {
            posts = decoded
        }
    }
}
```

Your task: persist a `Set<Int>` of favorite post ids using `@AppStorage` (encoded as `Data`); tapping a row toggles membership and a star marks favorites.

<details><summary>Reference solution</summary>

```swift
import SwiftUI

struct Post: Codable, Identifiable {
    let id: Int
    let title: String
}

struct FavoritesListView: View {
    @State private var posts: [Post] = []
    @AppStorage("favorite_post_ids") private var favoritesData: Data = Data()

    private var favorites: Set<Int> {
        (try? JSONDecoder().decode(Set<Int>.self, from: favoritesData)) ?? []
    }

    var body: some View {
        List(posts) { post in
            HStack {
                Text(post.title)
                Spacer()
                if favorites.contains(post.id) {
                    Text("*").bold()
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { toggle(post.id) }
        }
        .task { await load() }
    }

    private func toggle(_ id: Int) {
        var current = favorites
        if current.contains(id) {
            current.remove(id)
        } else {
            current.insert(id)
        }
        if let encoded = try? JSONEncoder().encode(current) {
            favoritesData = encoded
        }
    }

    func load() async {
        guard let url = URL(string: "https://jsonplaceholder.typicode.com/posts") else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            posts = try JSONDecoder().decode([Post].self, from: data)
        } catch {
            print(error.localizedDescription)
        }
    }
}
```

`@AppStorage` natively supports `Data`, so we serialize the `Set<Int>` to JSON `Data` on every write and decode it on every read. Tapping a row mutates a local copy of the set and re-encodes it; SwiftUI re-renders because `favoritesData` changed.

> **React:** equivalent to `localStorage.setItem("favs", JSON.stringify([...favs]))` on toggle and `JSON.parse(localStorage.getItem("favs") ?? "[]")` on read. `@AppStorage` only natively supports primitives — for collections you serialize to `Data`/JSON, exactly like localStorage.
</details>

### C6. Persisted favorites in an @Observable store (practical-exam shape)

`@AppStorage` works inside SwiftUI views but does NOT compose with `@Observable` classes. Every practical-exam mock uses a class-based store: parent owns `@State private var favorites = FavoritesStore()` and rows toggle membership through it. Implement that store.

Starter:
```swift
import Observation
import Foundation

@Observable
final class FavoritesStore {
    var ids: Set<String> = []
    private let key = "favorite-ids"

    init() {
        // TODO: load from UserDefaults
    }

    func toggle(_ id: String) {
        // TODO: insert or remove, then save
    }

    private func save() {
        // TODO: encode ids as JSON Data and write to UserDefaults
    }

    private func load() {
        // TODO: read Data from UserDefaults and decode into ids
    }
}
```

Your task: complete `init`, `toggle`, `save`, `load`. Then write a parent View that holds the store with `@State` and a row that toggles via tap.

<details><summary>Reference solution</summary>

```swift
import Observation
import Foundation
import SwiftUI

@Observable
final class FavoritesStore {
    var ids: Set<String> = []
    private let key = "favorite-ids"

    init() {
        load()
    }

    func toggle(_ id: String) {
        if ids.contains(id) {
            ids.remove(id)
        } else {
            ids.insert(id)
        }
        save()
    }

    func contains(_ id: String) -> Bool {
        ids.contains(id)
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(ids) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: key),
              let decoded = try? JSONDecoder().decode(Set<String>.self, from: data) else {
            return
        }
        ids = decoded
    }
}

struct PostListView: View {
    @State private var favorites = FavoritesStore()
    let posts: [Post]

    var body: some View {
        List(posts) { post in
            HStack {
                Text(post.title)
                Spacer()
                if favorites.contains(post.id) {
                    Text("*").bold()
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { favorites.toggle(post.id) }
        }
    }
}

struct Post: Codable, Identifiable {
    let id: String
    let title: String
}
```

Key points:
- The store is a **class** marked `@Observable`. Parent owns it with `@State` (which guarantees one instance per view identity that survives re-renders).
- `init { load() }` hydrates from UserDefaults on creation. `save()` is called after every mutation in `toggle`.
- `Set<String>` is `Codable`, so JSON round-trip via `Data` works directly. UserDefaults supports `Data` natively.
- A child row that needs to mutate the store would receive it as `@Bindable var favorites: FavoritesStore` (or plain `let` if read-only).

Mock 1 BookmarkStore / Mock 4 HabitStore anchor pattern.
</details>

### C7. Nested Codable + computed Identifiable id

API response:
```json
{
  "name": { "common": "Thailand", "official": "Kingdom of Thailand" },
  "cca2": "TH",
  "population": 70000000
}
```

Your task: write a `Country` model that decodes this shape, conforms to `Identifiable` and `Hashable`, and uses `cca2` as the identity field (NOT a UUID).

<details><summary>Reference solution</summary>

```swift
struct Country: Codable, Identifiable, Hashable {
    let name: NameBlock
    let cca2: String
    let population: Int

    var id: String { cca2 }

    struct NameBlock: Codable, Hashable {
        let common: String
        let official: String
    }
}
```

Key points:
- **Nested `NameBlock`** mirrors the JSON's nested object. Codable synthesizes the nested decoder automatically as long as the inner type also conforms to `Codable`.
- **`var id: String { cca2 }`** is a computed property. It satisfies `Identifiable` without adding a new field to the JSON shape, and stays stable across decodes (every fresh JSON parse yields the same `id` for `"TH"`). Using `let id = UUID()` would break: each decode would produce a new UUID, so `Set<Country>` deduplication and List diffing would misbehave.
- **`Hashable`** is required to use `Country` as a `NavigationLink(value:)` value or as an element in a `Set`. Synthesized automatically because every stored property is `Hashable`.

Usage:
```swift
NavigationStack {
    List(countries) { c in
        NavigationLink(value: c) { Text(c.name.common) }
    }
    .navigationDestination(for: Country.self) { c in
        Text("\(c.name.official) — pop \(c.population)")
    }
}
```

Mock 1 / Mock 4 practical Task 2 anchor pattern.
</details>
