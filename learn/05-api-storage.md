# 05 — API Calls and On-Device Storage

A tutorial-style walkthrough. Read top to bottom once. The cheat-sheet bullets are still here, but every code block is annotated and every concept is preceded by the mental model you need to actually understand it.

---

## 1. Mental model: two halves of "data in an app"

An iOS app deals with data in two fundamentally different places:

```
                +--------------------------+
                |        YOUR APP          |
                |                          |
  +----------+  |   +----------------+     |   +----------------+
  | NETWORK  |<---->|  in-memory     |<--->|  ON-DEVICE      |
  |  (HTTP)  |  |   |  @State / VM   |     |  storage        |
  +----------+  |   +----------------+     |  (UserDefaults, |
                |                          |   files, KeyChain
                +--------------------------+   SwiftData)
```

- **Network half (left).** The app sends an HTTP request, waits for bytes, decodes them into Swift values. You don't own the data; the server does. This is what URLSession + Codable solves.
- **Storage half (right).** The app remembers things between launches: a toggle setting, a username, a saved list, a cached download. You do own this data. AppStorage / UserDefaults / files / SwiftData solve this.

Both halves share a problem: **time**. Networks are slow (50–2000 ms). Disk is fast but still not instant. If you do that work on the main thread, the UI freezes. So Swift gives you `async/await` to write code that **pauses and waits without blocking the UI**.

> Mental model for `async/await`: think of `await` as "I'm going to step off the treadmill for a bit; let other UI work run; wake me up when the answer is ready." The function literally suspends, returns control to the system, and resumes later on a continuation. It is *not* a thread sleep.

```
   main thread timeline (without async)
   |---fetch (frozen UI)----------------|---paint---|

   main thread timeline (with await)
   |--start fetch--|       (UI stays live)        |--resume--|--paint--|
                   \________ awaiting __________/
                          (network in progress)
```

This file teaches the network half first because it forces you to internalize async. Then storage, where async mostly disappears again.

---

## 2. async / await primer

### 2.1 Why we no longer use completion handlers

The pre-Swift-5.5 world looked like this:

```swift
URLSession.shared.dataTask(with: url) { data, response, error in
    // closure runs later, on a background thread
    // you nest more closures here, then dispatch back to main, etc.
}.resume()
```

This works but creates "callback hell": nested closures, manual `DispatchQueue.main.async`, easy to forget error paths, hard to compose. `async/await` lets you write the same logic top-to-bottom:

```swift
let (data, response) = try await URLSession.shared.data(from: url)
// you are now back here when the network is done. straight-line code.
```

Cleaner. Errors propagate via `throws`. The compiler enforces that you can't accidentally call slow code from a place that can't wait.

### 2.2 What the keywords actually mean

| Keyword | Meaning |
|---|---|
| `async` on a function | "This function may suspend. Callers must `await` it." |
| `await` on a call | "Pause here until the async call resumes. Yield the thread in the meantime." |
| `throws` / `try` | Independent of async. A function may throw an error; callers use `try`. |
| `async throws` | Both: may suspend and may throw. |

Rules of where you can write `await`:
- Inside another `async` function. (It propagates up.)
- Inside a `Task { ... }` block. (Task is the bridge from sync to async.)
- Inside the SwiftUI `.task { ... }` view modifier. (A Task tied to view lifetime.)

You **cannot** write `await` in a plain `func body() { ... }` synchronous context. Compiler error.

### 2.3 `.task { }` vs `Task { }`

```swift
struct V: View {
    var body: some View {
        Text("hi")
            .task { await load() }            // tied to view appear/disappear
            .onAppear { Task { await load() } } // fallback if you must use onAppear
    }
}
```

| | `.task { }` modifier | `Task { }` block |
|---|---|---|
| Where it lives | View modifier | Anywhere (button action, init, etc.) |
| Cancellation | Auto-cancelled when the view disappears | You manage it |
| Identity | Re-runs when `id:` argument changes | Doesn't restart on view updates |
| Use for | "Load data when this view appears" | One-off fire-and-forget from sync code |

**Rule of thumb:** use `.task` for view-lifecycle work; only fall back to `onAppear { Task { ... } }` if you have a reason.

---

## 3. URLSession + URL

### 3.1 Mental model

`URLSession.shared` is the system's default HTTP client. It hands you back two things on success: the raw response **bytes** (`Data`) and metadata about the response (`URLResponse`, often castable to `HTTPURLResponse` for status code).

```
  String  --URL(string:)-->  URL?  --URLSession.data(from:)-->  (Data, URLResponse)
                              |                                   |
                              | nil if malformed                  | bytes + status
                              v                                   v
                          guard let                          decode + render
```

### 3.2 Building a URL safely

`URL(string:)` returns an **optional**. Always unwrap with `guard let`. Force-unwrapping crashes the whole app on a typo.

```swift
// BAD: crashes if the string has a stray character or is empty
let url = URL(string: userTyped)!

// GOOD: bail out gracefully
guard let url = URL(string: userTyped) else {
    errorMessage = "Invalid URL"
    return
}
```

### 3.3 The full async fetch — annotated

```swift
func load() async {                                    // async: callers must await
    // Step 1 — turn String into URL?
    guard let url = URL(string: "https://api.example.com/items") else { return }

    // Step 2 — wrap the throwing calls
    do {
        // Step 3 — `try await` because data(from:) is `async throws`.
        // Returns (Data, URLResponse). We ignore the response with `_`.
        let (data, _) = try await URLSession.shared.data(from: url)

        // Step 4 — decode bytes into Swift values
        let decoder = JSONDecoder()
        let result  = try decoder.decode([Item].self, from: data) // Item: Codable

        // Step 5 — assign to @State / @Published. Triggers UI re-render.
        self.items = result
    } catch {
        // Any throw above lands here: bad URL bytes, network down, decode mismatch.
        self.errorMessage = error.localizedDescription
    }
}
```

Memorize the shape: **(1) build URL, (2) do/catch, (3) try await URLSession.shared.data(from:), (4) JSONDecoder().decode(T.self, from: data).**

### 3.4 URLSession variants you might see

| Call | Returns | When to use |
|---|---|---|
| `URLSession.shared.data(from: url)` | `(Data, URLResponse)` | GET with default settings — 95% of what you need |
| `URLSession.shared.data(for: request)` | `(Data, URLResponse)` | Custom `URLRequest` (POST, headers, body) |
| `URLSession.shared.download(from:)` | `(URL, URLResponse)` | Stream a big file to disk instead of holding in RAM |
| `URLSession.shared.upload(for:from:)` | `(Data, URLResponse)` | Multipart / file upload |

For the exam, you almost certainly only need `data(from:)`.

### 3.5 Inspecting the HTTP status code

```swift
let (data, resp) = try await URLSession.shared.data(from: url)
// URLResponse is the abstract base. HTTP servers give you HTTPURLResponse.
if let http = resp as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
    throw URLError(.badServerResponse)        // bail with an error caught by the catch
}
```

### 3.6 Lifecycle ASCII

```
  View appears
       |
       v
  .task starts coroutine
       |
       v
  guard URL ok ----> no ----> set errorMessage, return
       |
       v
  try await data(from:) ----> network error ---> catch
       |                                            ^
       v                                            |
  try decode([Item].self) -----> mismatch ----------+
       |
       v
  items = result   --->  @State changes  --->  body re-renders  --->  List redraws
```

---

## 4. Codable

### 4.1 Why two protocols? (`Decodable` and `Encodable`)

A type might only need one direction. A read-only API response is `Decodable` only. A request body you send is `Encodable` only. `Codable` is just the typealias `Decodable & Encodable` for the common case where you need both.

```
              JSON bytes
                 |
                 v
         JSONDecoder.decode    ---->   struct (Decodable)
                                 ^
                                 |
         JSONEncoder.encode     <----  struct (Encodable)
                 |
                 v
              JSON bytes
```

### 4.2 Auto-synthesis: how the magic works

If every stored property is itself Codable (Int, Double, String, Bool, Date, URL, Data, arrays of Codables, nested Codable structs, optionals of Codables), the compiler writes the encode/decode code for you. You write zero boilerplate.

```swift
struct User: Codable {     // = Decodable & Encodable
    let id: Int            // Int is Codable
    let name: String       // String is Codable
    let email: String      // String is Codable
}                          // compiler generates init(from:) and encode(to:)
```

### 4.3 Decoding — single object vs array

The shape of `T.self` you pass tells the decoder what to expect.

```swift
let decoder = JSONDecoder()

// JSON: { "id": 1, "name": "..", "email": ".." }
let user  = try decoder.decode(User.self, from: data)

// JSON: [ { ... }, { ... } ]
let users = try decoder.decode([User].self, from: data)
```

Mismatch (passing `User.self` when the JSON is an array) throws `DataCorrupted` / `typeMismatch`. This is one of the most common bugs.

### 4.4 CodingKeys — when JSON keys differ

JSON might say `"Email"` (capitalized), `"user_id"` (snake), or `"temperature_2m"` (suffix). Swift conventions want camelCase. Bridge the two with `CodingKeys`:

```swift
struct User: Codable {
    let id: Int
    let name: String
    let email: String

    // Tells the decoder: "for property `id`, look up JSON key `Id`", etc.
    enum CodingKeys: String, CodingKey {
        case id    = "Id"
        case name  = "Name"
        case email = "Email"
    }
}
```

**You must list every property** in `CodingKeys` once you provide it (or use the property name as the raw value to leave it alone).

### 4.5 Snake_case shortcut

If the only difference is snake_case vs camelCase across many fields, skip CodingKeys and use a strategy:

```swift
let dec = JSONDecoder()
dec.keyDecodingStrategy = .convertFromSnakeCase   // user_id -> userId, etc.
```

### 4.6 Date strategies

JSON has no native Date type. Servers send dates as ISO strings, Unix seconds, etc. Tell the decoder:

```swift
let dec = JSONDecoder()
dec.dateDecodingStrategy = .secondsSince1970      // Open-Meteo style
// other options:
// .iso8601               -> "2026-05-09T14:00:00Z"
// .millisecondsSince1970 -> 1715260800000
// .formatted(formatter)  -> custom DateFormatter
```

### 4.7 Nested structures

Nesting is automatic — decoders recurse.

```swift
struct WeatherResponse: Codable {
    let current: Current
    let daily:   Daily
}
struct Current: Codable {
    let time: Date
    let temperature2m: Double          // JSON: temperature_2m
    let weatherCode: Int                // JSON: weather_code
    enum CodingKeys: String, CodingKey {
        case time
        case temperature2m = "temperature_2m"
        case weatherCode   = "weather_code"
    }
}
struct Daily: Codable {
    let time: [Date]
    let weatherCode: [Int]
    let tempMax:    [Double]
    let tempMin:    [Double]
    let precipMax:  [Int]
    enum CodingKeys: String, CodingKey {
        case time
        case weatherCode = "weather_code"
        case tempMax     = "temperature_2m_max"
        case tempMin     = "temperature_2m_min"
        case precipMax   = "precipitation_probability_max"
    }
}
```

### 4.8 Encode/decode flow diagram

```
  +-----------+   encode    +-------------+   write    +----------+
  |  struct   | ----------> |   Data      | ---------> |  network |
  |  (Codable)|             |  (JSON utf8)|            |   /file  |
  +-----------+             +-------------+            +----------+
        ^                          |
        |  decode                  |  read
        +--------------------------+
```

---

## 5. Wiring API into a View

The pattern: a `@State` model array, an async `load()` function, and `.task { await load() }` on the view.

### 5.1 Minimal version

```swift
struct ItemListView: View {
    @State private var items: [Item] = []
    @State private var errorMessage: String?

    var body: some View {
        List(items) { item in
            Text(item.name)
        }
        // overlay paints over the list when an error message is set
        .overlay {
            if let m = errorMessage {
                Text(m).foregroundStyle(.red)
            }
        }
        // .task runs when this view appears, cancelled if it disappears
        .task { await load() }
    }

    func load() async {
        guard let url = URL(string: "https://api.example.com/items") else {
            errorMessage = "Bad URL"; return
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            items = try JSONDecoder().decode([Item].self, from: data)
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
```

If the assignment forces you to use `.onAppear`:

```swift
.onAppear { Task { await load() } }   // bridge: Task lets you call await from a sync closure
```

### 5.2 Loading + error states with an enum (Phase pattern)

A single `Phase` enum captures all four screen states with one `@State` — much cleaner than three booleans.

```swift
enum Phase {
    case idle                       // before .task fires
    case loading                    // network in flight
    case loaded([Item])             // success, with payload
    case failed(String)             // failure, with message
}

struct ItemListView: View {
    @State private var phase: Phase = .idle
    let urlString = "https://api.example.com/items"

    var body: some View {
        Group {
            switch phase {
            case .idle, .loading:
                ProgressView()                             // spinner
            case .loaded(let items):
                List(items) { Text($0.name) }              // success UI
            case .failed(let msg):
                Text(msg).foregroundStyle(.red)            // error UI
            }
        }
        .task { await load() }
    }

    func load() async {
        phase = .loading                                   // flip to spinner
        guard let url = URL(string: urlString) else {
            phase = .failed("Invalid URL"); return
        }
        do {
            let (data, resp) = try await URLSession.shared.data(from: url)
            // validate HTTP status before trusting the bytes
            if let h = resp as? HTTPURLResponse, !(200..<300).contains(h.statusCode) {
                phase = .failed("HTTP \(h.statusCode)"); return
            }
            let items = try JSONDecoder().decode([Item].self, from: data)
            phase = .loaded(items)
        } catch {
            phase = .failed(error.localizedDescription)
        }
    }
}
```

### 5.3 ViewModel version (when logic gets bigger)

```swift
@MainActor                                  // guarantee @Published mutations on main thread
final class WeatherVM: ObservableObject {
    @Published var data: WeatherResponse?
    @Published var error: String?

    func load() async {
        let s = "https://api.open-meteo.com/v1/forecast?latitude=13.7467&longitude=100.5392&timezone=Asia/Bangkok&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=7&timeformat=unixtime"
        guard let url = URL(string: s) else { error = "bad url"; return }
        do {
            let (bytes, _) = try await URLSession.shared.data(from: url)
            let dec = JSONDecoder()
            dec.dateDecodingStrategy = .secondsSince1970     // Unix seconds -> Date
            data = try dec.decode(WeatherResponse.self, from: bytes)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
```

Use it from a view:

```swift
struct WeatherView: View {
    @StateObject private var vm = WeatherVM()
    var body: some View {
        VStack { /* render vm.data */ }
            .task { await vm.load() }
    }
}
```

`@MainActor` on the class is the ergonomic answer to "where do I update the UI?" — every method runs on the main actor, so `@Published` mutations always happen on the right thread.

---

## 6. @AppStorage

### 6.1 What it actually is

`@AppStorage` is a **property wrapper** with two jobs:

1. Read/write a value in `UserDefaults.standard` under a string key.
2. Subscribe the view to changes, so when the value changes the view re-renders.

```
   @AppStorage("isDarkMode") var isDarkMode: Bool = false

         |                    |
         v                    v
   UserDefaults           SwiftUI re-render hook
   key = "isDarkMode"     (when the value changes, body() runs again)
```

Think of it as: "a `@State` variable that survives app relaunch, stored under a key in UserDefaults."

### 6.2 Supported types

`Bool`, `Int`, `Double`, `String`, `URL`, `Data`, and `RawRepresentable` enums (raw value being one of the above). Recent Swift versions widen this slightly, but for the exam stick to the list. **Arrays and structs do NOT work directly** — you must encode them to `Data` first.

### 6.3 The 4-step recipe

1. Add the `@AppStorage(...)` wrapper.
2. Pass the UserDefaults key string.
3. Declare variable name + type + default value.
4. Use it like `@State`. Bind in views with `$name`.

```swift
struct SettingsView: View {
    // 1+2+3: wrapper, key, var, default
    @AppStorage("isDarkMode") var isDarkMode: Bool = false
    @AppStorage("username")   var username:  String = ""

    var body: some View {
        Form {
            Toggle("Dark mode", isOn: $isDarkMode)   // 4: bind with $
            TextField("Username", text: $username)
            Text("Hello, \(username)")               // re-renders on every keystroke
        }
    }
}
```

### 6.4 Why "default value" matters

The default is what you read **the first time** (and any time the key is unset). It is also the value you fall back to if you delete the entry. There is no automatic "reset all" — to reset, set the property back to its default or call `UserDefaults.standard.removeObject(forKey:)`.

### 6.5 Persisting a custom Codable struct

AppStorage doesn't accept `Profile` directly, but it accepts `Data`. So encode/decode by hand:

```swift
struct Profile: Codable { var name: String; var age: Int }

struct ProfileView: View {
    // raw bytes in UserDefaults under key "profile"
    @AppStorage("profile") private var profileData: Data = Data()

    // computed wrapper that decodes/encodes on access
    var profile: Profile {
        get {
            (try? JSONDecoder().decode(Profile.self, from: profileData))
                ?? Profile(name: "", age: 0)        // fallback when bytes empty/corrupt
        }
        set {
            profileData = (try? JSONEncoder().encode(newValue)) ?? Data()
        }
    }

    var body: some View {
        Text("\(profile.name), \(profile.age)")
    }
}
```

Note this only works in views/types where you can declare a computed property; for cross-screen sharing, use a `@MainActor` view-model with `@Published` and persist on `didSet`.

### 6.6 What NOT to put in AppStorage

| Don't store | Why |
|---|---|
| Photos, videos, large JSON blobs | UserDefaults is loaded into memory at launch. Bloats startup. |
| Auth tokens, passwords, API keys | UserDefaults is plaintext on the device. Use Keychain instead. |
| Per-record relational data | Use SwiftData / Core Data / SQLite. |

### 6.7 Settings worked example (toggle + username)

```swift
struct SettingsView: View {
    @AppStorage("notificationsEnabled") var notifications: Bool = true
    @AppStorage("username")             var username:      String = ""

    var body: some View {
        Form {
            Section("Profile")       { TextField("Username", text: $username) }
            Section("Notifications") { Toggle("Enable",      isOn: $notifications) }
        }
    }
}
```

In a unit test, since AppStorage just wraps UserDefaults:

```swift
UserDefaults.standard.set("alice", forKey: "username")
XCTAssertEqual(UserDefaults.standard.string(forKey: "username"), "alice")
```

---

## 7. UserDefaults (raw)

### 7.1 What it is

A key/value store backed by a plist file in your app sandbox. Accessed via the singleton `UserDefaults.standard`. AppStorage wraps this. You can use it directly when you don't need SwiftUI re-rendering or you're outside a View.

```swift
UserDefaults.standard.set(true,  forKey: "didOnboard")     // write Bool
let did = UserDefaults.standard.bool(forKey: "didOnboard") // read Bool

UserDefaults.standard.set("alex", forKey: "user")          // write String
let s = UserDefaults.standard.string(forKey: "user")       // read String? (nil if unset)

UserDefaults.standard.removeObject(forKey: "user")         // delete the entry
```

### 7.2 AppStorage vs raw UserDefaults

| | `@AppStorage` | `UserDefaults.standard` |
|---|---|---|
| Where you can use it | SwiftUI Views (and SceneStorage etc.) | Anywhere |
| Triggers SwiftUI re-render | Yes | No |
| Default value | Required | Returns `nil` / 0 / false if unset |
| Boilerplate | One line | A few lines per access |
| Best for | Bound user settings, light prefs | Logic/services that aren't views |

**Rule:** if a SwiftUI view needs to react to the value, use `@AppStorage`. Otherwise raw UserDefaults is fine.

---

## 8. Other storage briefly

You probably don't need to write code for these on the exam, but knowing the boundaries lets you pick the right tool when asked.

**File-based JSON (FileManager + Codable).** When you want to save a moderately sized list (a hundred to-do items, a downloaded JSON blob) without a real database. Encode your `Codable` model to `Data` with `JSONEncoder`, write to a URL inside `FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)`, read back with `Data(contentsOf:)` and `JSONDecoder.decode`. Heavier than UserDefaults, lighter than a database.

**Keychain.** The right place for secrets: tokens, passwords, biometric-protected values. Encrypted at rest, optionally tied to device unlock. The API is verbose (`SecItemAdd` etc.), so most apps wrap it in a small helper or use a library. Never put secrets in UserDefaults.

**SwiftData / Core Data.** Object-graph persistence with relationships, queries, undo, iCloud sync. Use when you have *records* (entities with fields and relations) and need filtering/sorting/searching. SwiftData is the modern Swift-native API; Core Data is the older, more powerful counterpart it sits on top of.

```
  small flag/string  ----->  AppStorage / UserDefaults
  medium JSON blob   ----->  Documents directory file
  secret             ----->  Keychain
  relational records ----->  SwiftData / Core Data
  remote source      ----->  URLSession (in addition to local cache)
```

---

## 9. Common pitfalls — and why each trips students up

- **Forgetting `: Codable` on the model.** `decode(MyType.self, …)` won't even compile. Compiler error mentions `Decodable` conformance — that's the hint.
- **Force-unwrapping `URL(string:)!`.** A single typo (or a user-supplied string) crashes the entire app on launch. Always `guard let`.
- **`.onAppear { await load() }`.** `onAppear` takes a synchronous closure, so the compiler rejects `await`. Either use `.task { await load() }` or wrap: `.onAppear { Task { await load() } }`.
- **`await` in non-async context without `Task`.** Same rule, different scene: button actions, init, sync funcs all need `Task { … }` to host the await.
- **JSON key mismatch.** The decoder throws `keyNotFound`. Either declare `CodingKeys` for the offending fields or set `decoder.keyDecodingStrategy = .convertFromSnakeCase`.
- **Date decode failure.** Dates come as strings or Unix seconds. Without `dateDecodingStrategy`, you get a typeMismatch. Pick the strategy that matches the API.
- **`@AppStorage` with array/struct.** Compiler error: not a supported type. Encode to `Data` with `JSONEncoder`, store the `Data`, decode on read.
- **Mutating `@Published` off the main actor.** Symptoms: "Publishing changes from background threads" purple warning, occasional UI flicker. Fix: mark the view-model `@MainActor`.
- **`decode([Foo].self, …)` vs `decode(Foo.self, …)`.** If the JSON top-level is `[ … ]`, you need the array form. Mistakes here yield `typeMismatch(expected to decode Array but found a dictionary instead)` or vice versa.
- **Calling fetch in `init()` instead of `.task { }`.** `init` runs every time SwiftUI reconstructs the view (which is often). You'll fire dozens of network calls. `.task` runs once per appear.
- **Storing large blobs in AppStorage.** UserDefaults reads into memory at launch. A 5 MB JSON makes app start slow and bloats the plist. Use a Documents file instead.
- **Treating `await` as backgrounding.** `await` does not move work to a background thread by itself. `URLSession.data(from:)` does its own work off-main, but if you write `try await heavyCPULoop()` you're still on the calling thread. Use `Task.detached` or proper actors for CPU work.

---

## 10. Quick recall card

```swift
// ----- Network + decode ------------------------------------------------------
struct Foo: Codable, Identifiable { let id: Int; let name: String }

@State private var items: [Foo] = []
@State private var errorMessage: String?

func load() async {
    guard let url = URL(string: API) else { return }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        items = try JSONDecoder().decode([Foo].self, from: data)
    } catch {
        errorMessage = error.localizedDescription
    }
}

var body: some View {
    List(items) { Text($0.name) }
        .task { await load() }
}

// ----- Codable variants ------------------------------------------------------
enum CodingKeys: String, CodingKey { case id, userName = "user_name" }
let dec = JSONDecoder()
dec.keyDecodingStrategy  = .convertFromSnakeCase
dec.dateDecodingStrategy = .secondsSince1970   // or .iso8601, .formatted(...)

// ----- HTTP status guard -----------------------------------------------------
if let h = resp as? HTTPURLResponse, !(200..<300).contains(h.statusCode) { /* error */ }

// ----- AppStorage ------------------------------------------------------------
@AppStorage("flag") var flag: Bool   = false
@AppStorage("name") var name: String = ""
// supported: Bool, Int, Double, String, URL, Data, RawRepresentable enums

// ----- UserDefaults raw ------------------------------------------------------
UserDefaults.standard.set(true, forKey: "didOnboard")
let did = UserDefaults.standard.bool(forKey: "didOnboard")
UserDefaults.standard.removeObject(forKey: "user")

// ----- Phase pattern ---------------------------------------------------------
enum Phase { case idle, loading, loaded([Foo]), failed(String) }

// ----- onAppear bridge if forced --------------------------------------------
.onAppear { Task { await load() } }

// ----- VM with main actor ----------------------------------------------------
@MainActor final class VM: ObservableObject {
    @Published var data: Foo?
    @Published var error: String?
    func load() async { /* ... */ }
}
```

If you remember only one shape, remember this:

```swift
guard let url = URL(string: s) else { return }
do {
    let (data, _) = try await URLSession.shared.data(from: url)
    items = try JSONDecoder().decode([Foo].self, from: data)
} catch { errorMessage = error.localizedDescription }
```

That's the entire network half of the exam, in seven lines.
