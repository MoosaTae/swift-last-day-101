# Topic 4 — Lists & Navigation: Practice

> **React framing:** `List` ≈ a styled `<ul>` rendered from `items.map(...)`. `ForEach` ≈ the `.map(...)` itself. `Identifiable` ≈ React's `key` prop — every row needs a stable id or you get diffing warnings. `NavigationStack` + `NavigationLink` ≈ Next.js Pages router + `<Link href>`, with a back button + push/pop animation provided. `.navigationDestination(for: T.self)` ≈ a route definition: "when something pushes a `T`, render this view."

## Section A — Output/Behavior Prediction (8 problems)

### A1. List of `[String]` without `id:`

```swift
struct ContentView: View {
    let fruits = ["Apple", "Banana", "Cherry"]
    var body: some View {
        List(fruits) { fruit in
            Text(fruit)
        }
    }
}
```

<details><summary>Answer</summary>

Compile error: `Initializer 'init(_:rowContent:)' requires that 'String' conform to 'Identifiable'`. `String` is not `Identifiable`, so `List(items)` cannot infer an id. Fix: `List(fruits, id: \.self)`.

> **React:** equivalent of mapping without a `key` prop, but stricter — Swift compile-errors instead of just warning at runtime.
</details>

---

### A2. List of `[String]` with `id: \.self`

```swift
struct ContentView: View {
    let fruits = ["Apple", "Banana", "Cherry"]
    var body: some View {
        List(fruits, id: \.self) { fruit in
            Text(fruit)
        }
    }
}
```

<details><summary>Answer</summary>

Compiles and renders three rows: "Apple", "Banana", "Cherry". `String` is `Hashable`, so each value is its own id. Works fine as long as values are unique.

> **React:** like `fruits.map(f => <li key={f}>{f}</li>)` — using the value itself as the key. Same caveat: only safe when values are unique.
</details>

---

### A3. `Identifiable` struct list — each row renders

```swift
struct Person: Identifiable {
    let id = UUID()
    let name: String
}

struct ContentView: View {
    let people = [Person(name: "Ann"), Person(name: "Ben"), Person(name: "Cy")]
    var body: some View {
        List(people) { p in
            Text(p.name)
        }
    }
}
```

<details><summary>Answer</summary>

Renders three rows: "Ann", "Ben", "Cy". Because `Person` is `Identifiable`, no `id:` parameter is needed; `List` uses `\.id` automatically.

> **React:** equivalent of `people.map(p => <li key={p.id}>{p.name}</li>)`. `Identifiable` formalizes "this type has a stable id" the way TS interfaces formalize shapes.
</details>

---

### A4. `ForEach` in `ScrollView` with custom row layout

```swift
struct Item: Identifiable {
    let id = UUID()
    let title: String
    let subtitle: String
}

struct ContentView: View {
    let items = [
        Item(title: "One", subtitle: "First"),
        Item(title: "Two", subtitle: "Second")
    ]
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                ForEach(items) { item in
                    VStack(alignment: .leading) {
                        Text(item.title).font(.headline)
                        Text(item.subtitle).font(.subheadline)
                    }
                }
            }
            .padding()
        }
    }
}
```

<details><summary>Answer</summary>

A vertical scroll view with two rows. Each row has a bold title on top and a smaller subtitle below, left-aligned, with 12pt vertical spacing between rows. Unlike `List`, there are no separators, no row chrome, and rows are eagerly built (use `LazyVStack` if you need lazy loading).

> **React:** `ScrollView + VStack + ForEach` ≈ `<div className="overflow-y-auto"><div className="flex flex-col gap-3">{items.map(...)}</div></div>`. `List` is the chrome'd version (think iOS-styled `<ul>`); `ScrollView+VStack` is the bare version.
</details>

---

### A5. `NavigationLink` behavior — what happens on tap

```swift
struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink("Show Detail") {
                    Text("Detail Screen").font(.largeTitle)
                }
            }
            .navigationTitle("Home")
        }
    }
}
```

<details><summary>Answer</summary>

Renders a list with a single tappable row "Show Detail" and a navigation bar titled "Home". Tapping the row pushes a new screen onto the stack that displays "Detail Screen" in a large font, with a back button labeled "Home" in the top-left.

> **React/Next:** `<Link href="/detail">Show Detail</Link>` plus a `Detail` page — but SwiftUI gives you the back button + animated push for free.
</details>

---

### A6. `NavigationStack` with `.navigationDestination(for:)` triggered by value link

```swift
struct Country: Hashable {
    let name: String
}

struct ContentView: View {
    let countries = [Country(name: "Thailand"), Country(name: "Japan")]
    var body: some View {
        NavigationStack {
            List(countries, id: \.self) { c in
                NavigationLink(c.name, value: c)
            }
            .navigationDestination(for: Country.self) { c in
                Text("Welcome to \(c.name)").font(.title)
            }
            .navigationTitle("Countries")
        }
    }
}
```

<details><summary>Answer</summary>

Renders a list of two rows, "Thailand" and "Japan". Tapping a row pushes a detail screen showing "Welcome to Thailand" or "Welcome to Japan". The value-based link sends a `Country` value into the stack; the `.navigationDestination(for: Country.self)` registered on the root resolves it.

> **React/Next:** like a typed dynamic route — `NavigationLink(value: c)` ≈ `<Link href={\`/country/${c.name}\`}>` and `.navigationDestination(for: Country.self)` ≈ the `[name].tsx` page that knows how to render a Country. SwiftUI passes the value object directly instead of serializing through a URL.
</details>

---

### A7. Trap: `id: \.self` on data with two equal values

```swift
struct ContentView: View {
    let words = ["apple", "banana", "apple"]
    var body: some View {
        List(words, id: \.self) { word in
            Text(word)
        }
    }
}
```

<details><summary>Answer</summary>

Compiles and runs, but at runtime SwiftUI logs a warning: "ID `apple` occurs multiple times within a collection, this will give undefined results!". Visually you may see only two rows, animations may be wrong, and tapping/diffing behavior is undefined. Fix: use a struct wrapping `id: UUID()` or `Array.indices` with `id: \.self`.

> **React:** identical "Each child in a list should have a unique key prop" warning when two children share a key. Same fix: stable unique id, or fall back to index.
</details>

---

### A8. `.navigationTitle` placement effect

```swift
struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                Text("Row 1")
                Text("Row 2")
            }
        }
        .navigationTitle("Outside")
    }
}
```

<details><summary>Answer</summary>

The navigation bar shows no title (it appears empty). `.navigationTitle` must be applied to a view *inside* the `NavigationStack`, not on the `NavigationStack` itself. The modifier here attaches to the stack's container, which has no nav-bar context to write to. Fix: move `.navigationTitle("Outside")` onto the `List`.

> **React:** SwiftUI-specific — no clean React analog. Closest mental model: `<Head>` from Next.js must live inside the page component, not above the `<App>`.
</details>

---

## Section B — Code Improvement (10 problems)

### B1. `List(["a","b","c"]) { ... }` missing `id:`

```swift
struct ContentView: View {
    var body: some View {
        List(["a", "b", "c"]) { letter in
            Text(letter)
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct ContentView: View {
    let letters = ["a", "b", "c"]
    var body: some View {
        List(letters, id: \.self) { letter in
            Text(letter)
        }
    }
}
```

Reasons:
- `String` is not `Identifiable`; `List` needs an id source. `id: \.self` works because `String` is `Hashable`.
- Lift the literal array out of `body` into a stored property so `body` is not constructing a new array on every redraw.

> **React:** same lesson — define data outside the JSX-returning function, otherwise every render creates a new array reference (breaks memoization).
</details>

---

### B2. Inline 30-line row code — extract to `RowView`

```swift
struct Book: Identifiable {
    let id = UUID()
    let title: String
    let author: String
    let pages: Int
}

struct ContentView: View {
    let books: [Book] = []
    var body: some View {
        List(books) { book in
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "book.closed")
                    .resizable()
                    .frame(width: 40, height: 40)
                    .foregroundStyle(.blue)
                VStack(alignment: .leading, spacing: 4) {
                    Text(book.title)
                        .font(.headline)
                        .lineLimit(2)
                    Text(book.author)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("\(book.pages) pages")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct BookRow: View {
    let book: Book
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "book.closed")
                .resizable()
                .frame(width: 40, height: 40)
                .foregroundStyle(.blue)
            VStack(alignment: .leading, spacing: 4) {
                Text(book.title).font(.headline).lineLimit(2)
                Text(book.author).font(.subheadline).foregroundStyle(.secondary)
                Text("\(book.pages) pages").font(.caption).foregroundStyle(.tertiary)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

struct ContentView: View {
    let books: [Book] = []
    var body: some View {
        List(books) { book in
            BookRow(book: book)
        }
    }
}
```

Reasons:
- Smaller views compile faster and are easier to preview.
- The row becomes reusable elsewhere (search results, favorites screen, etc.).
- `body` of the list view stays scannable.

> **React:** identical refactor — pull the inline JSX into `<BookRow book={book} />`. Same readability + reusability win.
</details>

---

### B3. `ForEach` inside `List` with redundant explicit `id:`

```swift
struct Item: Identifiable {
    let id = UUID()
    let name: String
}

struct ContentView: View {
    let items: [Item] = []
    var body: some View {
        List {
            ForEach(items, id: \.id) { item in
                Text(item.name)
            }
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct ContentView: View {
    let items: [Item] = []
    var body: some View {
        List {
            ForEach(items) { item in
                Text(item.name)
            }
        }
    }
}
```

Reasons:
- When the element type is `Identifiable`, `ForEach(items)` already uses `\.id`. Specifying `id: \.id` is noise.
- Removing it makes intent clearer: this is a normal `Identifiable`-driven loop.
</details>

---

### B4. `NavigationStack` wrapping every screen

```swift
struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink("Open Detail") {
                    NavigationStack {
                        DetailView()
                    }
                }
            }
        }
    }
}

struct DetailView: View {
    var body: some View {
        NavigationStack {
            Text("Detail")
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct ContentView: View {
    var body: some View {
        NavigationStack {
            List {
                NavigationLink("Open Detail") {
                    DetailView()
                }
            }
        }
    }
}

struct DetailView: View {
    var body: some View {
        Text("Detail")
    }
}
```

Reasons:
- Only the **root** of a navigation flow needs a `NavigationStack`. Nested stacks create multiple back-stacks, broken titles, and double nav bars.
- Pushed/destination views are plain `View`s; the existing stack handles their nav bar.

> **React/Next:** like wrapping every page in its own `<Router>` — the routing tree is global, child pages don't redeclare it.
</details>

---

### B5. `NavigationLink` inside a Button's action

```swift
struct ContentView: View {
    var body: some View {
        NavigationStack {
            Button("Go to Detail") {
                NavigationLink("Detail") { DetailView() }   // wrong
            }
        }
    }
}

struct DetailView: View { var body: some View { Text("Detail") } }
```

<details><summary>Improved code & reasons</summary>

```swift
// Option A: just use a NavigationLink as the tappable row
struct ContentView: View {
    var body: some View {
        NavigationStack {
            NavigationLink("Go to Detail") { DetailView() }
        }
    }
}

// Option B: programmatic navigation if you really need a Button
struct ContentView: View {
    @State private var showDetail = false
    var body: some View {
        NavigationStack {
            Button("Go to Detail") { showDetail = true }
                .navigationDestination(isPresented: $showDetail) { DetailView() }
        }
    }
}
```

Reasons:
- A `NavigationLink` is itself a tappable view; constructing one inside a button's action does nothing. The action runs but there is no link in the hierarchy to push.
- For programmatic pushes, drive `.navigationDestination(isPresented:)` (or a `NavigationPath`) from the button's action.

> **React/Next:** like trying to render `<Link>` inside `onClick`. The fix mirrors React: either render the link declaratively, or imperatively call `router.push()` from the click handler — `.navigationDestination(isPresented:)` is SwiftUI's `router.push`.
</details>

---

### B6. Detail view receiving the entire list

```swift
struct Book: Identifiable, Hashable {
    let id = UUID()
    let title: String
}

struct DetailView: View {
    let books: [Book]
    let selectedIndex: Int
    var body: some View {
        Text(books[selectedIndex].title)
    }
}

struct ContentView: View {
    let books = [Book(title: "A"), Book(title: "B")]
    var body: some View {
        NavigationStack {
            List(books.indices, id: \.self) { i in
                NavigationLink("Open") {
                    DetailView(books: books, selectedIndex: i)
                }
            }
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct DetailView: View {
    let book: Book
    var body: some View {
        Text(book.title)
    }
}

struct ContentView: View {
    let books = [Book(title: "A"), Book(title: "B")]
    var body: some View {
        NavigationStack {
            List(books) { book in
                NavigationLink(book.title, value: book)
            }
            .navigationDestination(for: Book.self) { DetailView(book: $0) }
        }
    }
}
```

Reasons:
- A detail view should depend only on what it displays. Passing the whole list and an index couples it to the list's storage.
- Value-based navigation (`NavigationLink(value:)` + `.navigationDestination(for:)`) is the modern, type-safe form.

> **React:** classic prop-narrowing rule — `<BookDetail book={book} />` not `<BookDetail books={all} selectedIndex={i} />`. Component should depend only on what it renders.
</details>

---

### B7. Forgetting `Identifiable` conformance

```swift
struct Movie {
    let title: String
}

struct ContentView: View {
    let movies = [Movie(title: "Up"), Movie(title: "Cars")]
    var body: some View {
        List(movies) { movie in   // compile error
            Text(movie.title)
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct Movie: Identifiable {
    let id = UUID()
    let title: String
}

struct ContentView: View {
    let movies = [Movie(title: "Up"), Movie(title: "Cars")]
    var body: some View {
        List(movies) { movie in
            Text(movie.title)
        }
    }
}
```

Reasons:
- `List(items) { ... }` requires `Element: Identifiable`.
- Adding `let id = UUID()` is the cheapest way to get a stable identity.
- Alternative: `List(movies, id: \.title)` if titles are guaranteed unique.

> **React:** the equivalent of "forgot the `key` prop" — but Swift turns it into a compile error.
</details>

---

### B8. Class for the model when struct is enough

```swift
class Tag {
    let id = UUID()
    let name: String
    init(name: String) { self.name = name }
}

extension Tag: Identifiable {}
```

<details><summary>Improved code & reasons</summary>

```swift
struct Tag: Identifiable, Hashable {
    let id = UUID()
    let name: String
}
```

Reasons:
- Plain data with no shared mutable state should be a `struct` — value semantics, automatic `Hashable`/`Equatable` synthesis, no reference-cycle risk.
- `struct` plays nicely with SwiftUI diffing; class identity vs value identity can confuse `List`/`ForEach` updates.
- You also get `Hashable` synthesized for free, which `.navigationDestination(for:)` needs.

> **React:** in JS we don't have struct/class for data — but we use plain objects (value-ish) for data and reserve `class` for stateful machines. Same instinct.
</details>

---

### B9. Hard-coded array inside `body`

```swift
struct ContentView: View {
    var body: some View {
        List(["A", "B", "C"], id: \.self) { Text($0) }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct ContentView: View {
    let letters = ["A", "B", "C"]
    var body: some View {
        List(letters, id: \.self) { Text($0) }
    }
}
```

Reasons:
- `body` is recomputed on every state change; an inline literal allocates a new array each call.
- Stored properties make the data testable, previewable, and injectable from a parent view.

> **React:** equivalent to defining `const letters = [...]` inside the component function — every render gets a new array reference, breaking `useMemo` and child memoization. Lift it out (or wrap in `useMemo`).
</details>

---

### B10. Missing `Hashable` on `.navigationDestination(for:)` value

```swift
struct Book: Identifiable {
    let id = UUID()
    let title: String
}

struct ContentView: View {
    let books = [Book(title: "A"), Book(title: "B")]
    var body: some View {
        NavigationStack {
            List(books) { book in
                NavigationLink(book.title, value: book)   // compile error
            }
            .navigationDestination(for: Book.self) { Text($0.title) }
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct Book: Identifiable, Hashable {
    let id = UUID()
    let title: String
}
```

Reasons:
- `NavigationLink(value:)` requires the value to be `Hashable` so the stack can store and compare path elements.
- `Hashable` is auto-synthesized for structs whose stored properties are all `Hashable` (`UUID` and `String` are), so just declaring conformance is enough.
</details>

---

## Section C — View Decomposition (3 list-screen wireframes)

### C1. Contacts list

```
+--------------------------------------------+
| Contacts                                   |
+--------------------------------------------+
| (AB)  Alice Brown                       >  |
|       +66 81 234 5678                      |
+--------------------------------------------+
| (CD)  Charlie Davis                     >  |
|       +66 92 555 0001                      |
+--------------------------------------------+
| (EF)  Eva Fox                           >  |
|       +66 88 777 1212                      |
+--------------------------------------------+
```

<details><summary>Reference solution</summary>

```swift
struct Contact: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let phone: String
    var initials: String {
        name.split(separator: " ").compactMap { $0.first }.map(String.init).joined()
    }
}

struct ContactRow: View {
    let contact: Contact
    var body: some View {
        HStack(spacing: 12) {
            Text(contact.initials)
                .font(.headline)
                .foregroundStyle(.white)
                .frame(width: 44, height: 44)
                .background(Circle().fill(.blue))
            VStack(alignment: .leading, spacing: 2) {
                Text(contact.name).font(.body)
                Text(contact.phone).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right").foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

struct ContactsScreen: View {
    let contacts = [
        Contact(name: "Alice Brown",  phone: "+66 81 234 5678"),
        Contact(name: "Charlie Davis", phone: "+66 92 555 0001"),
        Contact(name: "Eva Fox",       phone: "+66 88 777 1212")
    ]
    var body: some View {
        NavigationStack {
            List(contacts) { c in
                NavigationLink(value: c) { ContactRow(contact: c) }
            }
            .navigationDestination(for: Contact.self) { c in
                Text(c.name).font(.largeTitle)
            }
            .navigationTitle("Contacts")
        }
    }
}
```

</details>

---

### C2. Email inbox

```
+----------------------------------------------+
| Inbox                                        |
+----------------------------------------------+
| * Alice Brown                       09:42    |
|   Project kickoff                            |
|   Hi team, just to confirm tomorrow...       |
+----------------------------------------------+
|   Mailer Daemon                     08:10    |
|   Delivery receipt                           |
|   Your message has been delivered...         |
+----------------------------------------------+
| * Charlie Davis                    Yesterday |
|   Re: invoice                                |
|   Thanks, paid this morning...               |
+----------------------------------------------+

(* indicates unread)
```

<details><summary>Reference solution</summary>

```swift
struct Email: Identifiable, Hashable {
    let id = UUID()
    let sender: String
    let subject: String
    let preview: String
    let time: String
    let unread: Bool
}

struct EmailRow: View {
    let email: Email
    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Circle()
                .fill(email.unread ? Color.blue : Color.clear)
                .frame(width: 8, height: 8)
                .padding(.top, 6)
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(email.sender)
                        .font(.headline)
                        .fontWeight(email.unread ? .bold : .regular)
                    Spacer()
                    Text(email.time)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Text(email.subject).font(.subheadline)
                Text(email.preview)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }
}

struct InboxScreen: View {
    let emails: [Email] = [
        Email(sender: "Alice Brown", subject: "Project kickoff",
              preview: "Hi team, just to confirm tomorrow...",
              time: "09:42", unread: true),
        Email(sender: "Mailer Daemon", subject: "Delivery receipt",
              preview: "Your message has been delivered...",
              time: "08:10", unread: false),
        Email(sender: "Charlie Davis", subject: "Re: invoice",
              preview: "Thanks, paid this morning...",
              time: "Yesterday", unread: true)
    ]
    var body: some View {
        NavigationStack {
            List(emails) { e in
                NavigationLink(value: e) { EmailRow(email: e) }
            }
            .navigationDestination(for: Email.self) { e in
                Text(e.subject).font(.title)
            }
            .navigationTitle("Inbox")
        }
    }
}
```

</details>

---

### C3. Music tracks

```
+----------------------------------------------+
| Album                                        |
+----------------------------------------------+
| 1   Lost in Tokyo                       3:42 |
|     Akira Sato                               |
+----------------------------------------------+
| 2   Sunrise Drive                       4:15 |
|     The Highways                             |
+----------------------------------------------+
| 3   Quiet Coast                         5:01 |
|     Mira Lee                                 |
+----------------------------------------------+
```

<details><summary>Reference solution</summary>

```swift
struct Track: Identifiable, Hashable {
    let id = UUID()
    let number: Int
    let title: String
    let artist: String
    let duration: String
}

struct TrackRow: View {
    let track: Track
    var body: some View {
        HStack(spacing: 12) {
            Text("\(track.number)")
                .font(.system(.body, design: .monospaced))
                .frame(width: 24, alignment: .trailing)
                .foregroundStyle(.secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(track.title).font(.body)
                Text(track.artist).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
            Text(track.duration)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 2)
    }
}

struct AlbumScreen: View {
    let tracks: [Track] = [
        Track(number: 1, title: "Lost in Tokyo",  artist: "Akira Sato",   duration: "3:42"),
        Track(number: 2, title: "Sunrise Drive",  artist: "The Highways", duration: "4:15"),
        Track(number: 3, title: "Quiet Coast",    artist: "Mira Lee",     duration: "5:01")
    ]
    var body: some View {
        NavigationStack {
            List(tracks) { t in TrackRow(track: t) }
                .navigationTitle("Album")
        }
    }
}
```

</details>

---

## Section D — Practical Mini-Tasks (5 tasks)

### D1. Book list with detail navigation

Starter:

```swift
struct Book {
    let title: String
    let author: String
}

let library = [
    Book(title: "1984", author: "Orwell"),
    Book(title: "Dune", author: "Herbert"),
    Book(title: "Sapiens", author: "Harari")
]

struct ContentView: View {
    var body: some View {
        Text("TODO: list of books, tap pushes a detail view")
    }
}
```

Your task: render `library` in a `List` inside a `NavigationStack`. Tapping a row pushes a detail screen showing the title (large) and author (subhead). Use value-based navigation.

<details><summary>Reference solution</summary>

```swift
struct Book: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let author: String
}

let library = [
    Book(title: "1984",    author: "Orwell"),
    Book(title: "Dune",    author: "Herbert"),
    Book(title: "Sapiens", author: "Harari")
]

struct BookDetail: View {
    let book: Book
    var body: some View {
        VStack(spacing: 12) {
            Text(book.title).font(.largeTitle).bold()
            Text(book.author).font(.subheadline).foregroundStyle(.secondary)
            Spacer()
        }
        .padding()
        .navigationTitle(book.title)
    }
}

struct ContentView: View {
    var body: some View {
        NavigationStack {
            List(library) { book in
                NavigationLink(value: book) {
                    VStack(alignment: .leading) {
                        Text(book.title).font(.headline)
                        Text(book.author).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
            }
            .navigationDestination(for: Book.self) { BookDetail(book: $0) }
            .navigationTitle("Library")
        }
    }
}
```

> **React/Next:** structurally identical to a `pages/index.tsx` that maps `<Link href={\`/books/${id}\`}>` and a `pages/books/[id].tsx` that renders the detail. Swift bundles both into one file via the `for: Book.self` destination.
</details>

---

### D2. Refactor a 40-line inline row into `BookRow`

Starter:

```swift
struct Book: Identifiable, Hashable {
    let id = UUID()
    let cover: String
    let title: String
    let author: String
    let year: Int
    let rating: Double
}

struct ContentView: View {
    let books: [Book] = []
    var body: some View {
        NavigationStack {
            List(books) { book in
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: book.cover)
                        .resizable()
                        .frame(width: 50, height: 70)
                        .foregroundStyle(.indigo)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(book.title)
                            .font(.headline)
                            .lineLimit(2)
                        Text(book.author)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        HStack(spacing: 4) {
                            Image(systemName: "star.fill")
                                .foregroundStyle(.yellow)
                                .font(.caption)
                            Text(String(format: "%.1f", book.rating))
                                .font(.caption)
                            Text("(\(book.year))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                }
                .padding(.vertical, 4)
            }
            .navigationTitle("Library")
        }
    }
}
```

Your task: extract the row into a separate `BookRow` view. The list body should be one or two lines.

<details><summary>Reference solution</summary>

```swift
struct BookRow: View {
    let book: Book
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: book.cover)
                .resizable()
                .frame(width: 50, height: 70)
                .foregroundStyle(.indigo)
            VStack(alignment: .leading, spacing: 4) {
                Text(book.title).font(.headline).lineLimit(2)
                Text(book.author).font(.subheadline).foregroundStyle(.secondary)
                HStack(spacing: 4) {
                    Image(systemName: "star.fill")
                        .foregroundStyle(.yellow).font(.caption)
                    Text(String(format: "%.1f", book.rating)).font(.caption)
                    Text("(\(book.year))").font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}

struct ContentView: View {
    let books: [Book] = []
    var body: some View {
        NavigationStack {
            List(books) { BookRow(book: $0) }
                .navigationTitle("Library")
        }
    }
}
```

> **React:** identical refactor — extract `<BookRow book={book} />`. Same readability/reusability win.
</details>

---

### D3. Add `Hashable` so `.navigationDestination(for: Book.self)` compiles

Starter:

```swift
struct Book: Identifiable {
    let id = UUID()
    let title: String
    let author: String
}

struct ContentView: View {
    let books = [Book(title: "1984", author: "Orwell")]
    var body: some View {
        NavigationStack {
            List(books) { book in
                NavigationLink(book.title, value: book)   // error: Book not Hashable
            }
            .navigationDestination(for: Book.self) { b in
                Text(b.title)
            }
        }
    }
}
```

Your task: make this compile by adding the minimum necessary conformance. Do not change the model's stored properties.

<details><summary>Reference solution</summary>

```swift
struct Book: Identifiable, Hashable {
    let id = UUID()
    let title: String
    let author: String
}
```

Reasons:
- All stored properties (`UUID`, `String`) are `Hashable`, so Swift synthesizes `Hashable` for free as soon as you declare the conformance.
- `NavigationLink(value:)` and `NavigationPath` both require `Hashable` so values can be stored in the navigation path.
</details>

---

### D4. Two-level navigation: Categories -> Items -> Item detail

Starter:

```swift
let data: [String: [String]] = [
    "Fruit":     ["Apple", "Banana", "Cherry"],
    "Vegetable": ["Kale", "Carrot", "Onion"]
]

struct ContentView: View {
    var body: some View {
        Text("TODO: Categories -> Items -> Item detail")
    }
}
```

Your task: build a screen that lists category names. Tapping a category pushes a list of its items. Tapping an item pushes a detail screen showing the item name. Use value-based navigation with **all destinations registered on the root**.

<details><summary>Reference solution</summary>

```swift
struct Category: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let items: [String]
}

let categories = [
    Category(name: "Fruit",     items: ["Apple", "Banana", "Cherry"]),
    Category(name: "Vegetable", items: ["Kale", "Carrot", "Onion"])
]

struct ItemList: View {
    let category: Category
    var body: some View {
        List(category.items, id: \.self) { item in
            NavigationLink(item, value: item)
        }
        .navigationTitle(category.name)
    }
}

struct ItemDetail: View {
    let name: String
    var body: some View {
        Text("Detail: \(name)").font(.largeTitle)
            .navigationTitle(name)
    }
}

struct ContentView: View {
    var body: some View {
        NavigationStack {
            List(categories) { cat in
                NavigationLink(cat.name, value: cat)
            }
            .navigationTitle("Categories")
            .navigationDestination(for: Category.self) { ItemList(category: $0) }
            .navigationDestination(for: String.self)   { ItemDetail(name: $0) }
        }
    }
}
```

Notes:
- Both destinations are attached to the root `List`, not inside `ItemList`. Registering them on a pushed child will silently fail.
- `Category` is `Hashable` (synthesized), and `String` is already `Hashable`.

> **React/Next:** `pages/categories/index.tsx` -> `pages/categories/[name]/index.tsx` -> `pages/categories/[name]/[item].tsx`. SwiftUI declares all three destinations on the root view in one place.
</details>

---

### D5. Make a list of strings compile without changing the data type

Starter:

```swift
struct ContentView: View {
    let cities = ["Bangkok", "Tokyo", "Seoul"]
    var body: some View {
        // compile error: String not Identifiable
        List(cities) { city in
            Text(city)
        }
    }
}
```

Your task: make this compile. You may not wrap the strings in a struct; the data must stay `[String]`.

<details><summary>Reference solution</summary>

```swift
struct ContentView: View {
    let cities = ["Bangkok", "Tokyo", "Seoul"]
    var body: some View {
        List(cities, id: \.self) { city in
            Text(city)
        }
    }
}
```

Reasons:
- `String` is `Hashable`, so `\.self` is a valid `KeyPath<String, String>` for the `id:` parameter.
- Watch out: if the array can contain duplicate strings, runtime SwiftUI will warn about duplicate IDs. In that case wrap in a struct or iterate `cities.indices` instead.

For comparison — `NavigationView` (legacy, pre-iOS 16):

```swift
NavigationView {
    List(cities, id: \.self) { Text($0) }
}
// Still works on older iOS but exam answers should prefer NavigationStack.
```

> **React:** `cities.map(c => <li key={c}>{c}</li>)` — using the value as key. Same risk: duplicates break diffing.
</details>

---

## Section E — View Decomposition (row + parent extraction)

### E1. Contacts list with row decomposition

```
+------------------------------------------------+
| Contacts                                       |
+------------------------------------------------+
| [O]  Alice Brown                            >  |
|      +66 81 234 5678                           |
+------------------------------------------------+
| [O]  Charlie Davis                          >  |
|      charlie@example.com                       |
+------------------------------------------------+
| [O]  Eva Fox                                >  |
|      +66 88 777 1212                           |
+------------------------------------------------+

[O] = circular avatar, name is bold, subtitle is gray,
      `>` is the trailing chevron, tapping pushes detail.
```

Your task: split this screen into three pieces.

1. A `Contact: Identifiable` model with `name` and `subtitle` (phone or email).
2. A `struct ContactRow: View` that takes a single `Contact` and renders one row: avatar on the left (`Image(systemName: "person.circle.fill")`), name + subtitle stacked vertically in the middle (name `.headline`, subtitle `.secondary`), trailing chevron.
3. A `struct ContactsList: View` that wraps a `NavigationStack` + `List` of contacts, each row a `NavigationLink` that pushes a placeholder `ContactDetail` view.

<details><summary>Reference solution</summary>

```swift
struct Contact: Identifiable, Hashable {
    let id = UUID()
    let name: String
    let subtitle: String
}

struct ContactRow: View {
    let contact: Contact
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.circle.fill")
                .resizable()
                .frame(width: 44, height: 44)
                .foregroundStyle(.blue)
            VStack(alignment: .leading, spacing: 2) {
                Text(contact.name).font(.headline)
                Text(contact.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}

struct ContactDetail: View {
    let contact: Contact
    var body: some View {
        VStack(spacing: 8) {
            Text(contact.name).font(.largeTitle).bold()
            Text(contact.subtitle).foregroundStyle(.secondary)
            Spacer()
        }
        .padding()
        .navigationTitle(contact.name)
    }
}

struct ContactsList: View {
    let contacts = [
        Contact(name: "Alice Brown",   subtitle: "+66 81 234 5678"),
        Contact(name: "Charlie Davis", subtitle: "charlie@example.com"),
        Contact(name: "Eva Fox",       subtitle: "+66 88 777 1212")
    ]

    var body: some View {
        NavigationStack {
            List(contacts) { contact in
                NavigationLink(value: contact) {
                    ContactRow(contact: contact)
                }
            }
            .navigationDestination(for: Contact.self) { ContactDetail(contact: $0) }
            .navigationTitle("Contacts")
        }
    }
}
```

Notes: the trailing `>` chevron is drawn automatically by `NavigationLink` inside a `List`, so the manual `Image(systemName: "chevron.right")` in `ContactRow` is technically redundant — keep it only if you want the row to look the same outside a `NavigationLink` context (e.g., previews, search results). `Contact` is `Hashable` so `NavigationLink(value:)` + `.navigationDestination(for:)` compile.

> **React/Next:** `<ContactRow contact={c} />` inside `contacts.map(...)` plus a `pages/contacts/[id].tsx` for the detail. SwiftUI's value-based navigation collapses the routing table into one `.navigationDestination(for: Contact.self)` modifier.
</details>

