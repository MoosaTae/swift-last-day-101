# Mock 5 — Practical Exam Solution + Rubric

This file pairs with `19-practical-brief.md`. It shows a reference solution for each task and the rubric the grader applies.

---

## Solution Sketch (per task)

### Task 1 — Wire up the Edit sheet so saving works

**What was missing.** The "Save" button's action body was empty. It needs to decide between `update` (note already exists) and `add` (new note), then dismiss.

```swift
ToolbarItem(placement: .confirmationAction) {
    Button("Save") {
        if store.notes.contains(where: { $0.id == draft.id }) {
            store.update(draft)
        } else {
            store.add(draft)
        }
        dismiss()
    }
    .disabled(draft.title.isEmpty)
}
```

Why look up by `id` instead of by index? Because the same view handles both "new note" (id is freshly generated) and "edit existing" (id was preserved from the tapped row). The id-based check is robust to either case.

---

### Task 2 — Fix the List so it shows rows + supports delete

**Why the rewrite is required.** `.onDelete` is a `ForEach` modifier, not a `List` modifier. `List(items) { ... }` hides the inner `ForEach` from your reach, so you cannot attach `.onDelete` to it. Switch to the explicit form:

```swift
List {
    ForEach(store.notes) { note in
        NoteRow(note: note)
            .onTapGesture { selectedNote = note }    // Task 3 hooks tapping
    }
    .onDelete { offsets in
        store.remove(at: offsets)
    }
}
```

Note: `.onDelete` is attached to the `ForEach`, not to the `List` and not to the row view inside.

---

### Task 3 — Add EditButton + tap to edit

```swift
.toolbar {
    ToolbarItem(placement: .topBarLeading) { EditButton() }
    ToolbarItem(placement: .topBarTrailing) {
        Button { showEditor = true } label: { Image(systemName: "plus") }
    }
}
```

Tap-to-edit is already wired by Task 2's `.onTapGesture { selectedNote = note }`. Task 6 will switch the sheet to `sheet(item: $selectedNote)` so that the *tapped* note's data is what populates the editor (not whatever was last there).

For now, you may leave the row's tap setting `selectedNote` and have a temporary `if let selectedNote { EditNoteView(...) }` while you complete Task 6. Either ordering is fine as long as the test passes by submission time.

---

### Task 4 — Persist notes with JSON-encoded array (UserDefaults)

```swift
@Observable
final class NoteStore {
    var notes: [Note] = []
    private let storageKey = "notes.v1"

    init() { load() }

    func add(_ note: Note)              { notes.append(note); save() }
    func update(_ note: Note)           {
        guard let i = notes.firstIndex(where: { $0.id == note.id }) else { return }
        notes[i] = note; save()
    }
    func remove(at offsets: IndexSet)   { notes.remove(atOffsets: offsets); save() }

    func load() {
        guard
            let data = UserDefaults.standard.data(forKey: storageKey),
            let decoded = try? JSONDecoder().decode([Note].self, from: data)
        else {
            notes = []
            return
        }
        notes = decoded
    }

    func save() {
        guard let data = try? JSONEncoder().encode(notes) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}
```

Key correctness points:
- `init` calls `load`, so a fresh `NoteStore()` automatically reads what the previous launch wrote.
- Every mutator (`add`, `update`, `remove(at:)`) calls `save()`. Forgetting any of them is a partial-credit bug.
- `try?` (not `try!`) on encode/decode — corrupted JSON (e.g., from a model schema change) should not crash the app; the user's worst case is "I lost my notes".
- The key is namespaced (`"notes.v1"`) so a future schema migration can use `"notes.v2"` cleanly.

(An alternative — store the `Data` in a `@AppStorage` wrapper inside a `View` and forward into the store — is also acceptable but more awkward for a class. The rubric accepts either approach as long as the test passes.)

---

### Task 5 — Fix `NetworkSync.importNotes`

The cleanest fix is a separate DTO struct that decodes the server's JSON shape, then maps to `Note`. This leaves `Note`'s persistence format (which is **our** JSON, written by Task 4) untouched.

```swift
struct NetworkSync {
    private struct ImportDTO: Decodable {
        let id: UUID
        let title: String
        let body: String
        let createdAt: Date

        enum CodingKeys: String, CodingKey {
            case id        = "note_id"
            case title
            case body      = "body_text"
            case createdAt = "created_at"
        }

        var asNote: Note {
            Note(id: id, title: title, body: body, createdAt: createdAt)
        }
    }

    static func importNotes(from urlString: String) async -> [Note] {
        guard let url = URL(string: urlString) else {
            print("importNotes: invalid URL \(urlString)")
            return []
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .secondsSince1970
            let dtos = try decoder.decode([ImportDTO].self, from: data)
            return dtos.map(\.asNote)
        } catch {
            print("importNotes failed: \(error.localizedDescription)")
            return []
        }
    }
}
```

Three things this fixes vs. the original:
1. `URL(string:)!` -> `guard let`. A bad URL (or a typo, or empty string) returns `[]` instead of crashing.
2. `try!` -> `do { try ... } catch { ... }`. Network failures and decode failures both flow into the catch and return `[]`.
3. The decoder maps `note_id`/`body_text`/`created_at` via `CodingKeys`, and uses `.secondsSince1970` so the integer Unix timestamp becomes a real `Date`.

**Alternative (acceptable):** add `CodingKeys` directly to `Note` plus the date strategy. The downside is you must keep `Note`'s persistence (Task 4) using the same key names, or you need a custom `init(from:)`. The DTO approach side-steps that entirely.

---

### Task 6 — Detail sheet via `sheet(item:)` + presentation detents

**Why `sheet(item:)` is correct.** With `sheet(isPresented: $bool)`, the sheet is just "open or not"; you have to keep a *separate* piece of state that holds the data the sheet needs. There's a race: SwiftUI may build the sheet body before your data assignment lands, showing stale data on the first frame. `sheet(item: $optional)` ties the data and the open-state together — when `selectedNote` becomes non-nil, the sheet opens with that note; setting it back to `nil` dismisses.

```swift
struct ContentView: View {
    @State private var store = NoteStore()
    @State private var showEditor    = false
    @State private var selectedNote: Note?
    @State private var showingDetail: Note?

    var body: some View {
        NavigationStack {
            List {
                ForEach(store.notes) { note in
                    NoteRow(note: note)
                        .onTapGesture       { selectedNote  = note }
                        .onLongPressGesture { showingDetail = note }
                }
                .onDelete { offsets in store.remove(at: offsets) }
            }
            .navigationTitle("Notes")
            .toolbar {
                ToolbarItem(placement: .topBarLeading)  { EditButton() }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showEditor = true } label: { Image(systemName: "plus") }
                }
            }
            // "+" path - new note, no specific data to pass.
            .sheet(isPresented: $showEditor) {
                EditNoteView(store: store, draft: Note(title: "", body: ""))
            }
            // Tap-to-edit path - data and open-state atomic.
            .sheet(item: $selectedNote) { note in
                EditNoteView(store: store, draft: note)
            }
            // Long-press detail path - read-only, with detents.
            .sheet(item: $showingDetail) { note in
                DetailView(note: note)
                    .presentationDetents([.medium, .large])
            }
        }
    }
}

struct DetailView: View {
    let note: Note
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 12) {
                Text(note.title.isEmpty ? "(untitled)" : note.title)
                    .font(.title).bold()
                Text(note.body)
                    .font(.body)
                Text(note.createdAt, style: .date)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .padding()
            .navigationTitle("Detail")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
}
```

Key correctness points:
- `selectedNote: Note?` is the binding that drives the editor sheet — `nil` means closed, non-nil means open with that note's data.
- `showingDetail: Note?` is a *separate* binding for the read-only detail sheet (long press). Reusing `selectedNote` for both would conflict.
- `.presentationDetents([.medium, .large])` is attached to the *content view*, not to the `.sheet` modifier itself — that's the iOS 16+ API.

---

## Grading Rubric

| Task | Points | What earns full credit | Common partial credit |
|---|---|---|---|
| 1 — Save button wiring | 2 | "Save" calls `update(draft)` if existing else `add(draft)`, then `dismiss()`. | 1 pt if it always calls `add` (existing notes get duplicated); 1 pt if save works but no dismiss. |
| 2 — List + ForEach + onDelete | 3 | Explicit `ForEach`, `.onDelete` attached to it, swipe-to-delete works. | 2 pt if `.onDelete` compiles but doesn't call `store.remove`; 1 pt for unchanged `List(items)` that compiles but Task 3 then breaks. |
| 3 — EditButton + tap to edit | 3 | EditButton in `.topBarLeading`, tapping a row stores the note into `selectedNote`. | 2 pt for EditButton only; 2 pt for tap-to-edit only. |
| 4 — Persistence | 4 | Notes survive relaunch (test passes); `save()` runs on every mutation; `load()` runs in `init`; uses `try?` not `try!`. | 2 pt if persistence works but uses `try!` (penalty); 2 pt if you encode but never decode on launch; 1 pt if you only persist on `add` but not `update`/`remove`. |
| 5 — NetworkSync rewrite | 5 | `guard let url`, `do/catch`, snake_case keys mapped, `secondsSince1970` for date, returns `[]` on any failure. | 3 pt if it decodes correctly but force-unwraps URL; 2 pt if errors are caught but the date decode is wrong (createdAt is in 1970 or 2050); 4 pt if everything works but the decoder forgets the date strategy. |
| 6 — Detail sheet + sheet(item:) | 3 | `sheet(item: $selectedNote)` for the editor path, separate `sheet(item: $showingDetail)` with `.presentationDetents([.medium, .large])` for DetailView, DetailView shows title/body/date with a working Close button. | 1 pt for keeping `sheet(isPresented:)` only and putting data race-conditioned; 2 pt for correct `sheet(item:)` but no detents; 2 pt if DetailView dismisses but missing one of the displayed fields. |
| **Total** | **20** | | |

### Penalties (apply once across the whole submission)

- Any `!` force-unwrap on `URL(string:)`, `try!`, `Int(_:)`, dictionary subscript, or `as!` in submitted code: **-1 pt**.
- Project does not compile: cap at 10 pt regardless of partial work (graders run tests).
- Using `NavigationView` instead of `NavigationStack`: **-1 pt**.
- `sheet(isPresented:)` used to pass per-row data when the brief explicitly required `sheet(item:)`: **-1 pt** (in addition to the partial credit on Task 6).

---

## Self-grading checklist

- [ ] All seven tests pass: `testAddNoteAppendsToStore`, `testDeleteRemovesNote`, `testUpdateReplacesByID`, `testNotesPersistAcrossLaunches`, `testImportDecodesSnakeCaseAndUnixDate`, `testImportReturnsEmptyOnBadURL`, `testDetailSheetUsesItemBasedAPI`.
- [ ] No `!` force-unwraps anywhere in submitted code.
- [ ] No `try!` anywhere in submitted code (especially in `NetworkSync`).
- [ ] List uses an explicit `ForEach` so `.onDelete` compiles and runs.
- [ ] `NoteStore.save()` is called from `add`, `update`, AND `remove(at:)` — not just one of them.
- [ ] `NoteStore.load()` is called from `init()`.
- [ ] `NetworkSync.importNotes` returns `[]` on bad URL and `[]` on any thrown error — no crashes, no propagated throw.
- [ ] The decoder used for import sets both `keyDecodingStrategy` (or explicit `CodingKeys`) and `dateDecodingStrategy = .secondsSince1970`.
- [ ] The editor sheet uses `sheet(item: $selectedNote)` so the tapped note's data is what populates the form.
- [ ] The detail sheet has `.presentationDetents([.medium, .large])` so the user can drag between half and full screen.
- [ ] `DetailView` has a working "Close" toolbar button calling `@Environment(\.dismiss)`.
- [ ] No `NavigationView` anywhere — only `NavigationStack`.
