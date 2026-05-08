# Mock 5 — Practical Exam (Open Book)
**Time: 120 minutes | Total: 20 points**

You will build and refactor a small "Note Keeper" iOS app. The starter project compiles but is broken in deliberate ways and missing several features. Work through the tasks in order. Your grade is determined by both completeness and the unit tests at the bottom of this brief.

---

## Setup — Starter Code (provided)

Files provided in the Xcode project:

- `Models.swift` — the `Note` model and a `NoteStore` `@Observable` class.
- `ContentView.swift` — the root list screen. Has bugs.
- `EditNoteView.swift` — the add/edit sheet. Mostly stubbed.
- `DetailView.swift` — read-only detail sheet. Empty stub for Task 6.
- `NetworkSync.swift` — a network-import helper (Task 5). Has bugs.
- `NoteKeeperTests.swift` — unit tests you must make pass.

### `Models.swift`

```swift
import Foundation
import Observation

// A single note.
struct Note: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var title: String
    var body: String
    var createdAt: Date = Date()

    // Server-side import payload uses snake_case: { "note_id", "title", "body_text", "created_at" }
    // TODO (Task 5): make decoding tolerant of that JSON shape.
}

@Observable
final class NoteStore {
    var notes: [Note] = []

    // Persisted across launches via @AppStorage in Task 4.
    private let storageKey = "notes.v1"

    init() {
        load()
    }

    func add(_ note: Note) {
        notes.append(note)
        save()
    }

    func update(_ note: Note) {
        guard let i = notes.firstIndex(where: { $0.id == note.id }) else { return }
        notes[i] = note
        save()
    }

    func remove(at offsets: IndexSet) {
        notes.remove(atOffsets: offsets)
        save()
    }

    // TODO (Task 4): load() reads JSON-encoded [Note] from UserDefaults
    //                under `storageKey` and assigns it to `notes`.
    func load() {
        // TODO
    }

    // TODO (Task 4): save() encodes `notes` to JSON and writes it to UserDefaults
    //                under `storageKey`.
    func save() {
        // TODO
    }
}
```

### `ContentView.swift`

```swift
import SwiftUI

struct ContentView: View {
    @State private var store = NoteStore()
    @State private var showEditor = false
    @State private var selectedNote: Note?           // Task 6 will use this for the detail sheet.

    var body: some View {
        NavigationStack {
            // BUG (Task 2): the list does not render rows because ForEach is missing
            //               and `.onDelete` cannot be attached to `List(items)` directly.
            List(store.notes) { note in
                NoteRow(note: note)
            }
            .navigationTitle("Notes")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showEditor = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
                // TODO (Task 3): add an EditButton() at .topBarLeading.
            }
            // BUG (Task 6): this passes a Bool when it really needs to pass `selectedNote`.
            //               sheet(isPresented:) shows the same view for every tap, even though
            //               the user tapped on a specific note. Convert to sheet(item:).
            .sheet(isPresented: $showEditor) {
                EditNoteView(store: store, draft: Note(title: "", body: ""))
            }
        }
    }
}

struct NoteRow: View {
    let note: Note

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(note.title.isEmpty ? "(untitled)" : note.title)
                .font(.headline)
            Text(note.body)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(2)
        }
    }
}
```

### `EditNoteView.swift`

```swift
import SwiftUI

struct EditNoteView: View {
    @Bindable var store: NoteStore
    @State var draft: Note
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $draft.title)
                TextField("Body", text: $draft.body, axis: .vertical)
                    .lineLimit(4...8)
            }
            .navigationTitle("Edit Note")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        // TODO (Task 3): if the note already exists in the store, call update();
                        //                otherwise call add(). Then dismiss().
                    }
                    .disabled(draft.title.isEmpty)
                }
            }
        }
    }
}
```

### `DetailView.swift`

```swift
import SwiftUI

struct DetailView: View {
    let note: Note
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        // TODO (Task 6): show
        //   - Title (large)
        //   - Body (body font, multi-line)
        //   - Formatted createdAt below
        //   - A "Close" toolbar button that calls dismiss()
        // The whole sheet should appear as a medium detent (~half screen).
        Text("TODO")
    }
}
```

### `NetworkSync.swift`

```swift
import Foundation

struct NetworkSync {
    // The server response is a JSON array of:
    //   { "note_id": "<uuid>", "title": "...", "body_text": "...", "created_at": <unix-seconds> }
    //
    // BUG (Task 5): URL is force-unwrapped, errors are force-tried, and the decoder is not
    //               configured to handle the snake_case keys or unix timestamps. Fix all three.
    static func importNotes(from urlString: String) async -> [Note] {
        let url = URL(string: urlString)!
        let (data, _) = try! await URLSession.shared.data(from: url)
        let notes = try! JSONDecoder().decode([Note].self, from: data)
        return notes
    }
}
```

### `NoteKeeperTests.swift` (read-only — do not edit)

```swift
import XCTest
@testable import NoteKeeper

final class NoteKeeperTests: XCTestCase {
    func testAddNoteAppendsToStore()              { /* see Task 2 */ }
    func testDeleteRemovesNote()                  { /* see Task 3 */ }
    func testUpdateReplacesByID()                 { /* see Task 3 */ }
    func testNotesPersistAcrossLaunches()         { /* see Task 4 */ }
    func testImportDecodesSnakeCaseAndUnixDate()  { /* see Task 5 */ }
    func testImportReturnsEmptyOnBadURL()         { /* see Task 5 */ }
    func testDetailSheetUsesItemBasedAPI()        { /* see Task 6 */ }
}
```

---

## Tasks (work through in order)

### Task 1 — Wire up the Edit sheet so saving works (2 pt)

Inside `EditNoteView`'s "Save" button, complete the body so that:

- If a note with `draft.id` already exists in `store.notes`, call `store.update(draft)`.
- Otherwise, call `store.add(draft)`.
- Then call `dismiss()`.

Hint: `store.notes.contains(where: { $0.id == draft.id })`.

### Task 2 — Fix the List so it shows rows + supports delete (3 pt)

`List(store.notes) { ... }` does render rows in isolation, but `.onDelete` is a `ForEach` modifier, not a `List` modifier — Task 3 needs it. Convert the body into the explicit form:

```swift
List {
    ForEach(store.notes) { note in
        NoteRow(note: note)
    }
    .onDelete { offsets in
        store.remove(at: offsets)
    }
}
```

After this change, the list still compiles, swipe-to-delete works, and `Task 3` can attach the EditButton.

### Task 3 — Add EditButton + tap to edit (3 pt)

Two sub-pieces:

1. Add `EditButton()` as a `ToolbarItem(placement: .topBarLeading)` so the user can enter list edit-mode.
2. Wrap each `NoteRow(note:)` so that **tapping a row opens the editor pre-filled** with that note. The simplest pattern: add `.onTapGesture { selectedNote = note }` to the row, and (in Task 6) the sheet presents `EditNoteView` with that draft.

For now, just store the tapped note into `selectedNote` and present the editor with `selectedNote` as the draft. (Task 6 swaps the sheet to `sheet(item:)`.)

### Task 4 — Persist notes with AppStorage (JSON-encoded array) (4 pt)

Implement `NoteStore.load()` and `NoteStore.save()` so that `notes` survives across launches.

Requirements:
- Use `UserDefaults.standard` directly (since `@Observable` classes can't host `@AppStorage` wrappers) under the key `"notes.v1"` (already in `storageKey`).
- `save()` encodes the current `notes` array with `JSONEncoder` and writes the resulting `Data` under `storageKey`.
- `load()` reads the `Data` (if present) and decodes it back into `[Note]`. If the data is missing or fails to decode, leave `notes = []` and do not crash.
- `init()` already calls `load()`. `add`, `update`, and `remove(at:)` already call `save()`.

A correct implementation passes `testNotesPersistAcrossLaunches`.

### Task 5 — Fix `NetworkSync.importNotes` (5 pt)

The function currently has three latent crashes (force-unwrap URL, force-try the network call, force-try the decode) and even on a successful response the decode would fail because:
- The server uses `note_id`, `body_text`, and `created_at` as JSON keys.
- The server sends `created_at` as a Unix timestamp (seconds since 1970).

Rewrite the function so that:

1. `URL(string:)` is `guard let`-unwrapped; on failure the function returns `[]`.
2. The network call is wrapped in `do { ... } catch { ... }`; on any thrown error, log and return `[]`.
3. The decoder is configured to decode the server's JSON keys correctly, mapping:
   - `note_id` -> `Note.id`
   - `title` -> `Note.title`
   - `body_text` -> `Note.body`
   - `created_at` -> `Note.createdAt` (Unix-seconds Date)

You may either add a `CodingKeys` enum directly on `Note` *or* introduce a separate `NoteImportDTO` struct that decodes the server shape and is converted to `Note`. The DTO approach is cleaner because it leaves `Note`'s persistence format alone — both approaches earn full credit.

A correct implementation passes both `testImportDecodesSnakeCaseAndUnixDate` and `testImportReturnsEmptyOnBadURL`.

### Task 6 — Detail sheet via `sheet(item:)` + presentation detents (3 pt)

The starter has two issues to fix together:

1. **Wrong sheet API.** `sheet(isPresented: $showEditor)` is fine for the "Add" button (which doesn't need to pass a specific note), but tapping a row to *edit* an existing note needs to pass the tapped note's data into the sheet. With the current `isPresented:` API there is a race: you set `selectedNote = note`, then `showEditor = true`, but SwiftUI may snapshot the sheet content before the assignment lands. Convert the editor sheet to **`sheet(item: $selectedNote)`** so the data and the "is open?" state are atomic.
2. **Detail sheet.** Implement `DetailView` (Title, body, formatted `createdAt`, "Close" toolbar button calling `dismiss()`) and present it via a *separate* `.sheet(item:)` triggered by a long-press on a row. Use `.presentationDetents([.medium, .large])` so the user can drag the sheet between half-screen and full-screen.

Requirements summary:
- Replace the row's `.onTapGesture { selectedNote = note }` with logic that opens the editor sheet via `sheet(item: $selectedNote) { note in EditNoteView(store: store, draft: note) }`.
- The "+" toolbar button still uses `sheet(isPresented:)` (or you may unify them into one `selectedNote` binding — both fine).
- Add `.onLongPressGesture { showingDetail = note }` (a separate `@State Note?`) and a second `sheet(item: $showingDetail) { note in DetailView(note: note) .presentationDetents([.medium, .large]) }`.

A correct implementation passes `testDetailSheetUsesItemBasedAPI`.

---

## Unit Tests (must pass)

These are the names the grader runs. Each maps to one or more tasks.

| Test                                       | What it asserts                                                                                                  | Tasks |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ----- |
| `testAddNoteAppendsToStore`                | Calling `store.add(Note(title: "x", body: "y"))` increases `store.notes.count` by 1 and the new note is at the end. | 1, 2  |
| `testDeleteRemovesNote`                    | After `store.remove(at: IndexSet(integer: 0))` on a 2-note store, count is 1.                                    | 2, 3  |
| `testUpdateReplacesByID`                   | `store.update(modifiedCopy)` finds the note by `id` and replaces it without changing count.                       | 1, 3  |
| `testNotesPersistAcrossLaunches`           | After `store.add(...)`, creating a fresh `NoteStore()` reads the same `notes` array back.                         | 4     |
| `testImportDecodesSnakeCaseAndUnixDate`    | Decoding the provided sample JSON via the configured decoder yields the expected count, first title, and a sane `createdAt` Date around the 2024 epoch. | 5 |
| `testImportReturnsEmptyOnBadURL`           | `await NetworkSync.importNotes(from: "not a url")` returns `[]` and does not crash.                               | 5     |
| `testDetailSheetUsesItemBasedAPI`          | The view source contains `.sheet(item: $selectedNote)` and not just `sheet(isPresented:)` for the editor path.    | 6     |

---

## Grading Notes

- Partial credit is awarded per task — see `20-practical-rubric.md`.
- The unit tests give a pass/fail signal but the rubric determines points.
- Do not change test files. Do not change `Note`'s public field names (you may add a CodingKeys enum or a DTO struct).
- You may use `if let`, `guard let`, `??` freely. Force-unwrap (`!`) on `URL(string:)`, `try!` on async calls, dictionary force-unwraps, or `as!` will lose 1 pt regardless of whether tests pass.
- Total points: 2 + 3 + 3 + 4 + 5 + 3 = **20**.
