# Mock 3 — Practical Exam (Open Book)
**Time: 120 minutes | Total: 20 points**

You will build and refactor a small "Movie Watchlist" iOS app. The starter project compiles but is broken in deliberate ways and missing several features. Work through the tasks in order. Your grade is determined by both completeness and the unit tests at the bottom of this brief.

---

## Setup — Starter Code (provided)

Files provided in the Xcode project:

- `Models.swift` — the `Movie` model and a `WatchlistStore` `@Observable` class.
- `RootView.swift` — the `TabView` with two tabs (Watchlist, Search). Has bugs.
- `WatchlistTab.swift` — the watched-movies list. Mostly stubbed.
- `SearchTab.swift` — searches the fetched movie pool. Has bugs.
- `MovieDetail.swift` — detail screen, partly stubbed.
- `WatchlistAppTests.swift` — unit tests you must make pass.

### `Models.swift`

```swift
import Foundation
import Observation

// One movie, decoded from the JSON below.
struct Movie: Codable {
    // TODO (Task 2): make this type Identifiable AND Hashable.
    // The unique id should come from `imdbID` (e.g. "tt1375666").

    let imdbID: String
    let title: String
    let year: Int
    let genre: String
    let rating: Double?
}

@Observable
final class WatchlistStore {
    private let key = "watchedIDs"

    // The IDs (imdbID strings) the user has marked as watched.
    // Persisted across launches via UserDefaults in Task 4.
    var watchedIDs: Set<String> = []

    init() {
        // TODO (Task 4): call load() here so the saved set is restored at app start.
    }

    func isWatched(_ movie: Movie) -> Bool {
        watchedIDs.contains(movie.imdbID)
    }

    func toggle(_ movie: Movie) {
        if watchedIDs.contains(movie.imdbID) {
            watchedIDs.remove(movie.imdbID)
        } else {
            watchedIDs.insert(movie.imdbID)
        }
        // TODO (Task 4): call save() so toggles persist immediately.
    }

    // TODO (Task 4): load() reads JSON-encoded Set<String> from UserDefaults
    //                under `key` and assigns to watchedIDs (without re-saving).
    // TODO (Task 4): save() encodes watchedIDs to JSON and writes it to
    //                UserDefaults under `key`.
}
```

### `RootView.swift`

```swift
import SwiftUI

struct RootView: View {
    @State private var store = WatchlistStore()
    @State private var movies: [Movie] = []
    @State private var errorMessage: String?

    var body: some View {
        // BUG (Task 1): each tab needs its OWN NavigationStack so each tab has
        //               an independent back stack and its own title bar.
        //               Currently neither tab is wrapped, so titles and pushes
        //               do not work.
        TabView {
            WatchlistTab(movies: movies, store: store)
                .tabItem {
                    Label("Watchlist", systemImage: "bookmark.fill")
                }

            SearchTab(movies: movies, store: store)
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }
        }
        .overlay {
            if let msg = errorMessage {
                Text(msg).foregroundStyle(.red)
            }
        }
        // TODO (Task 5): add .task { await load() } here so movies fetch on app start.
    }

    func load() async {
        // TODO (Task 5): fetch from
        // https://example.com/movies.json
        // decode into [Movie], assign to `movies`.
        // On any failure, set errorMessage = error.localizedDescription.
    }
}
```

### `WatchlistTab.swift`

```swift
import SwiftUI

struct WatchlistTab: View {
    let movies: [Movie]
    @Bindable var store: WatchlistStore

    // The watched subset of all movies.
    var watched: [Movie] {
        movies.filter { store.isWatched($0) }
    }

    var body: some View {
        // BUG (Task 2): List(watched) requires Movie: Identifiable.
        //               Currently the project does not compile here.
        List(watched) { movie in
            NavigationLink(value: movie) {
                MovieRow(movie: movie, store: store)
            }
        }
        .navigationTitle("Watchlist")
        // TODO (Task 3): register .navigationDestination(for: Movie.self)
        //                so taps on a row push a MovieDetail.
        // TODO (Task 6): if `watched` is empty, show a friendly placeholder
        //                ("No movies watched yet") in an .overlay, instead of an empty list.
    }
}

struct MovieRow: View {
    let movie: Movie
    var store: WatchlistStore

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(movie.title).font(.headline)
                Text("\(movie.year) - \(movie.genre)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if store.isWatched(movie) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
            }
        }
    }
}
```

### `SearchTab.swift`

```swift
import SwiftUI

struct SearchTab: View {
    let movies: [Movie]
    @Bindable var store: WatchlistStore
    @State private var query: String = ""

    var results: [Movie] {
        if query.isEmpty { return movies }
        return movies.filter {
            $0.title.localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        VStack {
            TextField("Search title", text: $query)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal)

            List(results) { movie in
                NavigationLink(value: movie) {
                    MovieRow(movie: movie, store: store)
                }
            }
        }
        .navigationTitle("Search")
        // TODO (Task 3): register .navigationDestination(for: Movie.self)
        //                so taps on a row push a MovieDetail here too.
    }
}
```

### `MovieDetail.swift`

```swift
import SwiftUI

struct MovieDetail: View {
    let movie: Movie
    @Bindable var store: WatchlistStore

    var body: some View {
        VStack(spacing: 16) {
            Text(movie.title).font(.largeTitle).bold()
            Text("\(movie.year) - \(movie.genre)")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            // BUG (Task 6): the rating line should be a rounded yellow pill.
            //               The chain below paints the background OUTSIDE the
            //               rounded area, so the pill is not visibly rounded.
            //               Reorder the modifiers without changing the colors.
            Text("Rating: \(ratingText)")
                .cornerRadius(12)
                .padding()
                .background(Color.yellow.opacity(0.3))

            Button(store.isWatched(movie) ? "Mark Unwatched" : "Mark Watched") {
                store.toggle(movie)
            }
            .buttonStyle(.borderedProminent)

            Spacer()
        }
        .padding()
        .navigationTitle(movie.title)
    }

    private var ratingText: String {
        // TODO (Task 6): if movie.rating is non-nil, format as "8.0/10".
        //                if nil, return "Not Rated".
        return ""
    }
}
```

### `WatchlistAppTests.swift` (read-only — do not edit)

```swift
import XCTest
@testable import Watchlist

final class WatchlistAppTests: XCTestCase {
    func testMovieIsIdentifiableByIMDBID() { /* ... */ }
    func testMovieIsHashable() { /* ... */ }
    func testToggleAddsAndRemoves() { /* ... */ }
    func testWatchedPersistsAcrossLaunches() { /* ... */ }
    func testFetchDecodesMovies() { /* ... */ }
    func testSearchFiltersByTitle() { /* ... */ }
    func testRatingTextFormatsCorrectly() { /* ... */ }
}
```

---

## Tasks (work through in order)

### Task 1 — Fix the broken navigation containers (3 pt)

Each tab needs **its own** `NavigationStack`. Currently `RootView` has `TabView { WatchlistTab ... ; SearchTab ... }` with no `NavigationStack`s, so neither tab shows its title bar, neither tab can push to detail, and the two tabs would share a single back stack if you wrapped them together.

Wrap the two tabs each in a `NavigationStack` so each tab has an independent back stack. The fix should look like:

```swift
TabView {
    NavigationStack { WatchlistTab(...) }
        .tabItem { Label("Watchlist", systemImage: "bookmark.fill") }
    NavigationStack { SearchTab(...) }
        .tabItem { Label("Search", systemImage: "magnifyingglass") }
}
```

Hint: do not put a single `NavigationStack` *around* the `TabView`. That gives both tabs the same stack — switching tabs would carry the back stack across, which is wrong.

### Task 2 — Make `Movie` work as a list element (3 pt)

`List(watched) { ... }` and `NavigationLink(value: movie)` both fail to compile because `Movie` does not conform to the right protocols. Make `Movie`:

- `Identifiable` so `List(watched)` and `ForEach(movies)` compile without an explicit `id:`.
- `Hashable` so `NavigationLink(value: movie)` compiles and `.navigationDestination(for: Movie.self)` works.
- The `id` should be the `imdbID` string (so two `Movie` values with the same IMDB ID count as the same row).

Hint: add a computed `id` property and declare conformance to both protocols. `Hashable` will auto-synthesize because every stored property (`String`, `Int`, `String`, `Double?`) is itself `Hashable`.

### Task 3 — Wire navigation destinations in both tabs (2 pt)

In **both** `WatchlistTab` and `SearchTab`, register a `.navigationDestination(for: Movie.self)` on the `List` (inside the tab's `NavigationStack`) so tapping any row pushes a `MovieDetail(movie: m, store: store)`.

Why this is per-tab: the destination registry lives *in* a `NavigationStack`. Each tab has its own stack (Task 1), so each one needs its own registration.

### Task 4 — Persist watched set with UserDefaults (4 pt)

Implement `WatchlistStore.load()` and `WatchlistStore.save()` so `watchedIDs` survives across launches. Wire them up:

- `init()` calls `load()` once at startup.
- `toggle(_:)` calls `save()` after every mutation.

Requirements:
- Use `UserDefaults.standard` directly (this is a class, not a View, so `@AppStorage` does not apply naturally).
- Encode `Set<String>` as `Data` via `JSONEncoder().encode(...)`. Decode the same way with `JSONDecoder().decode(Set<String>.self, from: data)`.
- The key is already declared: `private let key = "watchedIDs"`.
- No force-unwraps. Use `try?` or proper `do/catch`.

A correct implementation passes `testWatchedPersistsAcrossLaunches`.

### Task 5 — Fetch movies from a remote JSON (5 pt)

Implement `RootView.load()` and wire it up with `.task { await load() }` on the `TabView`.

The URL is:

```
https://example.com/movies.json
```

The response is a JSON array shaped like:

```json
[
  {
    "imdbID": "tt1375666",
    "title": "Inception",
    "year": 2010,
    "genre": "Sci-Fi",
    "rating": 8.8
  },
  {
    "imdbID": "tt0816692",
    "title": "Interstellar",
    "year": 2014,
    "genre": "Sci-Fi",
    "rating": 8.6
  },
  {
    "imdbID": "tt9876543",
    "title": "Untitled",
    "year": 2026,
    "genre": "Drama",
    "rating": null
  }
]
```

Requirements:
- Use `URLSession.shared.data(from:)` with `try await`.
- Decode with `JSONDecoder().decode([Movie].self, from: data)`.
- On *any* failure (bad URL, network error, decoding error) set `errorMessage = error.localizedDescription`. Do not crash.
- `guard let url = URL(string:)` (no force unwrap).
- Wire up `.task { await load() }` so the fetch runs once at app start.

### Task 6 — Polish (3 pt)

Three small fixes worth 1 pt each:

1. **Modifier order in `MovieDetail`.** The yellow rating pill is supposed to be rounded. The current chain `.cornerRadius -> .padding -> .background` paints the background *outside* the rounded area. Reorder to **padding -> background -> cornerRadius** without changing colors.

2. **`ratingText` computed property.** Implement it so:
   - `movie.rating == 8.0` returns `"8.0/10"`.
   - `movie.rating == nil` returns `"Not Rated"`.
   - Use optional binding (`if let`), not force-unwrap.
   You can use `String(format: "%.1f", value)` or `"\(value)"` — both are accepted as long as the formatted output matches.

3. **Empty-state placeholder in `WatchlistTab`.** When `watched.isEmpty`, show the message `"No movies watched yet"` (`.foregroundStyle(.secondary)`) in an `.overlay { ... }` on the `List`. When non-empty, the overlay should not show.

---

## Unit Tests (must pass)

These are the names the grader runs. Each maps to one or more tasks.

| Test | What it asserts | Tasks |
|---|---|---|
| `testMovieIsIdentifiableByIMDBID` | `movie.id == movie.imdbID` for a sample movie. | 2 |
| `testMovieIsHashable` | Two `Movie` values with the same `imdbID` and other fields hash to the same bucket; `Set<Movie>` of two equal values has count 1. | 2 |
| `testToggleAddsAndRemoves` | `store.toggle(movie)` once -> `isWatched(movie) == true`. Twice -> `false`. | 4 (and the existing `toggle` logic) |
| `testWatchedPersistsAcrossLaunches` | After `store.toggle(movie)`, creating a fresh `WatchlistStore()` reads the same `watchedIDs` back. | 4 |
| `testFetchDecodesMovies` | Decoding the provided sample JSON via `JSONDecoder().decode([Movie].self, ...)` yields the expected count and the third element's `rating == nil`. | 2, 5 |
| `testSearchFiltersByTitle` | When `query == "inter"`, `results` (case-insensitive) contains "Interstellar" but not "Inception". | (already in starter — sanity check) |
| `testRatingTextFormatsCorrectly` | `ratingText` for `rating == 8.0` is `"8.0/10"`; for `rating == nil` is `"Not Rated"`. | 6 |

---

## Grading Notes

- Partial credit is awarded per task — see `12-practical-rubric.md`.
- The unit tests give a pass/fail signal but the rubric determines points.
- Do not change test files. Do not change the `Movie` field names (you may add computed properties).
- You may use `if let`, `guard let`, `??`, `try?` freely. Force-unwrap (`!`) on `URL(string:)`, `Int(_:)`, dictionary lookups, optional rating, or `as!` will lose 1 pt regardless of whether tests pass.
- Total points: 3 + 3 + 2 + 4 + 5 + 3 = **20**.
