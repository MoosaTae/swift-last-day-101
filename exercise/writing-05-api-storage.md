# Topic 5 -- API & AppStorage: Writing Drills

Hands-on counterpart to `exercises-05-api-storage.md`. You write the code; the
solution block is for grading yourself afterwards. iOS 17+ syntax (`.task`,
`@Observable` where useful, `async`/`await` everywhere -- no completion
handlers).

Six exercises, easy -> exam-level. Budget per exercise is in the heading.

**Standing rule for every test in this file:** no test may hit the real
network. Every exercise that talks to HTTP defines (or extends) a small
`protocol DataFetching` and tests inject a fake conformer that returns
canned `Data` or throws a canned error. If you want to call
`URLSession.shared.data(from:)` from a test, stop and inject a fake. The
network is not your friend in CI.

---

## Ex 1 -- Settings toggle persisted with @AppStorage (~8 min)

Target wireframe (ASCII, monospace):

```
+--------------------------------+
|  Settings                      |
|                                |
|  Notifications      [  ON  ]   |
|                                |
|  (status: notifications on)    |
+--------------------------------+
```

Behavior:
- A `Form` with one `Section("Settings")`.
- A single row with the label `Notifications` on the left and a `Toggle` on
  the right, bound to a `@AppStorage("notificationsEnabled")` Bool that
  defaults to `true`.
- Below the form, a `Text` reads `notifications on` or `notifications off`
  based on the same flag.
- Killing and relaunching the app must remember the toggle state.

Write this view from scratch. State ownership is yours to choose; pick the
narrowest wrapper that satisfies the spec.

<details><summary>Solution</summary>

```swift
import SwiftUI

struct SettingsView: View {
    @AppStorage("notificationsEnabled") private var notifications: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Form {
                Section("Settings") {
                    Toggle("Notifications", isOn: $notifications)
                }
            }
            Text("notifications \(notifications ? "on" : "off")")
                .foregroundStyle(.secondary)
                .padding(.horizontal)
        }
    }
}
```

Why: `@AppStorage` is the narrowest wrapper that gives you both
re-render-on-change (like `@State`) and persistence across launches (like
`UserDefaults`). No view model here -- the truth is one Bool that lives in
`UserDefaults`. `private` keeps it view-local. Default `true` opts a fresh
install in and also covers tests that wipe the suite.
</details>

---

## Ex 2 -- Refactor: posts feed full of smells (~12 min)

This compiles and "works" against a happy-path response, but it commits at
least six of the smells the practical exam grades. List every smell you can
spot, then rewrite the file from the top.

```swift
import SwiftUI

struct Post: Codable {
    let userId: Int
    let id: Int
    let title: String
    let body: String
}

struct FeedView: View {
    @State var posts: [Post] = []
    @State var lastQuery: String = ""

    var body: some View {
        VStack {
            TextField("query", text: $lastQuery)
            List(posts, id: \.id) { p in
                Text(p.title)
            }
        }
        .onAppear {
            UserDefaults.standard.set(lastQuery, forKey: "lastQuery")
            Task {
                let url = URL(string: "https://jsonplaceholder.typicode.com/posts?userId=" + lastQuery)!
                let (data, _) = try! await URLSession.shared.data(from: url)
                posts = try! JSONDecoder().decode([Post].self, from: data)
            }
        }
    }
}
```

<details><summary>Solution</summary>

Smells (count >= 6):

1. `URL(string:)!` force-unwraps a string built by concatenation -- a stray
   space in `lastQuery` crashes the app. Use `URLComponents` +
   `URLQueryItem` and `guard let url`.
2. `try! await URLSession.shared.data(from: url)` crashes on any network
   hiccup. Wrap in `do/catch` and surface an error state.
3. `try! JSONDecoder().decode(...)` crashes on any decoding error. Same fix.
4. Fetch sits inside `.onAppear { Task { ... } }`. The right primitive is
   `.task`, which gives you an async context for free **and** cancels when
   the view disappears.
5. Relying on raw JSON key names is fragile; prefer `CodingKeys` or
   `decoder.keyDecodingStrategy = .convertFromSnakeCase`.
6. `UserDefaults.standard.set(... forKey: "lastQuery")` is the imperative
   form. Prefer `@AppStorage("lastQuery")` so SwiftUI re-renders on change
   and the binding flows through `$lastQuery`.
7. No loading indicator and no error UI -- the user stares at an empty
   list while the request hangs.
8. `@State var posts` and `@State var lastQuery` are missing `private`;
   `@State` is view-internal by contract.
9. The fetch is inline in the view with no testable seam. Pull it behind
   a `protocol DataFetching` so tests can inject a fake.

Rewritten:

```swift
import SwiftUI
import Observation

protocol DataFetching {
    func fetch(_ url: URL) async throws -> Data
}

struct LiveFetcher: DataFetching {
    func fetch(_ url: URL) async throws -> Data {
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }
}

struct Post: Codable, Identifiable {
    let userId: Int
    let id: Int
    let title: String
    let body: String
}

@Observable
@MainActor
final class FeedVM {
    enum Phase { case idle, loading, loaded([Post]), failed(String) }

    var phase: Phase = .idle
    private let fetcher: DataFetching

    init(fetcher: DataFetching = LiveFetcher()) {
        self.fetcher = fetcher
    }

    func load(userId: String) async {
        phase = .loading
        guard let url = Self.makeURL(userId: userId) else {
            phase = .failed("Invalid URL")
            return
        }
        do {
            let data = try await fetcher.fetch(url)
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            let posts = try decoder.decode([Post].self, from: data)
            phase = .loaded(posts)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    static func makeURL(userId: String) -> URL? {
        var c = URLComponents(string: "https://jsonplaceholder.typicode.com/posts")
        let trimmed = userId.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty {
            c?.queryItems = [URLQueryItem(name: "userId", value: trimmed)]
        }
        return c?.url
    }
}

struct FeedView: View {
    @State private var vm = FeedVM()
    @AppStorage("lastQuery") private var lastQuery: String = ""

    var body: some View {
        VStack {
            TextField("query", text: $lastQuery)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal)

            switch vm.phase {
            case .idle, .loading:
                ProgressView().padding()
            case .loaded(let posts):
                List(posts) { Text($0.title) }
            case .failed(let msg):
                Text(msg).foregroundStyle(.red).padding()
            }
        }
        .task(id: lastQuery) { await vm.load(userId: lastQuery) }
    }
}
```

Why each fix matters: `URLComponents` percent-encodes user input for you.
`do/catch` plus a `Phase` enum gives the user something to look at instead
of an empty list. `.task(id:)` cancels the in-flight request and starts a
new one whenever `lastQuery` changes -- exactly the search-box behavior
you want. `@AppStorage` persists the query without imperative
`UserDefaults` code. The `DataFetching` seam is what makes the whole thing
unit-testable without touching the network.
</details>

---

## Ex 3 -- Mini-project: Codable round-trip in @AppStorage (~15 min)

Spec:
- A `Profile` struct: `name: String`, `age: Int`, `joined: Date`. Conforms
  to `Codable` and `Equatable`.
- A `ProfileStore` (final class) owns:
  - An `@AppStorage("profile_blob")` `Data` (default `Data()`).
  - A `var profile: Profile` computed property that decodes the blob on read
    (returning a default `Profile(name: "", age: 0, joined: .distantPast)`
    when the blob fails to decode) and encodes on write.
- Two static helpers, exposed for testing:
  - `static func encode(_ profile: Profile) -> Data` -- returns `Data()` if
    encoding fails (it should not, but be defensive).
  - `static func decode(_ data: Data) -> Profile?` -- returns nil on
    failure.
- The encoder uses `.iso8601` date strategy; the decoder mirrors it.

You don't have to write a view here -- the tests grade the helpers.

Starter (`Profile.swift`):

```swift
import SwiftUI

struct Profile: Codable, Equatable {
    var name: String
    var age: Int
    var joined: Date
}

final class ProfileStore {
    @AppStorage("profile_blob") private var blob: Data = Data()

    var profile: Profile {
        get { /* TODO */ Profile(name: "", age: 0, joined: .distantPast) }
        set { /* TODO */ }
    }

    static func encode(_ profile: Profile) -> Data {
        // TODO
        Data()
    }

    static func decode(_ data: Data) -> Profile? {
        // TODO
        nil
    }
}
```

Oracle (`Tests.swift`) -- your code is "done" when these pass. We test
the static helpers, not the `@AppStorage` round-trip itself; the wrapper
is out of scope for unit tests.

```swift
import XCTest
@testable import App

final class ProfileStoreTests: XCTestCase {
    func test_encode_then_decode_roundtrips() throws {
        let p = Profile(name: "Tae", age: 21,
                        joined: Date(timeIntervalSince1970: 1_700_000_000))
        let data = ProfileStore.encode(p)
        XCTAssertFalse(data.isEmpty)
        let restored = try XCTUnwrap(ProfileStore.decode(data))
        XCTAssertEqual(restored, p)
    }

    func test_decode_empty_data_returns_nil() {
        XCTAssertNil(ProfileStore.decode(Data()))
    }

    func test_decode_garbage_returns_nil() {
        let garbage = Data([0x00, 0x01, 0x02, 0x03])
        XCTAssertNil(ProfileStore.decode(garbage))
    }

    func test_decode_wrong_shape_returns_nil() {
        let json = #"{"hello": "world"}"#.data(using: .utf8)!
        XCTAssertNil(ProfileStore.decode(json))
    }

    func test_encode_emits_iso8601_date_string() throws {
        let p = Profile(name: "x", age: 1,
                        joined: Date(timeIntervalSince1970: 0))
        let data = ProfileStore.encode(p)
        let s = try XCTUnwrap(String(data: data, encoding: .utf8))
        // 1970-01-01T00:00:00Z  in some timezone form
        XCTAssertTrue(s.contains("1970-01-01"))
    }
}
```

<details><summary>Solution</summary>

```swift
import SwiftUI

struct Profile: Codable, Equatable {
    var name: String
    var age: Int
    var joined: Date
}

final class ProfileStore {
    @AppStorage("profile_blob") private var blob: Data = Data()

    var profile: Profile {
        get {
            ProfileStore.decode(blob)
                ?? Profile(name: "", age: 0, joined: .distantPast)
        }
        set {
            blob = ProfileStore.encode(newValue)
        }
    }

    static func encode(_ profile: Profile) -> Data {
        let enc = JSONEncoder()
        enc.dateEncodingStrategy = .iso8601
        return (try? enc.encode(profile)) ?? Data()
    }

    static func decode(_ data: Data) -> Profile? {
        guard !data.isEmpty else { return nil }
        let dec = JSONDecoder()
        dec.dateDecodingStrategy = .iso8601
        return try? dec.decode(Profile.self, from: data)
    }
}
```

Why: `@AppStorage` natively supports `Bool`, `Int`, `Double`, `String`,
`URL`, `Data`, and `RawRepresentable` enums -- not arbitrary `Codable`.
The canonical workaround is a `Data` blob round-tripped through JSON.
Splitting `encode`/`decode` into static helpers gives tests a seam that
does not depend on the property wrapper, keeping them deterministic. The
`nil` returns on `decode` cover the fresh-install case: `Data()` falls
through to the default profile instead of crashing.
</details>

---

## Ex 4 -- Mini-project: protocol-injected fetcher with state machine (~18 min)

Spec:
- A `protocol DataFetching` with one method:
  `func fetch(_ url: URL) async throws -> Data`.
- A `User` struct: `id: Int`, `name: String`, `email: String`, all
  `Codable`. `Equatable` for tests. The JSON uses snake_case
  (`{"id": 1, "name": "x", "email_address": "x@y"}`); use `CodingKeys` to
  map `email` -> `email_address`.
- A `UsersVM` (final, `@Observable`, `@MainActor`) with:
  - `enum Phase: Equatable { case idle, loading, loaded([User]), failed(String) }`
  - `var phase: Phase = .idle`
  - `init(fetcher: DataFetching)` (no default; tests must inject a fake).
  - `func load() async` builds `URL(string: "https://example.com/users")!`
    (force-unwrap is fine for a constant literal you control), sets
    `.loading`, calls the fetcher, decodes `[User]`, sets `.loaded` on
    success or `.failed(error.localizedDescription)` on any throw.

You don't have to write a view. Tests grade the VM.

Starter (`UsersVM.swift`):

```swift
import Foundation
import Observation

protocol DataFetching {
    func fetch(_ url: URL) async throws -> Data
}

struct User: Codable, Equatable {
    let id: Int
    let name: String
    let email: String
    // TODO: CodingKeys mapping email -> email_address
}

@Observable
@MainActor
final class UsersVM {
    enum Phase: Equatable {
        case idle
        case loading
        case loaded([User])
        case failed(String)
    }

    var phase: Phase = .idle
    private let fetcher: DataFetching

    init(fetcher: DataFetching) {
        self.fetcher = fetcher
    }

    func load() async {
        // TODO
    }
}
```

Oracle (`Tests.swift`):

```swift
import XCTest
@testable import App

final class FakeFetcher: DataFetching {
    var nextResult: Result<Data, Error> = .success(Data())
    private(set) var calledWith: [URL] = []

    func fetch(_ url: URL) async throws -> Data {
        calledWith.append(url)
        return try nextResult.get()
    }
}

struct DummyError: Error {}

@MainActor
final class UsersVMTests: XCTestCase {
    func test_initial_state_is_idle() {
        let vm = UsersVM(fetcher: FakeFetcher())
        XCTAssertEqual(vm.phase, .idle)
    }

    func test_success_path_loads_users() async throws {
        let json = #"""
        [
          {"id": 1, "name": "Alice", "email_address": "a@x.io"},
          {"id": 2, "name": "Bob",   "email_address": "b@x.io"}
        ]
        """#.data(using: .utf8)!
        let fake = FakeFetcher()
        fake.nextResult = .success(json)
        let vm = UsersVM(fetcher: fake)
        await vm.load()
        guard case .loaded(let users) = vm.phase else {
            return XCTFail("expected .loaded, got \(vm.phase)")
        }
        XCTAssertEqual(users.count, 2)
        XCTAssertEqual(users[0], User(id: 1, name: "Alice", email: "a@x.io"))
        XCTAssertEqual(users[1].email, "b@x.io")
    }

    func test_network_error_path() async {
        let fake = FakeFetcher()
        fake.nextResult = .failure(DummyError())
        let vm = UsersVM(fetcher: fake)
        await vm.load()
        guard case .failed = vm.phase else {
            return XCTFail("expected .failed, got \(vm.phase)")
        }
    }

    func test_decoding_error_path() async {
        let fake = FakeFetcher()
        fake.nextResult = .success(Data("not json".utf8))
        let vm = UsersVM(fetcher: fake)
        await vm.load()
        guard case .failed = vm.phase else {
            return XCTFail("expected .failed, got \(vm.phase)")
        }
    }

    func test_fetcher_called_with_expected_url() async {
        let fake = FakeFetcher()
        fake.nextResult = .success(Data("[]".utf8))
        let vm = UsersVM(fetcher: fake)
        await vm.load()
        XCTAssertEqual(fake.calledWith.map(\.absoluteString),
                       ["https://example.com/users"])
    }
}
```

<details><summary>Solution</summary>

```swift
import Foundation
import Observation

protocol DataFetching {
    func fetch(_ url: URL) async throws -> Data
}

struct User: Codable, Equatable {
    let id: Int
    let name: String
    let email: String

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case email = "email_address"
    }
}

@Observable
@MainActor
final class UsersVM {
    enum Phase: Equatable {
        case idle
        case loading
        case loaded([User])
        case failed(String)
    }

    var phase: Phase = .idle
    private let fetcher: DataFetching

    init(fetcher: DataFetching) {
        self.fetcher = fetcher
    }

    func load() async {
        phase = .loading
        let url = URL(string: "https://example.com/users")!
        do {
            let data = try await fetcher.fetch(url)
            let users = try JSONDecoder().decode([User].self, from: data)
            phase = .loaded(users)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }
}
```

Why: the protocol-injected fetcher means **the tests never touch the
network**. The fake records every URL the VM asked for and hands back
canned `Data` (or a canned error), so the test suite drives happy,
network-failure, decoding-failure, and URL-assertion paths in
milliseconds. `Equatable` on `Phase` lets tests pattern match cleanly.
`@MainActor` on both the class and the test case means we can
`await vm.load()` and then read `vm.phase` without `MainActor.run`.
</details>

---

## Ex 5 -- Mini-project: paginated search with URLComponents (~22 min)

Spec:
- A `SearchVM` (`@Observable`, `@MainActor`) that paginates results from
  `https://api.example.com/search`.
- It is constructed with a `DataFetching` (same protocol as Ex 4) and a
  fixed `pageSize: Int = 20`.
- Public state:
  - `var query: String = ""`
  - `var page: Int = 1`
  - `var results: [String] = []` (yes, just strings -- we keep the model
    simple to focus on URL construction and merge logic)
  - `var isLoading: Bool = false`
  - `var errorMessage: String? = nil`
- Methods:
  - `func search() async` -- resets `page = 1`, clears `results`, fetches
    page 1, replaces `results` with the response.
  - `func loadMore() async` -- increments `page`, fetches that page,
    *appends* to `results` (do not replace).
- A static helper `static func makeURL(query: String, page: Int, pageSize: Int) -> URL?`
  uses `URLComponents` and `URLQueryItem` to produce, for example,
  `https://api.example.com/search?q=swift&page=2&page_size=20`. Trim
  whitespace from the query; if it is empty after trimming, return `nil`.
- The decoder expects a JSON object: `{"items": ["a", "b", ...]}`. Decode
  into a private struct `Page: Codable { let items: [String] }`.

Starter (`SearchVM.swift`):

```swift
import Foundation
import Observation

protocol DataFetching {
    func fetch(_ url: URL) async throws -> Data
}

@Observable
@MainActor
final class SearchVM {
    var query: String = ""
    var page: Int = 1
    var results: [String] = []
    var isLoading: Bool = false
    var errorMessage: String? = nil

    private let fetcher: DataFetching
    private let pageSize: Int

    init(fetcher: DataFetching, pageSize: Int = 20) {
        self.fetcher = fetcher
        self.pageSize = pageSize
    }

    func search() async { /* TODO */ }
    func loadMore() async { /* TODO */ }

    static func makeURL(query: String, page: Int, pageSize: Int) -> URL? {
        // TODO
        nil
    }
}
```

Oracle (`Tests.swift`):

```swift
import XCTest
@testable import App

final class RecordingFetcher: DataFetching {
    var responses: [Result<Data, Error>] = []
    private(set) var calls: [URL] = []

    func fetch(_ url: URL) async throws -> Data {
        calls.append(url)
        guard !responses.isEmpty else { throw NSError(domain: "no", code: 0) }
        return try responses.removeFirst().get()
    }
}

@MainActor
final class SearchVMURLTests: XCTestCase {
    func test_makeURL_includes_q_page_and_page_size() {
        let url = SearchVM.makeURL(query: "swift", page: 2, pageSize: 20)
        let s = url?.absoluteString ?? ""
        XCTAssertTrue(s.hasPrefix("https://api.example.com/search?"))
        XCTAssertTrue(s.contains("q=swift"))
        XCTAssertTrue(s.contains("page=2"))
        XCTAssertTrue(s.contains("page_size=20"))
    }

    func test_makeURL_trims_whitespace() {
        let url = SearchVM.makeURL(query: "  hello  ", page: 1, pageSize: 5)
        XCTAssertTrue(url?.absoluteString.contains("q=hello") ?? false)
    }

    func test_makeURL_empty_query_returns_nil() {
        XCTAssertNil(SearchVM.makeURL(query: "", page: 1, pageSize: 5))
        XCTAssertNil(SearchVM.makeURL(query: "   ", page: 1, pageSize: 5))
    }

    func test_makeURL_percent_encodes_spaces() {
        let url = SearchVM.makeURL(query: "two words", page: 1, pageSize: 5)
        let s = url?.absoluteString ?? ""
        // URLComponents encodes space as +20 or +; either is acceptable
        XCTAssertTrue(s.contains("q=two%20words") || s.contains("q=two+words"))
    }
}

@MainActor
final class SearchVMFlowTests: XCTestCase {
    private func page(_ items: [String]) -> Data {
        let s = items.map { "\"\($0)\"" }.joined(separator: ",")
        return Data("{\"items\":[\(s)]}".utf8)
    }

    func test_search_replaces_results() async {
        let fake = RecordingFetcher()
        fake.responses = [.success(page(["a", "b"]))]
        let vm = SearchVM(fetcher: fake)
        vm.query = "swift"
        vm.results = ["leftover"]

        await vm.search()

        XCTAssertEqual(vm.results, ["a", "b"])
        XCTAssertEqual(vm.page, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func test_loadMore_appends_results_and_bumps_page() async {
        let fake = RecordingFetcher()
        fake.responses = [
            .success(page(["a", "b"])),
            .success(page(["c", "d"])),
        ]
        let vm = SearchVM(fetcher: fake)
        vm.query = "swift"

        await vm.search()
        await vm.loadMore()

        XCTAssertEqual(vm.results, ["a", "b", "c", "d"])
        XCTAssertEqual(vm.page, 2)
        XCTAssertEqual(fake.calls.count, 2)
        XCTAssertTrue(fake.calls[1].absoluteString.contains("page=2"))
    }

    func test_search_with_empty_query_sets_error_and_does_not_call_fetcher() async {
        let fake = RecordingFetcher()
        let vm = SearchVM(fetcher: fake)
        vm.query = "   "

        await vm.search()

        XCTAssertNotNil(vm.errorMessage)
        XCTAssertEqual(fake.calls.count, 0)
    }
}
```

<details><summary>Solution</summary>

```swift
import Foundation
import Observation

protocol DataFetching {
    func fetch(_ url: URL) async throws -> Data
}

@Observable
@MainActor
final class SearchVM {
    var query: String = ""
    var page: Int = 1
    var results: [String] = []
    var isLoading: Bool = false
    var errorMessage: String? = nil

    private let fetcher: DataFetching
    private let pageSize: Int

    init(fetcher: DataFetching, pageSize: Int = 20) {
        self.fetcher = fetcher
        self.pageSize = pageSize
    }

    private struct Page: Codable { let items: [String] }

    func search() async {
        page = 1
        results = []
        await fetchCurrentPage(replacing: true)
    }

    func loadMore() async {
        page += 1
        await fetchCurrentPage(replacing: false)
    }

    private func fetchCurrentPage(replacing: Bool) async {
        guard let url = Self.makeURL(query: query,
                                     page: page,
                                     pageSize: pageSize) else {
            errorMessage = "Empty query"
            return
        }
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            let data = try await fetcher.fetch(url)
            let p = try JSONDecoder().decode(Page.self, from: data)
            if replacing {
                results = p.items
            } else {
                results.append(contentsOf: p.items)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    static func makeURL(query: String, page: Int, pageSize: Int) -> URL? {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return nil }
        var c = URLComponents(string: "https://api.example.com/search")
        c?.queryItems = [
            URLQueryItem(name: "q", value: trimmed),
            URLQueryItem(name: "page", value: String(page)),
            URLQueryItem(name: "page_size", value: String(pageSize)),
        ]
        return c?.url
    }
}
```

Why: `URLComponents` + `URLQueryItem` is the only safe way to build a
query string from user input -- it percent-encodes spaces, ampersands, and
non-ASCII characters for you. Tests assert components of the URL rather
than the exact byte sequence because URLComponents may emit `%20` or `+`
for a space depending on platform; both are correct. `search()` replaces,
`loadMore()` appends -- the private `fetchCurrentPage(replacing:)` does the
work. The early-return on a nil URL is what makes the empty-query test
pass without ever touching the fetcher.
</details>

---

## Ex 6 -- Mini-project: list screen with cache + protocol fetcher (~25-30 min)

This is the exam-shaped one. Read the whole spec before starting.

Spec:
- Domain model: `Article: Codable, Identifiable, Equatable`. Fields:
  `id: Int`, `title: String`, `summary: String`. The JSON delivers
  `summary` under the key `summary_text`, so map it.
- `protocol DataFetching { func fetch(_ url: URL) async throws -> Data }`.
- `protocol ArticlesCache` with two methods:
  - `func read() -> [Article]?`
  - `func write(_ articles: [Article])`
- A concrete `AppStorageArticlesCache: ArticlesCache` that stores the cache
  as a `Data` blob in `@AppStorage("articles_cache_blob")` (default
  `Data()`). Encoding/decoding uses plain `JSONEncoder`/`JSONDecoder`. On
  decode failure, `read()` returns nil.
- `ArticlesVM` (`@Observable`, `@MainActor`):
  - `enum Phase: Equatable { case idle, loading, loaded([Article]), failed(String) }`
  - `var phase: Phase = .idle`
  - Initialized with `(fetcher: DataFetching, cache: ArticlesCache, query: String)`.
  - Stores `query` as a private constant (it is fixed for the lifetime of
    the VM in this exercise).
  - `func load(forceRefresh: Bool = false) async`:
    - If `forceRefresh == false` and the cache has a non-empty array,
      immediately set `.loaded(cached)` and **return without touching the
      fetcher**.
    - Otherwise: set `.loading`, build the URL, call the fetcher, decode
      `[Article]` (with the snake_case mapping), write the result to the
      cache, set `.loaded`. On any throw, set `.failed(message)`.
  - URL construction goes through a static
    `makeURL(query: String) -> URL?` using `URLComponents` against
    `https://news.example.com/v1/articles` and a single query item
    `q=<trimmed-query>`. Empty trimmed query -> nil URL -> `.failed("Empty query")`.

You don't need a view file. Grading is on the VM.

Starter (`Articles.swift`):

```swift
import Foundation
import SwiftUI
import Observation

struct Article: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let summary: String
    // TODO: CodingKeys for summary_text
}

protocol DataFetching {
    func fetch(_ url: URL) async throws -> Data
}

protocol ArticlesCache {
    func read() -> [Article]?
    func write(_ articles: [Article])
}

final class AppStorageArticlesCache: ArticlesCache {
    @AppStorage("articles_cache_blob") private var blob: Data = Data()

    func read() -> [Article]? {
        // TODO
        nil
    }
    func write(_ articles: [Article]) {
        // TODO
    }
}

@Observable
@MainActor
final class ArticlesVM {
    enum Phase: Equatable {
        case idle
        case loading
        case loaded([Article])
        case failed(String)
    }

    var phase: Phase = .idle
    private let fetcher: DataFetching
    private let cache: ArticlesCache
    private let query: String

    init(fetcher: DataFetching, cache: ArticlesCache, query: String) {
        self.fetcher = fetcher
        self.cache = cache
        self.query = query
    }

    func load(forceRefresh: Bool = false) async {
        // TODO
    }

    static func makeURL(query: String) -> URL? {
        // TODO
        nil
    }
}
```

Oracle (`Tests.swift`):

```swift
import XCTest
@testable import App

final class StubFetcher: DataFetching {
    var nextResult: Result<Data, Error> = .success(Data())
    private(set) var calls: [URL] = []

    func fetch(_ url: URL) async throws -> Data {
        calls.append(url)
        return try nextResult.get()
    }
}

final class InMemoryCache: ArticlesCache {
    var stored: [Article]? = nil
    private(set) var writes = 0

    func read() -> [Article]? { stored }
    func write(_ articles: [Article]) {
        stored = articles
        writes += 1
    }
}

struct CacheError: Error {}

@MainActor
final class ArticlesVMURLTests: XCTestCase {
    func test_makeURL_with_simple_query() {
        let url = ArticlesVM.makeURL(query: "swift")
        let s = url?.absoluteString ?? ""
        XCTAssertTrue(s.hasPrefix("https://news.example.com/v1/articles?"))
        XCTAssertTrue(s.contains("q=swift"))
    }

    func test_makeURL_trims_query() {
        let url = ArticlesVM.makeURL(query: "  ios  ")
        XCTAssertTrue(url?.absoluteString.contains("q=ios") ?? false)
    }

    func test_makeURL_empty_returns_nil() {
        XCTAssertNil(ArticlesVM.makeURL(query: ""))
        XCTAssertNil(ArticlesVM.makeURL(query: "   "))
    }
}

@MainActor
final class ArticlesVMFlowTests: XCTestCase {
    private func articleJSON(_ items: [Article]) -> Data {
        // emit the snake_case wire format the VM expects
        let parts = items.map { a in
            "{\"id\":\(a.id),\"title\":\"\(a.title)\",\"summary_text\":\"\(a.summary)\"}"
        }
        return Data("[\(parts.joined(separator: ","))]".utf8)
    }

    func test_success_path_loads_and_writes_cache() async {
        let fake = StubFetcher()
        let cache = InMemoryCache()
        let wire = articleJSON([
            Article(id: 1, title: "A", summary: "first"),
            Article(id: 2, title: "B", summary: "second"),
        ])
        fake.nextResult = .success(wire)
        let vm = ArticlesVM(fetcher: fake, cache: cache, query: "swift")
        await vm.load()
        guard case .loaded(let articles) = vm.phase else {
            return XCTFail("expected loaded, got \(vm.phase)")
        }
        XCTAssertEqual(articles.count, 2)
        XCTAssertEqual(articles.first?.summary, "first")
        XCTAssertEqual(cache.stored?.count, 2)
        XCTAssertEqual(cache.writes, 1)
        XCTAssertEqual(fake.calls.count, 1)
    }

    func test_decoding_error_path_does_not_write_cache() async {
        let fake = StubFetcher()
        let cache = InMemoryCache()
        fake.nextResult = .success(Data("not json".utf8))
        let vm = ArticlesVM(fetcher: fake, cache: cache, query: "swift")
        await vm.load()
        guard case .failed = vm.phase else {
            return XCTFail("expected failed")
        }
        XCTAssertNil(cache.stored)
        XCTAssertEqual(cache.writes, 0)
    }

    func test_cache_hit_skips_network() async {
        let fake = StubFetcher()
        let cache = InMemoryCache()
        cache.stored = [Article(id: 7, title: "cached", summary: "hi")]
        fake.nextResult = .failure(CacheError()) // would explode if called
        let vm = ArticlesVM(fetcher: fake, cache: cache, query: "swift")
        await vm.load()
        guard case .loaded(let articles) = vm.phase else {
            return XCTFail("expected loaded from cache")
        }
        XCTAssertEqual(articles, [Article(id: 7, title: "cached", summary: "hi")])
        XCTAssertEqual(fake.calls.count, 0, "cache hit must not call fetcher")
    }

    func test_force_refresh_bypasses_cache() async {
        let fake = StubFetcher()
        let cache = InMemoryCache()
        cache.stored = [Article(id: 7, title: "stale", summary: "old")]
        fake.nextResult = .success(articleJSON([
            Article(id: 8, title: "fresh", summary: "new")
        ]))
        let vm = ArticlesVM(fetcher: fake, cache: cache, query: "swift")
        await vm.load(forceRefresh: true)
        guard case .loaded(let articles) = vm.phase else {
            return XCTFail("expected loaded")
        }
        XCTAssertEqual(articles.first?.title, "fresh")
        XCTAssertEqual(fake.calls.count, 1)
        XCTAssertEqual(cache.stored?.first?.title, "fresh")
    }

    func test_empty_query_fails_without_calling_fetcher() async {
        let fake = StubFetcher()
        let cache = InMemoryCache()
        let vm = ArticlesVM(fetcher: fake, cache: cache, query: "   ")
        await vm.load()
        guard case .failed = vm.phase else {
            return XCTFail("expected failed")
        }
        XCTAssertEqual(fake.calls.count, 0)
    }

    func test_constructed_url_carries_query() async {
        let fake = StubFetcher()
        let cache = InMemoryCache()
        fake.nextResult = .success(Data("[]".utf8))
        let vm = ArticlesVM(fetcher: fake, cache: cache, query: "ios")
        await vm.load()
        XCTAssertEqual(fake.calls.count, 1)
        XCTAssertTrue(
            fake.calls[0].absoluteString.contains("q=ios"),
            "URL was \(fake.calls[0].absoluteString)"
        )
    }
}
```

<details><summary>Solution</summary>

```swift
import Foundation
import SwiftUI
import Observation

struct Article: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let summary: String

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case summary = "summary_text"
    }
}

protocol DataFetching {
    func fetch(_ url: URL) async throws -> Data
}

protocol ArticlesCache {
    func read() -> [Article]?
    func write(_ articles: [Article])
}

final class AppStorageArticlesCache: ArticlesCache {
    @AppStorage("articles_cache_blob") private var blob: Data = Data()

    func read() -> [Article]? {
        guard !blob.isEmpty else { return nil }
        return try? JSONDecoder().decode([Article].self, from: blob)
    }

    func write(_ articles: [Article]) {
        blob = (try? JSONEncoder().encode(articles)) ?? Data()
    }
}

@Observable
@MainActor
final class ArticlesVM {
    enum Phase: Equatable {
        case idle
        case loading
        case loaded([Article])
        case failed(String)
    }

    var phase: Phase = .idle
    private let fetcher: DataFetching
    private let cache: ArticlesCache
    private let query: String

    init(fetcher: DataFetching, cache: ArticlesCache, query: String) {
        self.fetcher = fetcher
        self.cache = cache
        self.query = query
    }

    func load(forceRefresh: Bool = false) async {
        if !forceRefresh, let cached = cache.read(), !cached.isEmpty {
            phase = .loaded(cached)
            return
        }
        guard let url = Self.makeURL(query: query) else {
            phase = .failed("Empty query")
            return
        }
        phase = .loading
        do {
            let data = try await fetcher.fetch(url)
            let articles = try JSONDecoder().decode([Article].self, from: data)
            cache.write(articles)
            phase = .loaded(articles)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }

    static func makeURL(query: String) -> URL? {
        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return nil }
        var c = URLComponents(string: "https://news.example.com/v1/articles")
        c?.queryItems = [URLQueryItem(name: "q", value: trimmed)]
        return c?.url
    }
}
```

Why: three seams, each justified by a test. `DataFetching` lets tests
inject a `StubFetcher` and assert the URL -- no real HTTP. `ArticlesCache`
lets tests pre-seed the cache (proving cache-hit skips network) or observe
writes; `AppStorageArticlesCache` is production wiring, not what the tests
use, because hitting `@AppStorage` from unit tests is brittle. Static
`makeURL` is its own seam for URL-shape tests.

The cache-read short-circuit must come *before* `phase = .loading` so a
cache hit never flickers through loading. `forceRefresh` skips the read
but still writes the response back, so the next non-forced load is a hit.
Decoding errors deliberately do not clobber the cache -- the test pins
this with `cache.writes == 0` on the bad-JSON path.

A view here is a thin shell over `vm.phase` (`switch` on the four cases,
`.task { await vm.load() }`); the tests grade the model. That separation
is the whole point.
</details>
