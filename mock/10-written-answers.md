# Mock 3 — Written Exam Answers
**Total: 10 points**

> Self-grading guide. Each answer shows the expected output / fix plus 2-4 lines of reasoning so you understand *why*.

---

## Section A — Output Prediction (3 points)

### Q1 (0.5 pt)

```
Optional("INCEPTION")
9
```

**Why:**
- `title?.uppercased()` is *optional chaining*: `title` is non-nil, so it calls `.uppercased()` and the whole expression is `String?`. `print` shows the box: `Optional("INCEPTION")`.
- `title?.count` is `Optional(9)`. `?? -1` unwraps to `9`.

---

### Q2 (0.75 pt)

```
nil
0
N/A
```

**Why:**
- `raw?.count` short-circuits when `raw` is `nil`: the whole expression becomes `nil` (typed `Int?`). `print(nil)` of an Optional prints `nil`.
- `length ?? 0` substitutes `0` for the nil case.
- `raw ?? "n/a"` becomes `"n/a"` (a plain `String`), and `.uppercased()` then runs on a real string, producing `"N/A"`.

Common mistake: thinking `print(length)` would crash. It does not — `nil` is a valid value to print.

---

### Q3 (0.75 pt)

```
nil
-1
got 7
```

**Why:**
- `Int("12.5")` returns `nil` because `Int(_:)` rejects decimal points. So `parsed` is `nil`. Printing it shows `nil`.
- `parsed ?? -1` substitutes `-1`.
- `Int("7")` is `Optional(7)`. `if let n` succeeds and binds `n = 7`, so `"got 7"` runs.

Trap: students often think `Int("12.5")` truncates to `12`. It does not — use `Double("12.5")` first if you want that.

---

### Q4 (1 pt)

```
7.75
TBA
missing=2
```

**Why:**
- `compactMap { $0.rating }` returns `[7.5, 8.0]` — it strips both `nil` ratings *and* unwraps the `Double?` to `Double`.
- `.reduce(0, +)` is `7.5 + 8.0 = 15.5`. Divided by `2.0` (count of unwrapped ratings) is `7.75`.
- `library.first { $0.rating == nil }` finds `Movie(title: "TBA", rating: nil)`. The closure returns `Movie?`. `?.title` chains to `String?`. `?? "all rated"` is unused because the chain succeeded.
- `library.filter { $0.rating == nil }.count` is `2` (`"TBA"` and `"Untitled"`). Interpolated cleanly because `count` is non-optional `Int`.

---

## Section A subtotal: 3 points (0.5 + 0.75 + 0.75 + 1.0)

---

## Section B — Code Improvement (4 points)

### Q1 (1 pt)

**What's wrong:** `.onDelete` is a modifier on `ForEach`, not on `List`. The shorthand `List(movies) { m in ... }` hides the inner `ForEach` so there is nothing to attach `.onDelete` to — the compiler error mentions that `List` has no `onDelete` member with that signature.

**Fix:** rewrite the `List` to contain an explicit `ForEach`, then attach `.onDelete` to the `ForEach`.

```swift
struct WatchlistView: View {
    @State var movies: [Movie] = [
        Movie(title: "Arrival"),
        Movie(title: "Her"),
        Movie(title: "Whiplash"),
    ]

    var body: some View {
        List {
            ForEach(movies) { m in
                Text(m.title)
            }
            .onDelete { offsets in
                movies.remove(atOffsets: offsets)
            }
        }
    }
}
```

(Optional polish: add `.toolbar { EditButton() }` so users can enter edit mode. Not required for full marks here.)

---

### Q2 (1.5 pt)

**The two issues:**

1. **`List(genres) { g in ... }` requires `Genre` to be `Identifiable`.** `List(items)` calls the overload that reads an `id` from each element. `Genre` has no `id` property and does not conform to `Identifiable`, so the project does not compile. (Alternative: `List(genres, id: \.name)` would also work, but only if `name` is unique.)
2. **`NavigationView` is deprecated.** Since iOS 16, the correct container is `NavigationStack`. `NavigationView` still compiles but the course targets iOS 16+ and the exam expects the modern API. It also behaves differently on iPad (auto-becomes a sidebar/detail split view), which is rarely what you want.

**Fix:**

```swift
struct Genre: Identifiable {
    let id = UUID()
    let name: String
}

struct GenreList: View {
    let genres: [Genre] = [
        Genre(name: "Sci-Fi"),
        Genre(name: "Drama"),
        Genre(name: "Action"),
    ]

    var body: some View {
        List(genres) { g in
            Text(g.name)
        }
    }
}

struct ContentView: View {
    var body: some View {
        NavigationStack {
            GenreList()
                .navigationTitle("Genres")
        }
    }
}
```

(Equally acceptable: keep `Genre` as-is and use `List(genres, id: \.name) { g in ... }`. State the assumption.)

---

### Q3 (1.5 pt)

**The two issues:**

1. **`.navigationDestination(for: Movie.self)` is attached *outside* the `NavigationStack`.** That modifier registers a type-to-view mapping in the stack's destination registry. The registry only sees modifiers attached to a view *inside* the `NavigationStack` closure (typically the root content, e.g. the `List`). Attached outside, the registration silently fails and tapping a row does nothing.
2. **`@State var movie: Movie` in the child.** A child view that *receives* a value from its parent should declare it as a plain `let movie: Movie` (or `var movie: Movie`). `@State` creates view-owned, private storage that is independent of whatever is passed in — it is for state the view itself owns and mutates. Using `@State` for a received-only value is wrong on principle (and `@State` requires an initializer, which is missing here, so this also fails to compile).

**Fix:**

```swift
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
            .navigationDestination(for: Movie.self) { m in   // <-- moved INSIDE
                DetailView(movie: m)
            }
        }
    }
}

struct DetailView: View {
    let movie: Movie                                          // <-- plain let

    var body: some View {
        Text(movie.title).font(.largeTitle)
    }
}
```

---

## Section B subtotal: 4 points (1.0 + 1.5 + 1.5)

---

## Section C — View Decomposition (3 points)

Grading note: small modifier-order or color-name differences are fine. The structure (which `Stack` contains what, where the `Spacer` goes) is what carries the points.

### Q1 (2 pt)

```swift
VStack(spacing: 16) {
    Image(systemName: "person.crop.circle.fill")
        .font(.system(size: 120))
        .foregroundStyle(.blue)

    VStack(spacing: 4) {
        Text("Jane Doe")
            .font(.largeTitle)
            .bold()
        Text("iOS Developer")
            .font(.subheadline)
            .foregroundStyle(.secondary)
    }

    Text("Loves SwiftUI, coffee, and cats.")
        .font(.body)

    HStack(spacing: 0) {
        VStack {
            Text("128").font(.headline).bold()
            Text("Posts").font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)

        VStack {
            Text("42").font(.headline).bold()
            Text("Followers").font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)

        VStack {
            Text("9").font(.headline).bold()
            Text("Following").font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}
.padding()
```

**Why this layout:**
- The screen reads top-to-bottom: avatar, name+bio, body, stat row. Outer container is `VStack`.
- Name + bio is a tight pair that should stick together — wrap them in a nested `VStack` with small spacing so the outer `spacing: 16` doesn't separate them.
- The three-column stat row uses an `HStack` where each child is a `VStack` with `.frame(maxWidth: .infinity)`. This is the "split row evenly" trick: each greedy `.infinity` claims an equal share. Without it the columns would shrink to text width and clump.
- SF Symbols size with `.font(.system(size:))`, not `.frame`. `"person.crop.circle.fill"` is already circular, so no `.clipShape` needed.

Common errors:
- Using three `Spacer()`s instead of `.frame(maxWidth: .infinity)`: harder to make truly even, and depends on text length.
- Wrapping the avatar in `.frame(width: 120, height: 120)` without `.font` — that just reserves space; the glyph stays small.

---

### Q2 (1 pt)

```swift
HStack(spacing: 12) {
    Image("poster")
        .resizable()
        .scaledToFill()
        .frame(width: 60, height: 84)

    VStack(alignment: .leading, spacing: 4) {
        HStack {
            Text("Inception")
                .font(.headline)
            Spacer()
            Text("2010")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        Text("Sci-Fi")
            .font(.subheadline)
            .foregroundStyle(.secondary)
    }
}
.padding(.vertical, 4)
```

**Why this layout:** poster on the left, info column on the right — outer `HStack`. The info column itself contains a *row* (title + year pushed to trailing) on top of the genre line — so the column is a `VStack(alignment: .leading)` whose first child is its own `HStack` with a `Spacer()` between title and year. The `Spacer()` inside the inner `HStack` is what shoves `2010` to the right edge of the row.

Common error: forgetting `.resizable()` before `.frame` on an asset image — the asset keeps its intrinsic pixel size and ignores the frame.

---

## Section C subtotal: 3 points (2.0 + 1.0)

---

## Grand total: 10 points

| Section | Points | Topics covered                                                               |
| ------- | ------ | ---------------------------------------------------------------------------- |
| A       | 3.0    | Optional chaining, nil-coalescing, optional binding, `compactMap`            |
| B       | 4.0    | List/ForEach + `.onDelete`, NavigationView vs NavigationStack, destination placement, `@State` misuse |
| C       | 3.0    | Vertical layout, nested VStacks, even-split row via `.frame(maxWidth: .infinity)`, asset image |

### How to self-grade

- Got the output **exactly** right (every line, including `Optional(...)` and `nil`)? Full marks.
- Section B: 0.5 pt for spotting each bug, the rest for a working fix. If you only said "use `ForEach`" without writing the code, half credit.
- Section C: structure first (right `Stack` nesting and where the greedy frame goes), modifiers second. Wrong outer container = lose most of the question; right structure with one missing modifier = lose ~0.25.

If you got under 7/10, re-read the cheat-sheet for the section you lost the most on, then redo this paper from a blank page tomorrow morning.
