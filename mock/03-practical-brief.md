# Mock Practical Exam (Open Book)
**Time: 120 minutes | Total: 20 points**

You will build and refactor a small "Country Bookmarks" iOS app. The starter project compiles but is broken in deliberate ways and missing several features. Work through the tasks in order. Your grade is determined by both completeness and the unit tests at the bottom of this brief.

---

## Setup — Starter Code (provided)

Files provided in the Xcode project:

- `Models.swift` — the `Country` model and a `BookmarkStore` `@Observable` class.
- `ContentView.swift` — the root `NavigationStack` and country list. Has bugs.
- `DetailView.swift` — country detail screen. Mostly stubbed.
- `AboutView.swift` — empty stub for Task 6.
- `BookmarksAppTests.swift` — unit tests you must make pass.

### `Models.swift`

```swift
import Foundation
import Observation

// A single country, decoded from https://restcountries.com/v3.1/all?fields=name,cca2,flag,region,population
struct Country: Codable {
    // TODO (Task 2): make this type Identifiable AND Hashable.
    // The unique id should come from `cca2` (the 2-letter country code, e.g. "TH", "JP").

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

@Observable
final class BookmarkStore {
    // The IDs (cca2 codes) the user has favorited.
    // Persisted across launches via @AppStorage in Task 4.
    var favoriteIDs: Set<String> = []

    func isFavorite(_ country: Country) -> Bool {
        favoriteIDs.contains(country.cca2)
    }

    func toggle(_ country: Country) {
        if favoriteIDs.contains(country.cca2) {
            favoriteIDs.remove(country.cca2)
        } else {
            favoriteIDs.insert(country.cca2)
        }
    }

    // TODO (Task 4): load() reads the JSON-encoded Set<String> from AppStorage
    //                and assigns it to favoriteIDs.
    // TODO (Task 4): save() encodes favoriteIDs to JSON and writes it to AppStorage
    //                under the key "favoriteIDs".
}
```

### `ContentView.swift`

```swift
import SwiftUI

struct ContentView: View {
    @State private var store = BookmarkStore()
    @State private var countries: [Country] = []
    @State private var errorMessage: String?
    @State private var showAbout = false

    var body: some View {
        NavigationStack {
            // BUG (Task 2): the list shows nothing even when `countries` is non-empty.
            List(countries) { country in
                NavigationLink(value: country) {
                    CountryRow(country: country, store: store)
                }
            }
            // BUG (Task 1): the destination is registered in the wrong place.
            .navigationTitle("Countries")
            .overlay {
                if let msg = errorMessage {
                    Text(msg).foregroundStyle(.red)
                }
            }
        }
        .navigationDestination(for: Country.self) { country in
            DetailView(country: country, store: store)
        }
        // TODO (Task 5): add .task { await load() } here.
        // TODO (Task 6): add a toolbar with an "About" button that toggles showAbout,
        //                and a .sheet(isPresented:) presenting AboutView.
    }

    func load() async {
        // TODO (Task 5): fetch from
        // https://restcountries.com/v3.1/all?fields=name,cca2,flag,region,population
        // decode into [Country], assign to `countries`.
        // On any failure, set errorMessage.
    }
}

struct CountryRow: View {
    let country: Country
    var store: BookmarkStore

    var body: some View {
        HStack {
            Text(country.flag).font(.largeTitle)
            VStack(alignment: .leading) {
                Text(country.name.common).font(.headline)
                Text(country.region).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            if store.isFavorite(country) {
                Image(systemName: "star.fill").foregroundStyle(.yellow)
            }
        }
    }
}
```

### `DetailView.swift`

```swift
import SwiftUI

struct DetailView: View {
    let country: Country
    @Bindable var store: BookmarkStore

    var body: some View {
        // BUG (Task 6): the modifier order is wrong — the corner radius does not appear
        //               on the colored banner. Fix it without changing the colors.
        VStack(spacing: 16) {
            Text(country.flag).font(.system(size: 96))
            Text(country.name.official).font(.title2).bold()
            Text("Population: \(country.population)")
                .cornerRadius(12)
                .padding()
                .background(Color.blue.opacity(0.2))
                .foregroundStyle(.primary)

            Button(store.isFavorite(country) ? "Unfavorite" : "Favorite") {
                store.toggle(country)
            }
            .buttonStyle(.borderedProminent)

            Spacer()
        }
        .padding()
        .navigationTitle(country.name.common)
    }
}
```

### `AboutView.swift`

```swift
import SwiftUI

struct AboutView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        // TODO (Task 6): show a NavigationStack containing
        //   - Title "About"
        //   - Text "Country Bookmarks v1.0"
        //   - A "Done" toolbar button (placement: .topBarTrailing) that calls dismiss().
        Text("TODO")
    }
}
```

### `BookmarksAppTests.swift` (read-only — do not edit)

```swift
import XCTest
@testable import Bookmarks

final class BookmarksAppTests: XCTestCase {
    func testCountryIsIdentifiableByCCA2() { /* ... see Tests section ... */ }
    func testListShowsAllCountries() { /* ... */ }
    func testDeleteRemovesItem() { /* ... */ }
    func testEditModeReorders() { /* ... */ }
    func testFavoritePersistsAcrossLaunches() { /* ... */ }
    func testFetchDecodesCountries() { /* ... */ }
    func testNavigationDestinationRegistered() { /* ... */ }
}
```

---

## Tasks (work through in order)

### Task 1 — Fix the broken navigation (3 pt)

The `.navigationDestination(for: Country.self)` is attached *outside* the `NavigationStack`, so taps on a row do nothing. Move it so it is registered on the root content (the `List`) inside the `NavigationStack`.

Hint: `.navigationDestination(for:)` must be attached to a view *inside* the `NavigationStack`, not on the stack itself or after it.

### Task 2 — Display the list correctly (3 pt)

`List(countries) { ... }` requires the element type to be `Identifiable`. `Country` currently is not, so the project does not even compile. Make `Country` conform to both `Identifiable` and `Hashable` so that:
- `List(countries)` compiles and renders one row per country.
- `NavigationLink(value: country)` works (Hashable is required).
- `id` is the `cca2` string (so two `Country` values with the same code count as the same row).

Hint: add a computed `id` property; declare conformance to both protocols. You will likely also need to mark `NameBlock` as `Hashable` (already done in the starter).

### Task 3 — Add swipe-to-delete + Edit button (3 pt)

Replace `List(countries) { ... }` with a `List` containing an explicit `ForEach(countries) { ... }`, then attach `.onDelete` so rows can be swiped away, and add an `EditButton()` to the toolbar (placement `.topBarLeading`) so the user can enter edit mode.

Deleting a row should remove that country from `countries` (the local in-memory array). It does not need to call the API again.

### Task 4 — Persist favorites with @AppStorage (4 pt)

Implement `BookmarkStore.load()` and `BookmarkStore.save()` so that `favoriteIDs` survives across launches.

Requirements:
- Use `@AppStorage("favoriteIDs")` storing a `Data` value (JSON-encoded `Set<String>`).
- `save()` is called every time `favoriteIDs` changes (use a `didSet` observer, or call it explicitly from `toggle`).
- `load()` is called once when the store is created (in `init`).
- `@AppStorage` does not work on classes directly — store the `Data` in a property of the class, and bridge to `UserDefaults.standard` manually using the key `"favoriteIDs"`. (You are allowed to use `UserDefaults.standard.data(forKey:)` and `set(_:forKey:)`.)

A correct implementation passes `testFavoritePersistsAcrossLaunches`.

### Task 5 — Fetch data from a remote API (5 pt)

Implement `ContentView.load()` and wire it up with `.task { await load() }`.

The URL is:

```
https://restcountries.com/v3.1/all?fields=name,cca2,flag,region,population
```

The response is a JSON array shaped like:

```json
[
  {
    "name": { "common": "Thailand", "official": "Kingdom of Thailand" },
    "cca2": "TH",
    "flag": "🇹🇭",
    "region": "Asia",
    "population": 69799978
  },
  ...
]
```

Requirements:
- Use `URLSession.shared.data(from:)` with `try await`.
- Decode with `JSONDecoder().decode([Country].self, from: data)`.
- On *any* failure (bad URL, network error, decoding error) set `errorMessage = error.localizedDescription`. Do not crash.
- Wire up `.task { await load() }` so the fetch runs when `ContentView` appears.

### Task 6 — Polish (2 pt)

Two small fixes worth 1 pt each:

1. **Modifier order in `DetailView`.** The "Population: ..." text is supposed to be a rounded blue pill. The current chain `.cornerRadius -> .padding -> .background` does not round the painted area. Reorder the modifiers so the corner radius applies to the blue background.
2. **About sheet.** Implement `AboutView` (NavigationStack + title "About" + Text + "Done" toolbar button calling `dismiss()`), and in `ContentView` add a toolbar item (placement `.topBarTrailing`) labeled "About" that flips `showAbout = true`, plus a `.sheet(isPresented: $showAbout) { AboutView() }`.

---

## Unit Tests (must pass)

These are the names the grader runs. Each maps to one or more tasks.

| Test | What it asserts | Tasks |
|---|---|---|
| `testCountryIsIdentifiableByCCA2` | Two `Country` values with the same `cca2` are equal and hash to the same bucket; `country.id == country.cca2`. | 2 |
| `testListShowsAllCountries` | After `load()` returns successfully, `countries.count == decoded.count` and the first row's text contains the first country's `name.common`. | 2, 5 |
| `testDeleteRemovesItem` | Calling `countries.remove(atOffsets: IndexSet(integer: 0))` reduces count by 1. (Sanity check that you used `ForEach(countries)` over a mutable `@State` array, not a `let`.) | 3 |
| `testEditModeReorders` | `EditButton` is present in the toolbar (snapshot of toolbar contains `EditButton`). | 3 |
| `testFavoritePersistsAcrossLaunches` | After `store.toggle(country)`, creating a fresh `BookmarkStore()` reads the same `favoriteIDs` back. | 4 |
| `testFetchDecodesCountries` | Decoding the provided sample JSON via `JSONDecoder().decode([Country].self, ...)` yields the expected count and the first element's `cca2`. | 5 |
| `testNavigationDestinationRegistered` | The view tree contains a `.navigationDestination(for: Country.self)` reachable from inside the `NavigationStack`. | 1 |

---

## Grading Notes

- Partial credit is awarded per task — see `04-practical-rubric.md`.
- The unit tests give a pass/fail signal but the rubric determines points.
- Do not change test files. Do not change the `Country` field names (you may add computed properties).
- You may use `if let`, `guard let`, `??` freely. Force-unwrap (`!`) on `URL(string:)`, `Int(_:)`, dictionary lookups, or `as!` will lose 1 pt regardless of whether tests pass.
- Total points: 3 + 3 + 3 + 4 + 5 + 2 = **20**.
