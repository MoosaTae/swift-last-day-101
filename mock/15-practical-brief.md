# Mock 4 — Practical Exam (Open Book)
**Time: 120 minutes | Total: 20 points**

You will build and refactor a small "Habit Tracker" iOS app. The starter project compiles but is broken in deliberate ways and missing several features. Each habit has a name, an emoji icon, a daily-checkmark state, and a 7-day completion history rendered as a weekly progress bar. Habits are persisted across launches as a JSON-encoded array in `@AppStorage`.

Work through the tasks in order. Your grade is determined by both completeness and the unit tests at the bottom.

---

## Setup — Starter Code (provided)

Files provided in the Xcode project:

- `Models.swift` — the `Habit` model and a `HabitStore` `@Observable` class.
- `ContentView.swift` — the root `NavigationStack` and habit list. Has bugs.
- `HabitDetailView.swift` — habit detail screen. Mostly stubbed.
- `AddHabitView.swift` — empty stub for Task 6.
- `HabitTrackerTests.swift` — unit tests you must make pass.

### `Models.swift`

```swift
import Foundation
import Observation

// One habit. Persisted as JSON inside @AppStorage in HabitStore.
struct Habit: Codable {
    // TODO (Task 2): make this type Identifiable AND Hashable.
    // The unique id is the `id: UUID` below.

    let id: UUID
    var name: String
    var icon: String                 // an emoji like "📚" or "💧"
    var doneToday: Bool              // today's checkmark
    var lastSevenDays: [Bool]        // length 7, oldest first; index 6 == today

    init(id: UUID = UUID(),
         name: String,
         icon: String,
         doneToday: Bool = false,
         lastSevenDays: [Bool] = Array(repeating: false, count: 7)) {
        self.id = id
        self.name = name
        self.icon = icon
        self.doneToday = doneToday
        self.lastSevenDays = lastSevenDays
    }

    // Days completed in the rolling 7-day window. Used by the progress bar.
    var weeklyCount: Int { lastSevenDays.filter { $0 }.count }

    // 0.0 ... 1.0
    var weeklyProgress: Double { Double(weeklyCount) / 7.0 }
}

@Observable
final class HabitStore {
    // The full list of habits. Each mutation must call save().
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
        // mirror today's state into the last slot of the rolling 7-day window
        habits[i].lastSevenDays[6] = habits[i].doneToday
        save()
    }

    // TODO (Task 4): load() reads JSON-encoded [Habit] from UserDefaults under
    //                HabitStore.storageKey and assigns it to `habits`.
    //                On any failure, leave `habits` as is.
    func load() {
        // TODO
    }

    // TODO (Task 4): save() encodes `habits` to JSON and writes the Data to
    //                UserDefaults under HabitStore.storageKey.
    func save() {
        // TODO
    }
}
```

### `ContentView.swift`

```swift
import SwiftUI

struct ContentView: View {
    @State private var store = HabitStore()
    @State private var showAdd = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            // BUG (Task 2): the list does not compile because Habit is not
            // Identifiable. Fix in Models.swift.
            List(store.habits) { habit in
                NavigationLink(value: habit) {
                    HabitRow(habit: habit, store: store)
                }
            }
            // BUG (Task 1): the destination is registered in the wrong place.
            .navigationTitle("Habits")
            .overlay {
                if let msg = errorMessage {
                    Text(msg).foregroundStyle(.red)
                }
            }
        }
        .navigationDestination(for: Habit.self) { habit in
            HabitDetailView(habit: habit, store: store)
        }
        // TODO (Task 6): add a toolbar with a "+" button (placement .topBarTrailing)
        //                that flips showAdd = true, plus a .sheet presenting AddHabitView.
        //                Also add an EditButton (placement .topBarLeading) for Task 3.
    }
}

struct HabitRow: View {
    let habit: Habit
    // BUG (Task 5): wrong wrapper for receiving an @Observable store.
    @StateObject var store: HabitStore

    var body: some View {
        HStack(spacing: 12) {
            Text(habit.icon).font(.title)
            VStack(alignment: .leading, spacing: 4) {
                Text(habit.name).font(.headline)
                // Weekly progress bar — 7 small rectangles, filled if done that day
                HStack(spacing: 2) {
                    ForEach(0..<7, id: \.self) { i in
                        Rectangle()
                            .fill(habit.lastSevenDays[i] ? Color.green : Color.gray.opacity(0.3))
                            .frame(width: 14, height: 6)
                    }
                }
            }
            Spacer()
            Button {
                store.toggleToday(habit)
            } label: {
                Image(systemName: habit.doneToday ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(habit.doneToday ? .green : .secondary)
            }
            .buttonStyle(.plain)
        }
        .padding(.vertical, 4)
    }
}
```

### `HabitDetailView.swift`

```swift
import SwiftUI

struct HabitDetailView: View {
    let habit: Habit
    @Bindable var store: HabitStore

    var body: some View {
        VStack(spacing: 16) {
            Text(habit.icon).font(.system(size: 96))
            Text(habit.name).font(.title).bold()

            // BUG (Task 6, part 1): modifier order is wrong.
            // The author wanted: a rounded green pill of fixed size 220 x 56,
            // with the percentage text centred inside the pill, the pill rounded,
            // and the green should NOT bleed beyond the rounded shape.
            // The current chain produces a square green block with no clipping.
            Text("\(Int(habit.weeklyProgress * 100))% this week")
                .foregroundColor(.white)
                .background(Color.green)
                .cornerRadius(28)
                .frame(width: 220, height: 56)
                .padding()

            Button(habit.doneToday ? "Mark as not done today" : "Mark as done today") {
                store.toggleToday(habit)
            }
            .buttonStyle(.borderedProminent)

            Spacer()
        }
        .padding()
        .navigationTitle(habit.name)
    }
}
```

### `AddHabitView.swift`

```swift
import SwiftUI

struct AddHabitView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var store: HabitStore

    @State private var name = ""
    @State private var icon = "📚"

    var body: some View {
        // TODO (Task 6, part 2): show a NavigationStack containing
        //   - a Form with a TextField bound to $name and a TextField bound to $icon
        //   - navigationTitle "New Habit"
        //   - a "Save" toolbar button (placement .confirmationAction) that calls
        //     store.add(name:icon:) ONLY if name is not empty, then dismisses.
        //   - a "Cancel" toolbar button (placement .cancellationAction) that dismisses.
        Text("TODO")
    }
}
```

### `HabitTrackerTests.swift` (read-only — do not edit)

```swift
import XCTest
@testable import HabitTracker

final class HabitTrackerTests: XCTestCase {
    func testHabitIsIdentifiableByID() { /* ... see Tests section ... */ }
    func testHabitWeeklyCount()        { /* ... */ }
    func testListCompilesAndRenders()  { /* ... */ }
    func testDeleteRemovesHabit()      { /* ... */ }
    func testToggleTodayPersists()     { /* ... */ }
    func testStoreEncodesAndDecodes()  { /* ... */ }
    func testNavigationDestinationRegistered() { /* ... */ }
}
```

---

## Tasks (work through in order)

### Task 1 — Fix the broken navigation (3 pt)

The `.navigationDestination(for: Habit.self)` is currently attached *outside* the `NavigationStack`, so taps on a row do nothing. Move it so it is attached to the `List` (the root content) inside the `NavigationStack`.

Hint: `.navigationDestination(for:)` must be attached to a view *inside* the `NavigationStack`, not on the stack itself or after it.

### Task 2 — Make `Habit` Identifiable + Hashable (3 pt)

`List(store.habits) { ... }` requires the element type to be `Identifiable`. `NavigationLink(value: habit)` requires it to be `Hashable`. Make `Habit` conform to both so the project compiles and renders.

Requirements:
- Conformance to `Identifiable`. `id` is the existing `UUID` property.
- Conformance to `Hashable`. (Auto-synthesis works because every stored property is Hashable.)
- The `List` shows one row per habit; tapping a row pushes `HabitDetailView`.

### Task 3 — Swipe-to-delete + Edit button (3 pt)

Replace `List(store.habits) { ... }` with a `List` containing an explicit `ForEach(store.habits) { ... }`, then attach `.onDelete` so rows can be swiped away, and add an `EditButton()` to the toolbar (placement `.topBarLeading`).

Deleting a row should call `store.remove(at: offsets)` (which the store already implements). Edit mode must show the standard reorder handles even though `.onMove` is not required.

### Task 4 — Persist habits with `@AppStorage`-style storage (4 pt)

Implement `HabitStore.load()` and `HabitStore.save()` so that `habits` survives across launches.

Requirements:
- Persist a JSON-encoded `[Habit]` blob as `Data` in `UserDefaults.standard` under the key `HabitStore.storageKey` (the constant is already provided as `"habits.v1"`).
- `save()` encodes `habits` with `JSONEncoder` and writes the resulting `Data` via `UserDefaults.standard.set(_:forKey:)`.
- `load()` reads the `Data` via `UserDefaults.standard.data(forKey:)`, decodes with `JSONDecoder` into `[Habit]`, and assigns to `self.habits`. On any failure (no data yet, decode error), leave `habits` untouched (do not crash).
- `init()` calls `load()` (already wired). The provided `add`, `remove`, and `toggleToday` already call `save()`.

A correct implementation passes `testStoreEncodesAndDecodes` and `testToggleTodayPersists`.

### Task 5 — Fix the `@StateObject` vs `@ObservedObject` bug (3 pt)

`HabitRow` declares `@StateObject var store: HabitStore`. Two things are wrong:

1. `@StateObject` is the legacy wrapper used by the *creator* of an `ObservableObject` model. It is the wrong wrapper for receiving a model from a parent — and `@StateObject` does not even apply to `@Observable` types.
2. `HabitRow` is a *child* that *receives* the store. The correct shape for receiving an `@Observable` is plain `var store: HabitStore` (no wrapper) or, if it needed `$store.x` bindings, `@Bindable var store: HabitStore`.

Fix `HabitRow` so it uses the right form. The change should be one line. Verify that:
- The list still compiles and shows rows.
- Tapping the checkmark mutates the store and the row re-renders.
- The store survives parent re-renders (it does, because `ContentView` already owns it via `@State`).

### Task 6 — Polish (4 pt)

Three small fixes:

1. **(1.5 pt) Modifier order in `HabitDetailView`.** The "X% this week" text should be a rounded green pill of fixed size 220 x 56, with the percentage centred inside the pill. The current chain (`.background -> .cornerRadius -> .frame -> .padding`) puts the frame *outside* the painted area, so the green block does not match the rounded shape and the visible result has square corners.

   Reorder the modifiers so that:
   - The text appears in white inside a 220 x 56 box.
   - The whole box is filled green and clipped to a rounded rectangle (corner radius 28 produces a pill).
   - The outer `.padding()` stays *outside* the pill (breathing room from the rest of the screen).

   Canonical order rule: *frame -> background -> cornerRadius -> outer padding*. The modifier written first is applied closest to the content.

2. **(1.5 pt) Add the `+` button + `AddHabitView` sheet.**
   - In `ContentView`'s toolbar add a `ToolbarItem(placement: .topBarTrailing)` with an `Image(systemName: "plus")` button that flips `showAdd = true`. Also add a `ToolbarItem(placement: .topBarLeading)` with an `EditButton()` (this satisfies the toolbar requirement of Task 3 too).
   - Add `.sheet(isPresented: $showAdd) { AddHabitView(store: store) }` to the same view.
   - Implement `AddHabitView`'s body: `NavigationStack { Form { TextField("Name", text: $name); TextField("Icon (emoji)", text: $icon) } .navigationTitle("New Habit") .toolbar { ... } }`.
   - The Save button is `.disabled` when `name` is empty; on tap it calls `store.add(name: name, icon: icon)` and then `dismiss()`. Cancel just dismisses.

3. **(1 pt) No force-unwraps anywhere.** No `!` on `URL(string:)`, `Int(_:)`, dictionary lookups, or `as!`. Use `if let`, `guard let`, or `??`. (This is the same standard as Mock 1; restated because it's easy to slip on.)

---

## Unit Tests (must pass)

These are the names the grader runs. Each maps to one or more tasks.

| Test | What it asserts | Tasks |
|---|---|---|
| `testHabitIsIdentifiableByID` | Two `Habit` values with the same `id` are equal and hash equal; `habit.id` is the existing `UUID` property. | 2 |
| `testHabitWeeklyCount` | `Habit(...).weeklyCount` correctly counts `true` entries in `lastSevenDays`; `weeklyProgress` returns `count / 7.0`. | (sanity) |
| `testListCompilesAndRenders` | `ContentView`'s `body` builds with `store.habits` populated, and the row text contains the first habit's `name`. | 2, 5 |
| `testDeleteRemovesHabit` | After `store.remove(at: IndexSet(integer: 0))`, `store.habits.count` decreases by 1. (Sanity check that the array is mutable and `ForEach(store.habits)` is in use.) | 3 |
| `testToggleTodayPersists` | After `store.toggleToday(habit)` then constructing a new `HabitStore()`, the new store reads back the same `doneToday` and `lastSevenDays[6]` values. | 4, 5 |
| `testStoreEncodesAndDecodes` | `JSONEncoder().encode(store.habits)` round-trips through `JSONDecoder().decode([Habit].self, from: data)` to equal arrays. | 2, 4 |
| `testNavigationDestinationRegistered` | The view tree contains a `.navigationDestination(for: Habit.self)` reachable from inside the `NavigationStack`. | 1 |

---

## Grading Notes

- Partial credit is awarded per task — see `16-practical-rubric.md`.
- The unit tests give a pass/fail signal but the rubric determines points.
- Do not change test files. Do not change the `Habit` field names (you may add computed properties).
- You may use `if let`, `guard let`, `??` freely. Force-unwrap (`!`) on `URL(string:)`, `Int(_:)`, dictionary lookups, or `as!` will cost you the 1 pt safety mark in Task 6 part 3 *regardless* of whether tests pass.
- Total points: 3 + 3 + 3 + 4 + 3 + 4 = **20**.
