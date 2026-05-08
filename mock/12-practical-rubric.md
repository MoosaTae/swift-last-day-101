# Mock 3 — Practical Exam Solution + Rubric

This file pairs with `11-practical-brief.md`. It shows a reference solution for each task and the rubric the grader applies.

---

## Solution Sketch (per task)

### Task 1 — Fix the broken navigation containers

**What was broken.** The `TabView` had no `NavigationStack` at all. Each tab needs its own stack so:
- Each tab's title bar shows up.
- `NavigationLink(value:)` and `.navigationDestination(for:)` work *within* that tab.
- Switching tabs does not carry the back stack across.

**Fix.** Wrap each tab's content in its own `NavigationStack`.

```swift
struct RootView: View {
    @State private var store = WatchlistStore()
    @State private var movies: [Movie] = []
    @State private var errorMessage: String?

    var body: some View {
        TabView {
            NavigationStack {
                WatchlistTab(movies: movies, store: store)
            }
            .tabItem { Label("Watchlist", systemImage: "bookmark.fill") }

            NavigationStack {
                SearchTab(movies: movies, store: store)
            }
            .tabItem { Label("Search", systemImage: "magnifyingglass") }
        }
        .overlay {
            if let msg = errorMessage {
                Text(msg).foregroundStyle(.red)
            }
        }
        .task { await load() }    // (Task 5 wires this up)
    }
    // ...
}
```

**Common wrong answer:** putting one `NavigationStack` *around* the `TabView`. That would give both tabs the same stack — switching from Watchlist to Search would carry the back stack across, which is the opposite of what users expect.

---

### Task 2 — Make `Movie` work as a list element

**What was broken.** `Movie` was only `Codable`. `List(watched) { ... }` requires `Identifiable`, and `NavigationLink(value: movie)` requires `Hashable`.

**Fix.**

```swift
struct Movie: Codable, Identifiable, Hashable {
    var id: String { imdbID }    // computed; no stored property required

    let imdbID: String
    let title: String
    let year: Int
    let genre: String
    let rating: Double?
}
```

`Hashable` is auto-synthesized because all stored properties (`String`, `Int`, `Double?`) are themselves `Hashable`.

---

### Task 3 — Wire navigation destinations in both tabs

The `.navigationDestination(for:)` modifier must be attached to a view *inside* the tab's `NavigationStack`. Easiest place: on the `List`.

**WatchlistTab:**

```swift
List(watched) { movie in
    NavigationLink(value: movie) {
        MovieRow(movie: movie, store: store)
    }
}
.navigationTitle("Watchlist")
.navigationDestination(for: Movie.self) { m in
    MovieDetail(movie: m, store: store)
}
```

**SearchTab:**

```swift
List(results) { movie in
    NavigationLink(value: movie) {
        MovieRow(movie: movie, store: store)
    }
}
// (inside the existing VStack body, after the .navigationTitle)
.navigationDestination(for: Movie.self) { m in
    MovieDetail(movie: m, store: store)
}
```

Note: registering the destination *once* per stack is enough; the same registration handles every `NavigationLink(value:)` in that stack.

---

### Task 4 — Persist watched set with UserDefaults

```swift
@Observable
final class WatchlistStore {
    private let key = "watchedIDs"

    var watchedIDs: Set<String> = []

    init() {
        load()
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
        save()
    }

    private func load() {
        guard
            let data = UserDefaults.standard.data(forKey: key),
            let decoded = try? JSONDecoder().decode(Set<String>.self, from: data)
        else { return }
        watchedIDs = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(watchedIDs) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}
```

Key correctness points:
- `Set<String>` (not `[String]`) so duplicates are impossible.
- `JSONEncoder` / `JSONDecoder` round-trips the set as `Data`.
- `try?` on encode/decode — failure is non-fatal, just skip the persist on that call.
- `init()` calls `load()` once; `toggle()` calls `save()` after every mutation.
- No force unwrap. `data(forKey:)` returns `Data?` — guard it.

---

### Task 5 — Fetch movies from a remote JSON

```swift
func load() async {
    guard let url = URL(string: "https://example.com/movies.json") else {
        errorMessage = "Invalid URL"
        return
    }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        movies = try JSONDecoder().decode([Movie].self, from: data)
    } catch {
        errorMessage = error.localizedDescription
    }
}
```

And on the `TabView`:

```swift
.task { await load() }
```

Key correctness points:
- `guard let url` (not `URL(string:)!`).
- `try await URLSession.shared.data(from:)` (the async variant).
- `[Movie].self` because the response is a JSON array.
- `Movie.rating` is `Double?` so the `null` rating in the third element decodes to `nil` (no special handling needed).
- Errors caught and surfaced via `errorMessage`, never crashed.

---

### Task 6 — Polish

**6a. Modifier order in `MovieDetail`.** Canonical "card" order is **padding -> background -> cornerRadius**. The original `.cornerRadius` came first, before the background, so the background re-painted square corners on top of the rounded ones.

```swift
Text("Rating: \(ratingText)")
    .padding()
    .background(Color.yellow.opacity(0.3))
    .cornerRadius(12)
```

**6b. `ratingText` computed property.**

```swift
private var ratingText: String {
    if let r = movie.rating {
        return String(format: "%.1f/10", r)
    } else {
        return "Not Rated"
    }
}
```

Equivalent acceptable forms:
```swift
movie.rating.map { String(format: "%.1f/10", $0) } ?? "Not Rated"
```

For `r == 8.0`, the format produces `"8.0/10"` (matches the test).

**6c. Empty-state placeholder in `WatchlistTab`.**

```swift
List(watched) { movie in
    NavigationLink(value: movie) {
        MovieRow(movie: movie, store: store)
    }
}
.navigationTitle("Watchlist")
.navigationDestination(for: Movie.self) { m in
    MovieDetail(movie: m, store: store)
}
.overlay {
    if watched.isEmpty {
        Text("No movies watched yet")
            .foregroundStyle(.secondary)
    }
}
```

`.overlay` paints over the `List` only when `watched.isEmpty` is true; otherwise the `if` returns `EmptyView()` and nothing is drawn.

---

## Grading Rubric

| Task | Points | What earns full credit | Common partial credit |
|---|---|---|---|
| 1 — Per-tab NavigationStack | 3 | Each tab is wrapped in its own `NavigationStack`. Tab titles render; switching tabs preserves each tab's stack independently. | 1 pt for one tab wrapped only; 1 pt for putting a single `NavigationStack` *around* the `TabView` (wrong shape). |
| 2 — Identifiable + Hashable | 3 | `Movie` conforms to both, `id == imdbID`, list compiles and renders, `NavigationLink(value:)` compiles. | 1 pt for `Identifiable` only; 2 pt if both are added but `id` is `UUID()` instead of `imdbID` (test fails). |
| 3 — Navigation destinations | 2 | `.navigationDestination(for: Movie.self)` registered inside *both* tabs' stacks; tapping a row in either tab pushes `MovieDetail`. | 1 pt for one tab only. |
| 4 — Persistence | 4 | `init` calls `load`, `toggle` calls `save`, `Set<String>` is JSON-encoded to `Data` in `UserDefaults` under key `"watchedIDs"`, no force unwraps. Test passes. | 2 pt if it persists but uses `[String]` instead of `Set<String>`; 1 pt if you encode but never decode on launch; -1 if `try!` or force-unwrap is used. |
| 5 — API fetch | 5 | Correct URL, `try await URLSession.shared.data(from:)`, decode `[Movie]`, error caught and surfaced via `errorMessage`, `.task { await load() }` wired up. | 3 pt if it fetches but force-unwraps `URL(string:)!`; 2 pt if you used `.onAppear` without wrapping in `Task { }`; 4 pt if errors crash instead of setting `errorMessage`. |
| 6 — Polish | 3 | (1 pt) modifier order corrected; (1 pt) `ratingText` returns `"8.0/10"` and `"Not Rated"`; (1 pt) empty-state overlay shows only when watched is empty. | Each sub-item graded independently. |
| **Total** | **20** | | |

### Penalties (apply once across the whole submission)

- Any `!` force-unwrap on `URL(string:)`, `Int(_:)`, dictionary subscript, `movie.rating!`, or `as!`: **-1 pt**.
- Project does not compile: cap at 10 pt regardless of partial work (graders run tests).
- Using `NavigationView` instead of `NavigationStack`: **-1 pt**.
- Single `NavigationStack` around the whole `TabView` instead of per-tab: **-1 pt** (in addition to Task 1 partial credit).

---

## Self-grading checklist

- [ ] All seven tests pass: `testMovieIsIdentifiableByIMDBID`, `testMovieIsHashable`, `testToggleAddsAndRemoves`, `testWatchedPersistsAcrossLaunches`, `testFetchDecodesMovies`, `testSearchFiltersByTitle`, `testRatingTextFormatsCorrectly`.
- [ ] No force unwraps anywhere in submitted code.
- [ ] Each tab is wrapped in its OWN `NavigationStack` (not one shared stack around the `TabView`).
- [ ] `Movie` conforms to `Identifiable` AND `Hashable`, with `id == imdbID`.
- [ ] `.navigationDestination(for: Movie.self)` is registered inside BOTH tabs' stacks.
- [ ] `WatchlistStore` saves on every toggle and loads in `init`; persists `Set<String>` as JSON `Data` in `UserDefaults`.
- [ ] `.task { await load() }` is attached to a view inside `RootView` (e.g. on the `TabView`).
- [ ] `load()` catches all errors and writes them to `errorMessage`; never crashes on a bad URL or bad JSON.
- [ ] `MovieDetail`'s yellow rating pill is visibly rounded (modifier order fixed).
- [ ] `ratingText` returns `"8.0/10"` for `8.0` and `"Not Rated"` for `nil`.
- [ ] Empty-state overlay shows in `WatchlistTab` only when no movies are watched.
- [ ] No `NavigationView` anywhere — only `NavigationStack`.
