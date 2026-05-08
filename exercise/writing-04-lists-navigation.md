# Topic 4 -- Lists & Navigation: Writing Drills

Hands-on counterpart to `exercises-04-lists-navigation.md`. You write the
code; the solution block is for grading yourself afterwards. iOS 17+ syntax
(`@Observable`, `@Bindable`, `NavigationStack`, value-based navigation).

Six exercises, easy -> exam-level. Budget per exercise is in the heading.

---

## Ex 1 -- Wireframe: simple shopping list (~8 min)

Target wireframe (ASCII, monospace):

```
+----------------------------------+
| Shopping                         |
+----------------------------------+
| Milk                             |
| 1 gallon                         |
+----------------------------------+
| Bread                            |
| Sourdough loaf                   |
+----------------------------------+
| Eggs                             |
| One dozen, large                 |
+----------------------------------+
| Cheese                           |
| Cheddar block                    |
+----------------------------------+
```

Behavior:
- A `NavigationStack` wraps the screen with the title `Shopping` (large
  display mode is fine; do not change it).
- Render the four items in a `List`. Default `.listStyle` is acceptable;
  separators between rows must be visible.
- Each row shows two text lines: the `name` on top (headline weight) and the
  `note` below (subheadline, secondary color).
- The data is a stored `[GroceryItem]` with `Identifiable` conformance using
  `UUID`. No `id: \.self` -- the model carries its own identity.
- No tap-to-detail yet; rows are non-interactive.

Write the screen plus the `GroceryItem` model from a blank file.

<details><summary>Solution</summary>

```swift
import SwiftUI

struct GroceryItem: Identifiable {
    let id = UUID()
    let name: String
    let note: String
}

struct ShoppingScreen: View {
    let items: [GroceryItem] = [
        GroceryItem(name: "Milk",   note: "1 gallon"),
        GroceryItem(name: "Bread",  note: "Sourdough loaf"),
        GroceryItem(name: "Eggs",   note: "One dozen, large"),
        GroceryItem(name: "Cheese", note: "Cheddar block"),
    ]

    var body: some View {
        NavigationStack {
            List(items) { item in
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name).font(.headline)
                    Text(item.note)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Shopping")
        }
    }
}
```

Why: `Identifiable` + `UUID` gives every row a stable identity, so SwiftUI
can diff inserts/removals/moves correctly. `List(items)` takes the trailing
closure as the row builder -- no `id:` parameter needed when the element is
`Identifiable`. `.navigationTitle` lives on the `List`, inside the stack, not
on the `NavigationStack` itself.
</details>

---

## Ex 2 -- Refactor: a graveyard of list smells (~12 min)

This compiles only with squinting and luck. List every smell you see, then
rewrite it. Aim for at least four.

```swift
import SwiftUI

struct Note {
    var title: String
    var body: String?
}

struct NotesScreen: View {
    var notes: [Note] = [
        Note(title: "Buy milk", body: "2 gallons"),
        Note(title: "Call mom", body: nil),
        Note(title: "Buy milk", body: "skim"),
    ]

    var body: some View {
        List {
            ForEach(notes.indices, id: \.self) { i in
                NavigationLink(notes[i].title) {
                    VStack {
                        Text(notes[i].title).font(.headline)
                        Text(notes[i].body!)
                    }
                }
            }
            .onDelete { idx in
                notes.remove(atOffsets: idx)
            }
        }
        .navigationTitle("Notes")
    }
}
```

<details><summary>Solution</summary>

Smells:
- `NavigationLink` is used with no `NavigationStack` anywhere -- tapping a
  row does nothing visible. The screen needs a `NavigationStack` root.
- `ForEach(notes.indices, id: \.self)` uses positional index as identity.
  Delete or reorder, and every row's id shifts -- SwiftUI animates the wrong
  rows. Classic index trap.
- `Note` has no `Identifiable` conformance and no `UUID`. Add `Identifiable`
  with `id = UUID()` for stable identity across mutations.
- `Text(notes[i].body!)` force-unwraps `String?`. `Note(title: "Call mom",
  body: nil)` crashes on render. Use `if let`.
- Data has duplicate titles. `id: \.title` would log "ID occurs multiple
  times" at runtime. UUID-per-row is the safe answer.
- `var notes: [Note] = [...]` is stored on a struct view, then mutated from
  a closure -- does not compile. Must be `@State`.
- No row component extracted; the body is hard to read once it grows.

Rewritten:

```swift
import SwiftUI

struct Note: Identifiable {
    let id = UUID()
    var title: String
    var body: String?
}

struct NoteRow: View {
    let note: Note
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(note.title).font(.headline)
            if let body = note.body, !body.isEmpty {
                Text(body)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct NotesScreen: View {
    @State private var notes: [Note] = [
        Note(title: "Buy milk", body: "2 gallons"),
        Note(title: "Call mom", body: nil),
        Note(title: "Buy milk", body: "skim"),
    ]

    var body: some View {
        NavigationStack {
            List {
                ForEach(notes) { note in
                    NavigationLink(value: note.id) {
                        NoteRow(note: note)
                    }
                }
                .onDelete { offsets in notes.remove(atOffsets: offsets) }
            }
            .navigationTitle("Notes")
            .navigationDestination(for: UUID.self) { id in
                if let n = notes.first(where: { $0.id == id }) {
                    NoteRow(note: n).padding()
                }
            }
        }
    }
}
```

Why: stable `UUID` identity survives deletes and duplicates, the
`NavigationStack` makes the link tappable, `if let` removes the crash, and
the row is now a small reusable view.
</details>

---

## Ex 3 -- Mini-project: editable task list with `@Observable` VM (~15 min)

Spec:
- A view model `TaskListVM` exposes `tasks: [TaskItem]`. Each `TaskItem` is
  `Identifiable` with `id = UUID()`, `title: String`, and `done: Bool`.
- Methods on the VM:
  - `add(title: String)` -- ignores blank/whitespace-only input; appends a
    new task with `done = false`.
  - `toggle(id: UUID)` -- flips the `done` flag of the task with that id;
    no-op if not found.
  - `remove(at offsets: IndexSet)` -- removes by `IndexSet` (so `.onDelete`
    can call it directly).
  - `move(from src: IndexSet, to dst: Int)` -- standard array reorder.
- Computed `remainingCount: Int` returns the number of `done == false`
  tasks.
- The view is your call but the tests only drive the VM.

Starter (`ContentView.swift`):

```swift
import SwiftUI
import Observation

struct TaskItem: Identifiable {
    let id = UUID()
    var title: String
    var done: Bool
}

@Observable
final class TaskListVM {
    var tasks: [TaskItem] = []
    // TODO
}

struct ContentView: View {
    var body: some View { Text("TODO") }
}
```

Oracle (`Tests.swift`) -- your code is "done" when these pass:

```swift
import XCTest
@testable import App

final class TaskListVMTests: XCTestCase {
    func test_add_appends_a_task() {
        let vm = TaskListVM()
        vm.add(title: "Buy milk")
        XCTAssertEqual(vm.tasks.count, 1)
        XCTAssertEqual(vm.tasks[0].title, "Buy milk")
        XCTAssertFalse(vm.tasks[0].done)
    }

    func test_add_ignores_blank_input() {
        let vm = TaskListVM()
        vm.add(title: "")
        vm.add(title: "   ")
        XCTAssertTrue(vm.tasks.isEmpty)
    }

    func test_toggle_flips_done() {
        let vm = TaskListVM()
        vm.add(title: "A")
        let id = vm.tasks[0].id
        vm.toggle(id: id)
        XCTAssertTrue(vm.tasks[0].done)
        vm.toggle(id: id)
        XCTAssertFalse(vm.tasks[0].done)
    }

    func test_toggle_unknown_id_is_noop() {
        let vm = TaskListVM()
        vm.add(title: "A")
        vm.toggle(id: UUID())
        XCTAssertFalse(vm.tasks[0].done)
    }

    func test_remove_at_offsets() {
        let vm = TaskListVM()
        ["A", "B", "C"].forEach { vm.add(title: $0) }
        vm.remove(at: IndexSet(integer: 1))
        XCTAssertEqual(vm.tasks.map(\.title), ["A", "C"])
    }

    func test_move_reorders() {
        let vm = TaskListVM()
        ["A", "B", "C"].forEach { vm.add(title: $0) }
        vm.move(from: IndexSet(integer: 0), to: 3)
        XCTAssertEqual(vm.tasks.map(\.title), ["B", "C", "A"])
    }

    func test_remainingCount_excludes_done() {
        let vm = TaskListVM()
        ["A", "B", "C"].forEach { vm.add(title: $0) }
        vm.toggle(id: vm.tasks[1].id)
        XCTAssertEqual(vm.remainingCount, 2)
    }
}
```

<details><summary>Solution</summary>

```swift
import SwiftUI
import Observation

struct TaskItem: Identifiable {
    let id = UUID()
    var title: String
    var done: Bool
}

@Observable
final class TaskListVM {
    var tasks: [TaskItem] = []

    var remainingCount: Int { tasks.filter { !$0.done }.count }

    func add(title: String) {
        let trimmed = title.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        tasks.append(TaskItem(title: trimmed, done: false))
    }

    func toggle(id: UUID) {
        guard let i = tasks.firstIndex(where: { $0.id == id }) else { return }
        tasks[i].done.toggle()
    }

    func remove(at offsets: IndexSet) {
        tasks.remove(atOffsets: offsets)
    }

    func move(from src: IndexSet, to dst: Int) {
        tasks.move(fromOffsets: src, toOffset: dst)
    }
}

struct ContentView: View {
    @State private var vm = TaskListVM()
    @State private var draft: String = ""

    var body: some View {
        NavigationStack {
            List {
                Section("New") {
                    HStack {
                        TextField("Title", text: $draft)
                        Button("Add") {
                            vm.add(title: draft)
                            draft = ""
                        }
                        .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty)
                    }
                }
                Section("Tasks (\(vm.remainingCount) left)") {
                    ForEach(vm.tasks) { t in
                        HStack {
                            Image(systemName: t.done ? "checkmark.circle.fill" : "circle")
                            Text(t.title).strikethrough(t.done)
                        }
                        .contentShape(Rectangle())
                        .onTapGesture { vm.toggle(id: t.id) }
                    }
                    .onDelete { vm.remove(at: $0) }
                    .onMove   { vm.move(from: $0, to: $1) }
                }
            }
            .navigationTitle("Tasks")
            .toolbar { EditButton() }
        }
    }
}
```

Why: the model owns the array; the view binds to it through `@State private
var vm`. `IndexSet` plumbing on `remove`/`move` lets `.onDelete`/`.onMove`
forward straight from the `ForEach` without recomputing offsets in the view.
The tests poke the VM directly -- which is exactly how the practical exam
grades editable lists.
</details>

---

## Ex 4 -- Wireframe: sectioned event list with tap-to-detail (~15 min)

Target wireframe (ASCII, monospace):

```
+------------------------------------------+
| Schedule                                 |
+------------------------------------------+
| Today                                    |
+------------------------------------------+
| 09:00  Standup                       >   |
|        Conference Room A                 |
+------------------------------------------+
| 11:30  Lunch with Mira                >  |
|        Cafe Yamamoto                     |
+------------------------------------------+
| Tomorrow                                 |
+------------------------------------------+
| 10:00  Design review                  >  |
|        Zoom                              |
+------------------------------------------+
| 14:00  1:1 with Tae                   >  |
|        Coffee corner                     |
+------------------------------------------+
```

Behavior:
- A `NavigationStack` wraps a `List` titled `Schedule`. Display mode is
  default (large title is fine).
- Two sections with header text `Today` and `Tomorrow`. Section headers are
  visible above their rows; default `.listStyle` (`.insetGrouped`) is
  acceptable as long as headers are visible.
- Each row shows a monospaced `time` on the leading edge (`09:00`), then a
  `VStack` with `title` (body weight) and `location` (subheadline,
  secondary). A trailing `>` chevron from the system disclosure indicator
  (the framework draws it for `NavigationLink`; you do not need to add an
  Image).
- Tapping a row pushes a detail screen showing `title` (largeTitle),
  `time` and `location` underneath. Use **value-based navigation** with
  `NavigationLink(value:)` and `.navigationDestination(for: Event.self)`
  registered on the root list.
- The `Event` model is `Identifiable` and `Hashable` (synthesized).

Build the parent screen, the row component, and the detail.

<details><summary>Solution</summary>

```swift
import SwiftUI

struct Event: Identifiable, Hashable {
    let id = UUID()
    let day: String      // "Today" or "Tomorrow"
    let time: String
    let title: String
    let location: String
}

struct EventRow: View {
    let event: Event
    var body: some View {
        HStack(spacing: 12) {
            Text(event.time)
                .font(.system(.body, design: .monospaced))
                .foregroundStyle(.secondary)
                .frame(width: 56, alignment: .leading)
            VStack(alignment: .leading, spacing: 2) {
                Text(event.title)
                Text(event.location)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }
}

struct EventDetail: View {
    let event: Event
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(event.title).font(.largeTitle).bold()
            Text(event.time).font(.title3).foregroundStyle(.secondary)
            Text(event.location).font(.body)
            Spacer()
        }
        .padding()
        .navigationTitle(event.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ScheduleScreen: View {
    let events: [Event] = [
        Event(day: "Today",    time: "09:00",
              title: "Standup", location: "Conference Room A"),
        Event(day: "Today",    time: "11:30",
              title: "Lunch with Mira", location: "Cafe Yamamoto"),
        Event(day: "Tomorrow", time: "10:00",
              title: "Design review", location: "Zoom"),
        Event(day: "Tomorrow", time: "14:00",
              title: "1:1 with Tae", location: "Coffee corner"),
    ]

    var body: some View {
        NavigationStack {
            List {
                Section("Today") {
                    ForEach(events.filter { $0.day == "Today" }) { e in
                        NavigationLink(value: e) { EventRow(event: e) }
                    }
                }
                Section("Tomorrow") {
                    ForEach(events.filter { $0.day == "Tomorrow" }) { e in
                        NavigationLink(value: e) { EventRow(event: e) }
                    }
                }
            }
            .navigationTitle("Schedule")
            .navigationDestination(for: Event.self) { EventDetail(event: $0) }
        }
    }
}
```

Why: `Section("Header")` gives the visible group titles. `Hashable` is the
contract `.navigationDestination(for:)` checks; `UUID` and `String` are both
`Hashable`, so synthesis is free. The destination is registered on the root
list -- registering it inside `EventDetail` would silently fail the second
push.
</details>

---

## Ex 5 -- Mini-project: master/detail with `NavigationPath` (~20 min)

Spec:
- A view model `LibraryVM` exposes:
  - `books: [Book]` (Identifiable, Hashable, with `id: UUID`, `title:
    String`, `author: String`).
  - `path: NavigationPath` (default-empty).
  - Method `open(_ book: Book)` -- appends `book` to `path`.
  - Method `pop()` -- removes the last element from `path` (no-op if
    empty).
  - Method `popToRoot()` -- empties `path`.
  - Computed `depth: Int` -- the count of items on the path.
- The view (drilling not required by tests but part of the deliverable)
  uses `NavigationStack(path: $vm.path)` rooted on a list of books. Tapping
  a row calls `vm.open(book)`. The detail screen has a button `Pop` that
  calls `vm.pop()` and a button `Home` that calls `vm.popToRoot()`.
- All destinations registered on the root via
  `.navigationDestination(for: Book.self)`.

Starter (`ContentView.swift`):

```swift
import SwiftUI
import Observation

struct Book: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var author: String
}

@Observable
final class LibraryVM {
    var books: [Book] = [
        Book(title: "1984",    author: "Orwell"),
        Book(title: "Dune",    author: "Herbert"),
        Book(title: "Sapiens", author: "Harari"),
    ]
    var path = NavigationPath()
    // TODO: open / pop / popToRoot / depth
}

struct ContentView: View {
    var body: some View { Text("TODO") }
}
```

Oracle (`Tests.swift`):

```swift
import XCTest
@testable import App

final class LibraryVMTests: XCTestCase {
    func test_initial_path_is_empty() {
        let vm = LibraryVM()
        XCTAssertEqual(vm.depth, 0)
    }

    func test_open_pushes_book_onto_path() {
        let vm = LibraryVM()
        vm.open(vm.books[0])
        XCTAssertEqual(vm.depth, 1)
    }

    func test_open_twice_pushes_twice() {
        let vm = LibraryVM()
        vm.open(vm.books[0])
        vm.open(vm.books[1])
        XCTAssertEqual(vm.depth, 2)
    }

    func test_pop_removes_one_level() {
        let vm = LibraryVM()
        vm.open(vm.books[0])
        vm.open(vm.books[1])
        vm.pop()
        XCTAssertEqual(vm.depth, 1)
    }

    func test_pop_on_empty_is_safe() {
        let vm = LibraryVM()
        vm.pop()
        XCTAssertEqual(vm.depth, 0)
    }

    func test_popToRoot_clears_path() {
        let vm = LibraryVM()
        vm.open(vm.books[0])
        vm.open(vm.books[1])
        vm.open(vm.books[2])
        vm.popToRoot()
        XCTAssertEqual(vm.depth, 0)
    }
}
```

<details><summary>Solution</summary>

```swift
import SwiftUI
import Observation

struct Book: Identifiable, Hashable {
    let id = UUID()
    var title: String
    var author: String
}

@Observable
final class LibraryVM {
    var books: [Book] = [
        Book(title: "1984",    author: "Orwell"),
        Book(title: "Dune",    author: "Herbert"),
        Book(title: "Sapiens", author: "Harari"),
    ]
    var path = NavigationPath()

    var depth: Int { path.count }

    func open(_ book: Book) {
        path.append(book)
    }

    func pop() {
        guard !path.isEmpty else { return }
        path.removeLast()
    }

    func popToRoot() {
        path.removeLast(path.count)
    }
}

struct ContentView: View {
    @State private var vm = LibraryVM()

    var body: some View {
        NavigationStack(path: $vm.path) {
            List(vm.books) { book in
                Button {
                    vm.open(book)
                } label: {
                    VStack(alignment: .leading) {
                        Text(book.title).font(.headline)
                        Text(book.author)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .buttonStyle(.plain)
            }
            .navigationTitle("Library")
            .navigationDestination(for: Book.self) { book in
                BookDetail(book: book, vm: vm)
            }
        }
    }
}

struct BookDetail: View {
    let book: Book
    @Bindable var vm: LibraryVM

    var body: some View {
        VStack(spacing: 16) {
            Text(book.title).font(.largeTitle).bold()
            Text(book.author).foregroundStyle(.secondary)

            HStack(spacing: 12) {
                Button("Pop") { vm.pop() }
                Button("Home") { vm.popToRoot() }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .navigationTitle(book.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
```

Why: storing the `NavigationPath` on the VM is what makes "programmatic
navigation" testable -- the tests never touch a view, they manipulate the
path directly. Empty-guard inside `pop()` keeps the API safe;
`removeLast(path.count)` is the documented way to clear a `NavigationPath`.
</details>

---

## Ex 6 -- Mini-project: filterable contacts with edit-roundtrip (~30 min)

Spec:
- A view model `ContactsVM` owns:
  - `contacts: [Contact]` -- `Contact` is `Identifiable` and `Hashable`
    with `id = UUID()`, `var name: String`, `var phone: String`,
    `var favorite: Bool`.
  - `query: String` -- the live filter text (default `""`).
  - `sortBy: SortKey` -- enum `.name | .phone`, default `.name`.
  - `path = NavigationPath()` for programmatic push of the editor.
  - `lastDeleted: Contact?` and `lastDeletedIndex: Int?` for one-step undo.
- Computed `visible: [Contact]`:
  - If `query` (trimmed) is empty, returns all contacts.
  - Otherwise, returns contacts whose `name` or `phone` contains `query`
    (case-insensitive).
  - Then sorted by `sortBy`: `.name` -> alphabetical by `name`; `.phone` ->
    alphabetical by `phone`. Sorting is stable in the natural sense (use
    `<` on the chosen field).
- Methods:
  - `add(name: String, phone: String)` -- ignore if `name` is blank after
    trimming; append a new contact with `favorite = false`.
  - `update(_ edited: Contact)` -- replace by `id`. No-op if not found.
    This is the edit-roundtrip path the detail screen calls.
  - `toggleFavorite(id: UUID)` -- flips the flag of the matching contact.
  - `delete(id: UUID)` -- removes by id. Stores the deleted contact and its
    original index in `lastDeleted`/`lastDeletedIndex` so `undoDelete()`
    can restore it.
  - `undoDelete()` -- if `lastDeleted` is non-nil, reinsert at the stored
    index (clamped to `0...contacts.count`), then clear the undo state.
- Tests drive the VM. The view layer (sketched in the solution) wires a
  `searchable`, a sort `Picker`, a master list with `NavigationLink(value:
  contact)`, an editor screen with `@Bindable var draft`, and a `Save`
  button that calls `vm.update(draft)` then pops.

Starter (`ContentView.swift`):

```swift
import SwiftUI
import Observation

struct Contact: Identifiable, Hashable {
    let id = UUID()
    var name: String
    var phone: String
    var favorite: Bool = false
}

enum SortKey { case name, phone }

@Observable
final class ContactsVM {
    var contacts: [Contact] = []
    var query: String = ""
    var sortBy: SortKey = .name
    var path = NavigationPath()

    var lastDeleted: Contact? = nil
    var lastDeletedIndex: Int? = nil

    var visible: [Contact] { [] /* TODO */ }

    func add(name: String, phone: String) { /* TODO */ }
    func update(_ edited: Contact) { /* TODO */ }
    func toggleFavorite(id: UUID) { /* TODO */ }
    func delete(id: UUID) { /* TODO */ }
    func undoDelete() { /* TODO */ }
}

struct ContentView: View {
    var body: some View { Text("TODO") }
}
```

Oracle (`Tests.swift`):

```swift
import XCTest
@testable import App

final class ContactsVMTests: XCTestCase {

    private func seeded() -> ContactsVM {
        let vm = ContactsVM()
        vm.contacts = [
            Contact(name: "Charlie", phone: "555-0003"),
            Contact(name: "Alice",   phone: "555-0001"),
            Contact(name: "Bob",     phone: "555-0002"),
        ]
        return vm
    }

    func test_visible_unfiltered_sorted_by_name() {
        let vm = seeded()
        XCTAssertEqual(vm.visible.map(\.name), ["Alice", "Bob", "Charlie"])
    }

    func test_visible_sort_by_phone() {
        let vm = seeded()
        vm.sortBy = .phone
        XCTAssertEqual(vm.visible.map(\.phone),
                       ["555-0001", "555-0002", "555-0003"])
    }

    func test_visible_filter_by_name_case_insensitive() {
        let vm = seeded()
        vm.query = "AL"
        XCTAssertEqual(vm.visible.map(\.name), ["Alice"])
    }

    func test_visible_filter_by_phone_substring() {
        let vm = seeded()
        vm.query = "0002"
        XCTAssertEqual(vm.visible.map(\.name), ["Bob"])
    }

    func test_visible_blank_query_returns_all() {
        let vm = seeded()
        vm.query = "   "
        XCTAssertEqual(vm.visible.count, 3)
    }

    func test_add_ignores_blank_name() {
        let vm = ContactsVM()
        vm.add(name: "  ", phone: "999")
        XCTAssertTrue(vm.contacts.isEmpty)
    }

    func test_add_appends_new_contact() {
        let vm = ContactsVM()
        vm.add(name: "Tae", phone: "111")
        XCTAssertEqual(vm.contacts.count, 1)
        XCTAssertEqual(vm.contacts[0].name, "Tae")
        XCTAssertFalse(vm.contacts[0].favorite)
    }

    func test_update_replaces_by_id() {
        let vm = seeded()
        var edited = vm.contacts[1]   // Alice
        edited.name = "Alicia"
        edited.phone = "555-9999"
        vm.update(edited)
        let stored = vm.contacts.first(where: { $0.id == edited.id })!
        XCTAssertEqual(stored.name, "Alicia")
        XCTAssertEqual(stored.phone, "555-9999")
    }

    func test_update_unknown_id_is_noop() {
        let vm = seeded()
        let ghost = Contact(name: "Ghost", phone: "x")
        vm.update(ghost)
        XCTAssertEqual(vm.contacts.count, 3)
        XCTAssertFalse(vm.contacts.contains(where: { $0.name == "Ghost" }))
    }

    func test_toggleFavorite_flips_flag() {
        let vm = seeded()
        let id = vm.contacts[0].id
        vm.toggleFavorite(id: id)
        XCTAssertTrue(vm.contacts[0].favorite)
        vm.toggleFavorite(id: id)
        XCTAssertFalse(vm.contacts[0].favorite)
    }

    func test_delete_removes_and_records_undo() {
        let vm = seeded()
        let bobId = vm.contacts[2].id    // Bob, original index 2
        vm.delete(id: bobId)
        XCTAssertEqual(vm.contacts.count, 2)
        XCTAssertEqual(vm.lastDeleted?.id, bobId)
        XCTAssertEqual(vm.lastDeletedIndex, 2)
    }

    func test_undoDelete_restores_at_original_index() {
        let vm = seeded()
        let bobId = vm.contacts[2].id
        vm.delete(id: bobId)
        vm.undoDelete()
        XCTAssertEqual(vm.contacts.count, 3)
        XCTAssertEqual(vm.contacts[2].id, bobId)
        XCTAssertNil(vm.lastDeleted)
        XCTAssertNil(vm.lastDeletedIndex)
    }

    func test_undoDelete_with_nothing_pending_is_noop() {
        let vm = seeded()
        vm.undoDelete()
        XCTAssertEqual(vm.contacts.count, 3)
    }

    func test_filter_then_sort_combine() {
        let vm = seeded()
        vm.contacts.append(Contact(name: "Alfred", phone: "555-0010"))
        vm.query = "al"
        vm.sortBy = .phone
        // Two matches: "Alice" (0001) and "Alfred" (0010); phone-sorted
        XCTAssertEqual(vm.visible.map(\.name), ["Alice", "Alfred"])
    }

    func test_path_push_pop_for_edit_flow() {
        let vm = seeded()
        let alice = vm.contacts[1]
        vm.path.append(alice)
        XCTAssertEqual(vm.path.count, 1)
        vm.path.removeLast()
        XCTAssertEqual(vm.path.count, 0)
    }
}
```

<details><summary>Solution</summary>

```swift
import SwiftUI
import Observation

struct Contact: Identifiable, Hashable {
    let id = UUID()
    var name: String
    var phone: String
    var favorite: Bool = false
}

enum SortKey { case name, phone }

@Observable
final class ContactsVM {
    var contacts: [Contact] = []
    var query: String = ""
    var sortBy: SortKey = .name
    var path = NavigationPath()

    var lastDeleted: Contact? = nil
    var lastDeletedIndex: Int? = nil

    var visible: [Contact] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        let filtered: [Contact]
        if q.isEmpty {
            filtered = contacts
        } else {
            filtered = contacts.filter {
                $0.name.lowercased().contains(q)
                || $0.phone.lowercased().contains(q)
            }
        }
        switch sortBy {
        case .name:  return filtered.sorted { $0.name  < $1.name  }
        case .phone: return filtered.sorted { $0.phone < $1.phone }
        }
    }

    func add(name: String, phone: String) {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        contacts.append(Contact(name: trimmed, phone: phone))
    }

    func update(_ edited: Contact) {
        guard let i = contacts.firstIndex(where: { $0.id == edited.id }) else { return }
        contacts[i] = edited
    }

    func toggleFavorite(id: UUID) {
        guard let i = contacts.firstIndex(where: { $0.id == id }) else { return }
        contacts[i].favorite.toggle()
    }

    func delete(id: UUID) {
        guard let i = contacts.firstIndex(where: { $0.id == id }) else { return }
        lastDeleted = contacts[i]
        lastDeletedIndex = i
        contacts.remove(at: i)
    }

    func undoDelete() {
        guard let c = lastDeleted, let raw = lastDeletedIndex else { return }
        let i = max(0, min(raw, contacts.count))
        contacts.insert(c, at: i)
        lastDeleted = nil
        lastDeletedIndex = nil
    }
}

struct ContentView: View {
    @State private var vm = ContactsVM()

    var body: some View {
        NavigationStack(path: $vm.path) {
            List {
                Picker("Sort", selection: $vm.sortBy) {
                    Text("Name").tag(SortKey.name)
                    Text("Phone").tag(SortKey.phone)
                }
                .pickerStyle(.segmented)

                ForEach(vm.visible) { c in
                    NavigationLink(value: c) {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(c.name).font(.headline)
                                Text(c.phone)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if c.favorite {
                                Image(systemName: "star.fill")
                                    .foregroundStyle(.yellow)
                            }
                        }
                    }
                    .swipeActions {
                        Button(role: .destructive) {
                            vm.delete(id: c.id)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                        Button {
                            vm.toggleFavorite(id: c.id)
                        } label: {
                            Label("Star", systemImage: "star")
                        }
                        .tint(.yellow)
                    }
                }
            }
            .searchable(text: $vm.query)
            .navigationTitle("Contacts")
            .navigationDestination(for: Contact.self) { c in
                ContactEditor(original: c, vm: vm)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Undo") { vm.undoDelete() }
                        .disabled(vm.lastDeleted == nil)
                }
            }
        }
    }
}

struct ContactEditor: View {
    let original: Contact
    @Bindable var vm: ContactsVM

    @State private var draft: Contact
    @Environment(\.dismiss) private var dismiss

    init(original: Contact, vm: ContactsVM) {
        self.original = original
        self.vm = vm
        _draft = State(initialValue: original)
    }

    var body: some View {
        Form {
            Section("Name")  { TextField("Name",  text: $draft.name) }
            Section("Phone") { TextField("Phone", text: $draft.phone) }
            Toggle("Favorite", isOn: $draft.favorite)
        }
        .navigationTitle("Edit")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save") {
                    vm.update(draft)
                    dismiss()
                }
                .disabled(draft.name.trimmingCharacters(in: .whitespaces).isEmpty)
            }
        }
    }
}
```

Why: `visible` keeps filtering and sorting in one place so the tests can
verify each axis independently and combined. `update` replaces by `id`,
which is the only stable handle once filtering reorders rows. The undo
state captures both the value and the original index so reinsert lands in
the same slot -- a common practical-exam expectation. Path is on the VM, so
push/pop is testable without spinning up a `NavigationStack`.
</details>
