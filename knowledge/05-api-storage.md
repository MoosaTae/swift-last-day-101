# 05 — API Calls & On-Device Storage (AppStorage)

Open-book practical. Tests evaluated by Unit Tests. Two pillars:
1. Fetch JSON from an HTTP API with URLSession + Codable.
2. Persist values with @AppStorage (UserDefaults wrapper).

## 1. The 4-step API recipe (memorize)

```swift
func load() async {
    guard let url = URL(string: "https://api.example.com/items") else { return }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        let decoder = JSONDecoder()
        let result = try decoder.decode([Item].self, from: data)
        self.items = result
    } catch {
        self.errorMessage = error.localizedDescription
    }
}
```

Steps: (1) build URL, (2) do/catch, (3) try await URLSession.shared.data(from:), (4) JSONDecoder().decode(T.self, from: data).
`URLSession.shared.data(from: URL)` is `async throws` and returns `(Data, URLResponse)`.

## 2. Codable

A type that conforms to `Codable` (= `Decodable & Encodable`) decodes/encodes automatically when its stored properties are also Codable (Int, Double, String, Bool, Date, URL, arrays, nested Codables).

```swift
struct User: Codable {
    let id: Int
    let name: String
    let email: String
}
```

Decode:
```swift
let decoder = JSONDecoder()
let user  = try decoder.decode(User.self,   from: data)
let users = try decoder.decode([User].self, from: data)
```

### CodingKeys — JSON key mismatch

```swift
struct User: Codable {
    let id: Int
    let name: String
    let email: String
    enum CodingKeys: String, CodingKey {
        case id    = "Id"
        case name  = "Name"
        case email = "Email"
    }
}
```

Or for snake_case: `decoder.keyDecodingStrategy = .convertFromSnakeCase`.

### Date strategy (Open-Meteo Unix seconds)

```swift
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .secondsSince1970
```

## 3. Calling async from a SwiftUI View — `.task`

```swift
struct ItemListView: View {
    @State private var items: [Item] = []
    @State private var errorMessage: String?
    var body: some View {
        List(items) { Text($0.name) }
            .overlay { if let m = errorMessage { Text(m).foregroundStyle(.red) } }
            .task { await load() }
    }
    func load() async { /* see step 1 */ }
}
```

If forced to use `.onAppear`: `.onAppear { Task { await load() } }`.

## 4. Worked example: Open-Meteo Weather

```swift
struct WeatherResponse: Codable { let current: Current; let daily: Daily }
struct Current: Codable {
    let time: Date
    let temperature2m: Double
    let weatherCode: Int
    enum CodingKeys: String, CodingKey {
        case time
        case temperature2m = "temperature_2m"
        case weatherCode   = "weather_code"
    }
}
struct Daily: Codable {
    let time: [Date]
    let weatherCode: [Int]
    let tempMax: [Double]
    let tempMin: [Double]
    let precipMax: [Int]
    enum CodingKeys: String, CodingKey {
        case time
        case weatherCode = "weather_code"
        case tempMax     = "temperature_2m_max"
        case tempMin     = "temperature_2m_min"
        case precipMax   = "precipitation_probability_max"
    }
}

@MainActor
final class WeatherVM: ObservableObject {
    @Published var data: WeatherResponse?
    @Published var error: String?
    func load() async {
        let s = "https://api.open-meteo.com/v1/forecast?latitude=13.7467&longitude=100.5392&timezone=Asia/Bangkok&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=7&timeformat=unixtime"
        guard let url = URL(string: s) else { error = "bad url"; return }
        do {
            let (bytes, _) = try await URLSession.shared.data(from: url)
            let dec = JSONDecoder()
            dec.dateDecodingStrategy = .secondsSince1970
            data = try dec.decode(WeatherResponse.self, from: bytes)
        } catch { self.error = error.localizedDescription }
    }
}
```

## 5. Error handling

```swift
@State private var phase: Phase = .idle
enum Phase { case idle, loading, loaded([Item]), failed(String) }

func load() async {
    phase = .loading
    guard let url = URL(string: urlString) else { phase = .failed("Invalid URL"); return }
    do {
        let (data, resp) = try await URLSession.shared.data(from: url)
        if let h = resp as? HTTPURLResponse, !(200..<300).contains(h.statusCode) {
            phase = .failed("HTTP \(h.statusCode)"); return
        }
        let items = try JSONDecoder().decode([Item].self, from: data)
        phase = .loaded(items)
    } catch { phase = .failed(error.localizedDescription) }
}
```

## 6. @AppStorage

Property wrapper around UserDefaults. Auto-persists and re-renders the view.
Supported: `Bool`, `Int`, `Double`, `String`, `URL`, `Data`, `RawRepresentable` enums.

4 steps:
1. Add `@AppStorage(...)`
2. UserDefaults key
3. Variable name + default value
4. Use like `@State`; bind with `$name`

```swift
struct SettingsView: View {
    @AppStorage("isDarkMode") var isDarkMode: Bool = false
    @AppStorage("username")   var username: String = ""
    var body: some View {
        Form {
            Toggle("Dark mode", isOn: $isDarkMode)
            TextField("Username", text: $username)
            Text("Hello, \(username)")
        }
    }
}
```

### Persisting custom Codable

`@AppStorage` only supports primitives — wrap your Codable as `Data`. Note: a computed property with `set` must live inside a struct/class; pasting just the getter/setter at file scope or inside another computed `var` won't compile.

```swift
struct Profile: Codable { var name: String; var age: Int }

struct ProfileView: View {
    @AppStorage("profile") private var profileData: Data = Data()

    private var profile: Profile {
        get { (try? JSONDecoder().decode(Profile.self, from: profileData)) ?? Profile(name: "", age: 0) }
        nonmutating set { profileData = (try? JSONEncoder().encode(newValue)) ?? Data() }
    }

    var body: some View {
        VStack {
            Text("Hi, \(profile.name)")
            Button("Set") { profile = Profile(name: "Tae", age: 21) }
        }
    }
}
```

`nonmutating set` is required because the setter writes to `@AppStorage` (which has its own storage, not `self`), and the View struct is value-typed.

### Lower-level UserDefaults

```swift
UserDefaults.standard.set(true, forKey: "didOnboard")
let did = UserDefaults.standard.bool(forKey: "didOnboard")
UserDefaults.standard.set("alex", forKey: "user")
let s = UserDefaults.standard.string(forKey: "user")
UserDefaults.standard.removeObject(forKey: "user")
```

`@AppStorage` triggers SwiftUI re-renders. `UserDefaults` does NOT.

## 7. Settings worked example (toggle + username)

```swift
struct SettingsView: View {
    @AppStorage("notificationsEnabled") var notifications: Bool = true
    @AppStorage("username") var username: String = ""
    var body: some View {
        Form {
            Section("Profile")        { TextField("Username", text: $username) }
            Section("Notifications")  { Toggle("Enable", isOn: $notifications) }
        }
    }
}
```

In a test:
```swift
UserDefaults.standard.set("alice", forKey: "username")
XCTAssertEqual(UserDefaults.standard.string(forKey: "username"), "alice")
```

## 8. Common pitfalls

- No `: Codable` on model -> decode fails to compile.
- Force-unwrap `URL(string:)!`. Use `guard let`.
- `.onAppear { await load() }` does not compile. Use `.task` or wrap in `Task { }`.
- `await` in non-async context without `Task { }`.
- JSON key mismatch -> declare `CodingKeys` or use `.convertFromSnakeCase`.
- Date decode failure -> set `dateDecodingStrategy`.
- `@AppStorage` with array/struct -> encode to `Data` first.
- Mutating `@Published` off main actor -> mark VM `@MainActor`.
- `decode([Foo].self,...)` for array endpoints, not `Foo.self`.

## 9. Cheat sheet

```swift
struct Foo: Codable, Identifiable { let id: Int; let name: String }

func load() async {
    guard let url = URL(string: API) else { return }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        items = try JSONDecoder().decode([Foo].self, from: data)
    } catch { print(error) }
}
.task { await load() }

@AppStorage("key")  var flag: Bool = false
@AppStorage("name") var name: String = ""
```
