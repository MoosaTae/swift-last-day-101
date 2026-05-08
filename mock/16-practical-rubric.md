# Mock 4 — Practical Exam Solution + Rubric

This file pairs with `15-practical-brief.md`. It shows a reference solution for each task and the rubric the grader applies.

---

## Solution Sketch (per task)

### Task 1 — Fix the broken navigation

**What was broken.** `.navigationDestination(for: Habit.self)` was attached to the `NavigationStack` itself (outside its closure). The destination registry only fires when the modifier is on a view *inside* the stack, typically the root content (`List`).

**Fix.** Move the modifier inside the `NavigationStack` closure, attached to the `List`.

```swift
NavigationStack {
    List {
        ForEach(store.habits) { habit in       // (combined with Task 3 below)
            NavigationLink(value: habit) {
                HabitRow(habit: habit, store: store)
            }
        }
        .onDelete { offsets in
            store.remove(at: offsets)
        }
    }
    .navigationTitle("Habits")
    .navigationDestination(for: Habit.self) { habit in   // <-- moved here
        HabitDetailView(habit: habit, store: store)
    }
    .overlay {
        if let msg = errorMessage {
            Text(msg).foregroundStyle(.red)
        }
    }
    .toolbar { /* Task 6 below */ }
}
```

---

### Task 2 — Make `Habit` Identifiable + Hashable

**Why both.** `List(store.habits) { ... }` wants `Identifiable` so it can diff rows across re-renders. `NavigationLink(value: habit)` and `.navigationDestination(for: Habit.self)` use the value as a hash key, which requires `Hashable`. Real models in lists that you also navigate to almost always need both.

**Fix.** Add the conformances. Since `id: UUID` already exists, `Identifiable` needs no extra code, and `Hashable` is auto-synthesized because every stored property (`UUID`, `String`, `Bool`, `[Bool]`) is itself `Hashable`.

```swift
struct Habit: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var icon: String
    var doneToday: Bool
    var lastSevenDays: [Bool]

    // (init, weeklyCount, weeklyProgress unchanged)
}
```

---

### Task 3 — Swipe-to-delete + Edit button

**Why it required restructuring.** `.onDelete` is a `ForEach` modifier, not a `List` modifier. So `List(store.habits) { ... }` (which hides the inner `ForEach`) cannot accept `.onDelete`. Switch to `List { ForEach(...) { ... }.onDelete { ... } }`.

```swift
List {
    ForEach(store.habits) { habit in
        NavigationLink(value: habit) {
            HabitRow(habit: habit, store: store)
        }
    }
    .onDelete { offsets in
        store.remove(at: offsets)
    }
}
.toolbar {
    ToolbarItem(placement: .topBarLeading)  { EditButton() }
    ToolbarItem(placement: .topBarTrailing) {
        Button { showAdd = true } label: { Image(systemName: "plus") }
    }
}
```

The `EditButton()` toggles List into edit mode (showing reorder grips and red-circle delete buttons). `.onDelete` handles the swipe-to-delete and the edit-mode delete.

---

### Task 4 — Persist habits with `@AppStorage`-style storage

**Why we use raw `UserDefaults` here.** `@AppStorage` is a SwiftUI property wrapper for use *inside a View*. In a plain `@Observable` class we fall through to raw `UserDefaults`, encoding/decoding `Data` ourselves. The brief asks exactly for that.

```swift
@Observable
final class HabitStore {
    var habits: [Habit] = []
    static let storageKey = "habits.v1"

    init() {
        load()
    }

    func add(name: String, icon: String) {
        let h = Habit(name: name, icon: icon)
        habits.append(h)
        save()
    }

    func remove(at offsets: IndexSet) {
        habits.remove(atOffsets: offsets)
        save()
    }

    func toggleToday(_ habit: Habit) {
        guard let i = habits.firstIndex(where: { $0.id == habit.id }) else { return }
        habits[i].doneToday.toggle()
        habits[i].lastSevenDays[6] = habits[i].doneToday
        save()
    }

    func load() {
        guard
            let data = UserDefaults.standard.data(forKey: Self.storageKey),
            let decoded = try? JSONDecoder().decode([Habit].self, from: data)
        else { return }
        habits = decoded
    }

    func save() {
        guard let data = try? JSONEncoder().encode(habits) else { return }
        UserDefaults.standard.set(data, forKey: Self.storageKey)
    }
}
```

Key correctness points:
- JSON-encoded `[Habit]` blob, not individual fields.
- `try?` keeps the API non-throwing; on failure, leave `habits` untouched.
- `init()` calls `load()` once.
- Every mutation calls `save()`.

---

### Task 5 — Fix the `@StateObject` vs `@ObservedObject` bug

**Why the original is wrong.** `@StateObject` is the legacy *creator* wrapper for `ObservableObject`-conforming classes. Two problems:

1. `HabitStore` is `@Observable` (Swift macro, iOS 17+), not `ObservableObject`. The legacy wrappers (`@StateObject`, `@ObservedObject`, `@EnvironmentObject`) do not apply.
2. `HabitRow` is the *receiver*, not the creator. The creator is `ContentView`, which already correctly uses `@State private var store = HabitStore()`. A receiver of an `@Observable` uses plain `var store: HabitStore` (read+observe only) or `@Bindable var store: HabitStore` if it needs `$store.x` for two-way bindings (it does not here — there are no bindings, just method calls).

**Fix.** One line. Drop the wrapper:

```swift
struct HabitRow: View {
    let habit: Habit
    var store: HabitStore        // <-- plain var, no wrapper
    // body unchanged
}
```

If a child *did* need `$store.x` (e.g. a TextField bound to `store.draftName`), the right answer is `@Bindable var store: HabitStore` instead — still **not** `@StateObject` or `@ObservedObject`.

---

### Task 6 — Polish

**6a. Modifier order in HabitDetailView.** The original chain is `.background -> .cornerRadius -> .frame -> .padding`. Reading top-to-bottom (modifier written first is closest to the content):

- `.background(Color.green)` paints green behind the *intrinsic* size of the text — not 220 x 56.
- `.cornerRadius(28)` rounds that small text-sized green block.
- `.frame(width: 220, height: 56)` then enlarges the *outer wrapper*, but the green pill inside is already painted at text size, so the 220 x 56 box is mostly transparent with a tiny rounded green smudge in the middle.
- `.padding()` adds outer space.

The fix uses the canonical "pill" order: **frame -> background -> cornerRadius -> outer padding**. The modifier first written (`frame`) sizes the area; `background` paints the *now sized* area; `cornerRadius` rounds the painted area; the outer `padding` is breathing room outside the pill.

```swift
Text("\(Int(habit.weeklyProgress * 100))% this week")
    .foregroundColor(.white)
    .frame(width: 220, height: 56)      // size the box
    .background(Color.green)            // paint the (now sized) box
    .cornerRadius(28)                   // round the painted area
    .padding()                          // outer breathing room
```

(Equally acceptable: `.background(Color.green, in: RoundedRectangle(cornerRadius: 28))` instead of separate `.background` + `.cornerRadius`.)

**6b. AddHabitView + sheet wiring.**

```swift
struct AddHabitView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: HabitStore

    @State private var name = ""
    @State private var icon = "📚"

    var body: some View {
        NavigationStack {
            Form {
                TextField("Name", text: $name)
                TextField("Icon (emoji)", text: $icon)
            }
            .navigationTitle("New Habit")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        store.add(name: name, icon: icon)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}
```

In `ContentView`, the toolbar (covered above in Task 3) plus the sheet:

```swift
.sheet(isPresented: $showAdd) {
    AddHabitView(store: store)
}
```

`@Bindable` is correct on `AddHabitView`'s `store` parameter because the form might in future need `$store.someField`. A plain `var store: HabitStore` would work today (we only call `store.add(...)`) and is also fully acceptable.

**6c. No force unwraps.** If your code uses `!` on `URL(string:)`, `Int(_:)`, dictionary subscript, or `as!`, you lose the safety mark. Use `if let` / `guard let` / `??` everywhere.

---

## Grading Rubric

| Task | Points | What earns full credit | Common partial credit |
|---|---|---|---|
| 1 — Fix navigation | 3 | `.navigationDestination(for: Habit.self)` is attached to a view *inside* the `NavigationStack` and tapping a row pushes `HabitDetailView`. | 1 pt for spotting the bug in a comment; 2 pt if it pushes but the navigation title is missing or wrong. |
| 2 — Identifiable + Hashable | 3 | `Habit` conforms to both, `id` is the existing `UUID`, list compiles and renders. | 2 pt if only `Identifiable` (with explicit `id: \.id` on the List) but `NavigationLink(value:)` then fails to compile, costing 1 pt. |
| 3 — Delete + Edit | 3 | Explicit `ForEach` with `.onDelete` calling `store.remove(at:)`, `EditButton()` in `.topBarLeading`, swipe and edit-mode both work. | 1 pt for `EditButton()` only; 2 pt for delete only without `EditButton`; 1 pt if `.onDelete` is attached to the wrong thing (e.g. directly on `List`). |
| 4 — Persistence | 4 | JSON `Data` round-trips through `UserDefaults` under `HabitStore.storageKey`. `init` loads, every mutation saves, no force unwraps, decoder failures swallowed safely. | 2 pt if it persists once but doesn't save on every mutation; 2 pt if you save individual fields instead of the JSON blob; 1 pt if you encode but never decode on launch. |
| 5 — Fix `@StateObject` bug | 3 | `HabitRow` uses plain `var store: HabitStore` (or `@Bindable`); list compiles; tapping the checkmark mutates the store and the row re-renders; no `@StateObject` or `@ObservedObject` anywhere. | 1 pt for spotting the bug in a comment; 2 pt if you swap `@StateObject` for `@ObservedObject` (still wrong: `@ObservedObject` only applies to `ObservableObject`, not `@Observable`). |
| 6 — Polish | 4 | (1.5) modifier order fixed so the pill is visibly green, sized 220 x 56, with rounded corners and outer breathing room; (1.5) `AddHabitView` complete with NavigationStack, Form, Save (disabled when empty), Cancel; sheet wired up in ContentView; (1) no force-unwraps anywhere. | Each sub-item graded independently. Half marks for partial pill correctness (e.g. right size but no rounding). |
| **Total** | **20** | | |

### Penalties (apply once across the whole submission)

- Any `!` force-unwrap on `URL(string:)`, `Int(_:)`, dictionary subscript, or `as!`: **-1 pt** (this is the same as Task 6c — they don't double up; whichever costs more applies once).
- Project does not compile: cap at 10 pt regardless of partial work.
- Using `NavigationView` instead of `NavigationStack`: **-1 pt**.
- Mutating `store.habits` directly from a view (instead of going through `store.add` / `store.remove`) so that `save()` is bypassed: **-1 pt** (silently corrupts persistence).

---

## Self-grading checklist

- [ ] All seven tests pass: `testHabitIsIdentifiableByID`, `testHabitWeeklyCount`, `testListCompilesAndRenders`, `testDeleteRemovesHabit`, `testToggleTodayPersists`, `testStoreEncodesAndDecodes`, `testNavigationDestinationRegistered`.
- [ ] No force unwraps anywhere in submitted code.
- [ ] `Habit` conforms to `Identifiable` and `Hashable`, and `id` is the existing `UUID`.
- [ ] List uses an explicit `ForEach(store.habits)` so `.onDelete` compiles and runs.
- [ ] `EditButton()` is in the toolbar at `.topBarLeading`; the `+` button is at `.topBarTrailing`.
- [ ] `HabitStore.load()` runs in `init`, `save()` runs on every mutation (`add`, `remove`, `toggleToday`).
- [ ] `HabitRow` uses plain `var store: HabitStore` (or `@Bindable`), never `@StateObject` or `@ObservedObject`.
- [ ] `HabitDetailView`'s "% this week" pill is visibly green, 220 x 56, with rounded corners.
- [ ] `AddHabitView` is wrapped in a `NavigationStack`, has `navigationTitle("New Habit")`, and Save is disabled when `name` is empty.
- [ ] Sheet opens from the `+` button and dismisses on Save or Cancel.
- [ ] `.navigationDestination(for: Habit.self)` is attached *inside* the `NavigationStack`.
- [ ] No `NavigationView` anywhere — only `NavigationStack`.
