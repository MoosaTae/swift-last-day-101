# Mock 3 — Written Exam (Closed Book)
**Time: 45 minutes | Total: 10 points**

> Instructions for student: do not look at `10-written-answers.md` until you finish.
> Suggested time budget: Section A ~10 min, Section B ~20 min, Section C ~15 min.

---

## Section A — Output Prediction (3 points)

For each question, write down exactly what gets printed (one line per `print` call). If a value would print with the `Optional(...)` wrapper, write that wrapper. Order matters.

### Q1 (0.5 pt)

```swift
let title: String? = "Inception"
print(title?.uppercased())
print(title?.count ?? -1)
```

---

### Q2 (0.75 pt)

```swift
let raw: String? = nil
let length = raw?.count
print(length)
print(length ?? 0)
print((raw ?? "n/a").uppercased())
```

---

### Q3 (0.75 pt)

```swift
let userInput: String? = "12.5"
let parsed = Int(userInput ?? "")
print(parsed)
print(parsed ?? -1)

let okInput: String? = "7"
if let n = Int(okInput ?? "") {
    print("got \(n)")
} else {
    print("nope")
}
```

---

### Q4 (1 pt)

```swift
struct Movie {
    let title: String
    let rating: Double?
}

let library: [Movie] = [
    Movie(title: "Tenet",     rating: 7.5),
    Movie(title: "TBA",       rating: nil),
    Movie(title: "Dune",      rating: 8.0),
    Movie(title: "Untitled",  rating: nil),
]

let avg = library
    .compactMap { $0.rating }
    .reduce(0, +) / Double(library.compactMap { $0.rating }.count)

print(avg)
print(library.first { $0.rating == nil }?.title ?? "all rated")
print("missing=\(library.filter { $0.rating == nil }.count)")
```

> Note: `compactMap` strips `nil`s and unwraps the rest.

---

## Section B — Code Improvement (4 points)

For each snippet: (a) state what is wrong and why it is unsafe / incorrect, (b) rewrite it correctly. You do not have to keep variable names; just keep the intent.

### Q1 (1 pt)

```swift
struct Movie: Identifiable {
    let id = UUID()
    let title: String
}

struct WatchlistView: View {
    @State var movies: [Movie] = [
        Movie(title: "Arrival"),
        Movie(title: "Her"),
        Movie(title: "Whiplash"),
    ]

    var body: some View {
        List(movies) { m in
            Text(m.title)
        }
        .onDelete { offsets in
            movies.remove(atOffsets: offsets)
        }
    }
}
```

The author wants to swipe-to-delete rows, but the project does not compile. Explain why, then fix it. (Hint: `.onDelete` is not a `List` modifier.)

---

### Q2 (1.5 pt)

```swift
struct Genre {
    let name: String
}

struct GenreList: View {
    let genres: [Genre] = [
        Genre(name: "Sci-Fi"),
        Genre(name: "Drama"),
        Genre(name: "Action"),
    ]

    var body: some View {
        List(genres) { g in           // <-- problem #1
            Text(g.name)
        }
    }
}

struct ContentView: View {
    var body: some View {
        NavigationView {              // <-- problem #2
            GenreList()
                .navigationTitle("Genres")
        }
    }
}
```

There are two issues. Identify each, explain *why* it is wrong (not just *what* to change), and provide a corrected version of both views. You may add or remove protocol conformances on `Genre` if needed.

---

### Q3 (1.5 pt)

```swift
struct Movie: Hashable {
    let title: String
}

struct WatchlistView: View {
    let movies: [Movie] = [
        Movie(title: "Oppenheimer"),
        Movie(title: "Barbie"),
    ]

    var body: some View {
        NavigationStack {
            List(movies, id: \.self) { m in
                NavigationLink(value: m) {
                    Text(m.title)
                }
            }
            .navigationTitle("Movies")
        }
        .navigationDestination(for: Movie.self) { m in    // <-- problem #1
            DetailView(movie: m)
        }
    }
}

struct DetailView: View {
    @State var movie: Movie                                // <-- problem #2

    var body: some View {
        Text(movie.title).font(.largeTitle)
    }
}
```

There are two issues across the views. For each, explain *why* it is wrong (not just *what* to change), and provide a corrected version of both views.

---

## Section C — View Decomposition (3 points)

Use only `VStack`, `HStack`, `Text`, `Image`, and `Spacer`. Modifiers allowed: `.font`, `.foregroundColor` / `.foregroundStyle`, `.padding`, `.bold()`, `.frame(...)`, `.resizable()`, `.scaledToFill()`, `.clipShape(_:)`, plus `spacing:` / `alignment:` arguments on the stacks. You do not need to wrap the result in a `View` — just write the body content.

### Q1 (2 pt)

Wireframe — a vertical profile screen:

```
+----------------------------------+
|                                  |
|              ( O )               |   <-- circular avatar, ~120pt
|                                  |
|             Jane Doe             |   <-- bold, large
|         iOS Developer            |   <-- subtitle, secondary
|                                  |
| Loves SwiftUI, coffee, and cats. |   <-- body, multi-line
|                                  |
| [128]      [42]        [9]       |   <-- horizontal stat row
| Posts    Followers   Following   |       (labels under numbers)
|                                  |
+----------------------------------+
```

- The avatar is an SF Symbol `"person.crop.circle.fill"`, `.font(.system(size: 120))`, blue. (Treat it as a circle visually — no need for `.clipShape` since it is already round.)
- The name is `.font(.largeTitle).bold()`. The bio under the name is `.font(.subheadline).foregroundStyle(.secondary)`.
- The body line is `.font(.body)`, centered.
- The stat row has three equal-width columns. Each column is a `VStack` with a bold number on top and a caption-sized label underneath. The three columns split the width evenly (hint: `.frame(maxWidth: .infinity)` per column).

Write the SwiftUI body that produces this whole screen.

---

### Q2 (1 pt)

Wireframe — a single movie row from a search result list:

```
+----------------------------------+
| [poster]   Inception      2010   |
|            Sci-Fi                |
+----------------------------------+
```

- Poster is an asset image `"poster"`, `.resizable().scaledToFill()`, framed `60x84`, leading.
- Right of the poster is a column: top line has the title `"Inception"` (`.headline`) on the left and the year `"2010"` (`.caption.foregroundStyle(.secondary)`) pushed to the trailing edge of the row. Below the title is the genre `"Sci-Fi"` (`.subheadline.foregroundStyle(.secondary)`).

Write the SwiftUI body.

---

**End of paper.** Re-read your Section B answers — that is where most points are lost. Then check yourself against `10-written-answers.md`.
