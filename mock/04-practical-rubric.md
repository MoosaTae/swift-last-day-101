# Practical Exam — Solution Sketch + Rubric

This file pairs with `03-practical-brief.md`. It shows a reference solution for each task and the rubric the grader applies.

---

## Solution Sketch (per task)

### Task 1 — Fix the broken navigation

**What was broken.** `.navigationDestination(for: Country.self)` was attached to the `NavigationStack` itself (outside its closure). The destination registry only works when the modifier is attached to a view *inside* the stack — typically the root content (`List`).

**Fix.** Move the modifier inside the `NavigationStack` closure, attached to the `List`.

```swift
NavigationStack {
    List(countries) { country in
        NavigationLink(value: country) {
            CountryRow(country: country, store: store)
        }
    }
    .navigationTitle("Countries")
    .navigationDestination(for: Country.self) { country in   // <-- moved here
        DetailView(country: country, store: store)
    }
    .overlay {
        if let msg = errorMessage {
            Text(msg).foregroundStyle(.red)
        }
    }
}
```

---

### Task 2 — Display the list correctly

**What was broken.** `List(countries) { ... }` requires `Country: Identifiable`. There was no `id` and no protocol conformance, so the project did not compile (and `NavigationLink(value:)` requires `Hashable`).

**Fix.** Add conformance and a computed `id`.

```swift
struct Country: Codable, Identifiable, Hashable {
    var id: String { cca2 }            // cca2 is the natural unique key

    let name: NameBlock
    let cca2: String
    let flag: String
    let region: String
    let population: Int

    struct NameBlock: Codable, Hashable {
        let common: String
        let official: String
    }
}
```

`Hashable` is auto-synthesized because every stored property is itself `Hashable` (`String`, `Int`, and the nested `NameBlock` we already marked `Hashable`).

---

### Task 3 — Swipe-to-delete + Edit button

**Why it required restructuring.** `.onDelete` is a `ForEach` modifier, not a `List` modifier. So `List(countries) { ... }` (which hides the inner ForEach) cannot accept `.onDelete`. Switch to `List { ForEach(...) { ... }.onDelete { ... } }`.

```swift
List {
    ForEach(countries) { country in
        NavigationLink(value: country) {
            CountryRow(country: country, store: store)
        }
    }
    .onDelete { offsets in
        countries.remove(atOffsets: offsets)
    }
}
.navigationTitle("Countries")
.toolbar {
    ToolbarItem(placement: .topBarLeading) { EditButton() }
    // (Task 6 adds the About button in .topBarTrailing here too)
}
.navigationDestination(for: Country.self) { country in
    DetailView(country: country, store: store)
}
```

---

### Task 4 — Persist favorites with @AppStorage

**Why a class can't use @AppStorage directly.** `@AppStorage` is a SwiftUI property wrapper designed for use inside a `View` (it subscribes the view to changes). In a plain `@Observable` class, you fall through to raw `UserDefaults`. The brief allows that.

```swift
@Observable
final class BookmarkStore {
    private let key = "favoriteIDs"

    var favoriteIDs: Set<String> = [] {
        didSet { save() }
    }

    init() {
        load()
    }

    func isFavorite(_ country: Country) -> Bool { favoriteIDs.contains(country.cca2) }

    func toggle(_ country: Country) {
        if favoriteIDs.contains(country.cca2) {
            favoriteIDs.remove(country.cca2)
        } else {
            favoriteIDs.insert(country.cca2)
        }
    }

    private func load() {
        guard
            let data = UserDefaults.standard.data(forKey: key),
            let decoded = try? JSONDecoder().decode(Set<String>.self, from: data)
        else { return }
        // assign without re-triggering save (didSet still fires, but write is idempotent)
        favoriteIDs = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(favoriteIDs) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}
```

(An alternative — fully-AppStorage — is to store the `Data` in a `View` via `@AppStorage("favoriteIDs") var favData = Data()` and bridge through computed properties. The rubric accepts either approach as long as the test passes.)

---

### Task 5 — Fetch data from a remote API

```swift
func load() async {
    guard let url = URL(string:
        "https://restcountries.com/v3.1/all?fields=name,cca2,flag,region,population"
    ) else {
        errorMessage = "Invalid URL"
        return
    }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        countries = try JSONDecoder().decode([Country].self, from: data)
    } catch {
        errorMessage = error.localizedDescription
    }
}
```

And on the `NavigationStack`'s root (or the `List`):

```swift
.task { await load() }
```

Key correctness points:
- `guard let url` (not `URL(string:)!`).
- `try await URLSession.shared.data(from:)` (the async variant).
- `[Country].self` because the response is a JSON array.
- Errors caught and surfaced via `errorMessage`, never crashed.

---

### Task 6 — Polish

**6a. Modifier order in DetailView.** The original chain `.cornerRadius(12).padding().background(...)` paints the background *outside* the rounded area, so the rounding is invisible. The canonical "card" order is **padding -> background -> cornerRadius**.

```swift
Text("Population: \(country.population)")
    .padding()
    .background(Color.blue.opacity(0.2))
    .cornerRadius(12)
    .foregroundStyle(.primary)
```

**6b. AboutView + sheet wiring.**

```swift
struct AboutView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View {
        NavigationStack {
            VStack(spacing: 12) {
                Text("Country Bookmarks v1.0").font(.title2).bold()
                Text("Built for the iOS final exam.")
                    .foregroundStyle(.secondary)
            }
            .padding()
            .navigationTitle("About")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
```

In `ContentView`, extend the toolbar and add the sheet:

```swift
.toolbar {
    ToolbarItem(placement: .topBarLeading) { EditButton() }
    ToolbarItem(placement: .topBarTrailing) {
        Button("About") { showAbout = true }
    }
}
.sheet(isPresented: $showAbout) { AboutView() }
```

---

## Grading Rubric

| Task | Points | What earns full credit | Common partial credit |
|---|---|---|---|
| 1 — Fix navigation | 3 | `.navigationDestination(for: Country.self)` is attached to a view *inside* the `NavigationStack` and tapping a row pushes `DetailView`. | 1 pt for identifying the bug in a comment; 2 pt if it pushes but title is missing. |
| 2 — Identifiable + Hashable | 3 | `Country` conforms to both, `id == cca2`, list compiles and renders. | 2 pt if only `Identifiable` (with explicit `id: \.cca2` on the List instead) but `NavigationLink(value:)` then fails to compile, costing 1 pt. |
| 3 — Delete + Edit | 3 | Explicit `ForEach` with `.onDelete`, `EditButton` in `.topBarLeading`, swipe and edit-mode both work. | 1 pt for `EditButton` only; 2 pt for delete only without EditButton. |
| 4 — AppStorage persistence | 4 | `favoriteIDs` survives a relaunch (test passes), `save()` runs on every mutation, `load()` runs in init, no force unwraps. | 2 pt if it persists but uses `[String]` instead of `Set<String>`; 1 pt if you encode but never decode on launch. |
| 5 — API fetch | 5 | Correct URL, `try await URLSession.shared.data(from:)`, decode `[Country]`, error caught and surfaced, `.task { await load() }` wired up. | 3 pt if it fetches but force-unwraps `URL(string:)!`; 2 pt if you used `.onAppear` without wrapping in `Task { }`; 4 pt if errors crash instead of setting `errorMessage`. |
| 6 — Polish | 2 | (1 pt) modifier order corrected so blue pill is rounded; (1 pt) AboutView complete with NavigationStack + Done button, sheet wired in ContentView. | Each sub-item is graded independently. |
| **Total** | **20** | | |

### Penalties (apply once across the whole submission)

- Any `!` force-unwrap on `URL(string:)`, `Int(_:)`, dictionary subscript, or `as!`: **-1 pt**.
- Project does not compile: cap at 10 pt regardless of partial work (graders run tests).
- Using `NavigationView` instead of `NavigationStack`: **-1 pt**.

---

## Self-grading checklist

- [ ] All seven tests pass: `testCountryIsIdentifiableByCCA2`, `testListShowsAllCountries`, `testDeleteRemovesItem`, `testEditModeReorders`, `testFavoritePersistsAcrossLaunches`, `testFetchDecodesCountries`, `testNavigationDestinationRegistered`.
- [ ] No force unwraps anywhere in submitted code.
- [ ] List uses an explicit `ForEach` so `.onDelete` compiles and runs.
- [ ] `BookmarkStore` saves on every mutation and loads in `init`.
- [ ] `.task { await load() }` is attached to a view inside `NavigationStack` (not the stack itself).
- [ ] `load()` catches all errors and writes them to `errorMessage`; never crashes on a bad URL or bad JSON.
- [ ] `DetailView`'s population pill is visibly rounded.
- [ ] About sheet opens from the top-right toolbar and dismisses on Done.
- [ ] `Country` conforms to `Identifiable` and `Hashable`, and `id == cca2`.
- [ ] No `NavigationView` anywhere — only `NavigationStack`.
