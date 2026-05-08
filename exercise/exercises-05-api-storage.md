# Topic 5 — API Calls & AppStorage: Practice

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
</details>
