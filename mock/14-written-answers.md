# Mock 4 — Written Exam Answers
**Total: 10 points**

> Self-grading guide. Each answer shows the expected output / fix plus 2-4 lines of reasoning so you understand *why*.

---

## Section A — Output Prediction (3 points)

### Q1 (0.75 pt)

```
0 0
5 0
```

**Why:**
- `Point` is a `struct` (value type). Passing `pt` into `bumpPoint` copies it. The `var p = p` shadowing inside the function gives a *second* mutable copy. Mutating `p.x` touches neither the parameter nor the caller's `pt`. So `pt.x` is still `0`.
- `Pin` is a `class` (reference type). The parameter `p` is the same instance as the caller's `pn` — passing a class copies the *pointer*, not the object. Mutating `p.x` mutates the shared object, so `pn.x` becomes `5`. Note that even though `pn` is `let`, the object's `var x` is still mutable; `let` only freezes the pointer.

---

### Q2 (0.75 pt)

```
2
3
4
```

**Why:**
- `mutating func tick()` is allowed to write `self`. `a.tick()` twice gives `a.count == 2`.
- `ticked()` is a *non-mutating* function returning a new `Counter`. It works on a local copy. So `b.count == 3` (`a` was 2, copy bumped to 3) and `a.count` is still `2`.
- `c = b.ticked()` makes another fresh copy from `b` (which is 3) and returns `count == 4`. `b.count` stays at `3`.

The pattern: `mutating func` writes in place; a function returning `Self` is the immutable / functional counterpart. Both are common with structs.

---

### Q3 (0.75 pt)

```
["code=7", "read=5"]
missing
```

**Why:**
- `filter { $0.value > 0 }` keeps `read=5, code=7, draw=2` (drops `run=0`).
- `sorted { $0.value > $1.value }` orders by value descending: `code=7, read=5, draw=2`.
- `prefix(2)` takes the first two: `code=7, read=5`.
- `map` formats: `["code=7", "read=5"]`. Order is deterministic because we sorted before slicing.
- `habits["meditate"]` is `nil`; `?? "missing"` yields `"missing"`.

---

### Q4 (0.75 pt)

```
12
[2, 4, 6]
```

**Why:**
- `Box` is a `class`. The array stores three pointers. Iterating and writing `b.n *= 2` mutates the *same* objects the caller still holds references to.
- `total` after the loop: `2 + 4 + 6 = 12`.
- After the function returns, `boxes.map { $0.n }` reads each (mutated) object's `n`: `[2, 4, 6]`.

This is the canonical "I passed a `let` array of class instances and the contents changed" trap. `let` on the array forbids `append`/reassignment, but each element is a class reference whose object is mutable.

---

## Section A subtotal: 3 points (0.75 x 4)

---

## Section B — Code Improvement (4 points)

### Q1 (1.25 pt)

**Two issues:**

1. **`@ObservedObject var store = HabitStore()`** — `@ObservedObject` is the legacy wrapper for `ObservableObject`-conforming classes. `@Observable` (Swift macro, iOS 17+) is the *replacement* for that whole pattern; you do not stack `@ObservedObject` on top of it. Worse, `@ObservedObject` does not even know how to *create* and persist an instance — every re-render of `HabitListView` re-runs the default-value expression `HabitStore()`, throwing away `habits`. The owner of an `@Observable` model uses `@State`.
2. **`TextField("New habit", text: draft)`** — `TextField` requires `Binding<String>`, and `draft` is a plain `String`. Pass the projected value with `$draft`.

**Corrected:**

```swift
struct HabitListView: View {
    @State private var store = HabitStore()        // fix #1: creator uses @State
    @State private var draft = ""

    var body: some View {
        VStack {
            HStack {
                TextField("New habit", text: $draft)   // fix #2: $draft, not draft
                Button("Add") { store.add(draft); draft = "" }
            }
            ForEach(store.habits, id: \.self) { Text($0) }
        }
    }
}
```

(If a child view needed to receive this `store`, it would take a plain `var store: HabitStore` for read-only use, or `@Bindable var store: HabitStore` if it needs `$store.something` bindings — *not* `@ObservedObject`.)

---

### Q2 (1.25 pt)

**What's wrong (modifier order).** Modifiers wrap their content; the modifier *written first* is applied *closest to the content*. Reading top-to-bottom:

- `.foregroundColor(.white)` — fine, paints text white.
- `.cornerRadius(12)` — rounds the *text view*, but the next step paints over it.
- `.background(Color.orange)` — paints orange behind whatever is currently the chain's content. Because `.background` comes *after* `.cornerRadius`, it draws a *square* orange rectangle on top, hiding the rounded corners.
- `.padding()` — adds 16pt around the (now square orange) text, *outside* the colour. So the orange does not include the padded area.
- `.frame(width: 140, height: 40)` — applied last, *outside* everything, so the 140 x 40 box wraps a small padded square, leaving the text positioned wherever the inner chain ended up — not centered in a pill.

**Canonical order rule:** for a coloured pill, `.padding()` (inner) then `.frame(...)` then `.background(...)` then `.cornerRadius(...)` then optional outer `.padding(...)` — the painted area must be sized first, painted second, rounded third.

**Fixed:**

```swift
struct CardBadge: View {
    var body: some View {
        Text("STREAK 7")
            .foregroundColor(.white)
            .frame(width: 140, height: 40)      // size the box
            .background(Color.orange)           // paint the (now sized) box
            .cornerRadius(12)                   // round the painted area
            .padding()                          // outer breathing room
    }
}
```

(Equally acceptable: drop `.cornerRadius` and use `.background(Color.orange, in: RoundedRectangle(cornerRadius: 12))`.)

---

### Q3 (1.5 pt)

**(a) Why `@ObservedObject var vm = TimerVM()` resets on every re-render.**

`ChildView` is a `struct`. SwiftUI rebuilds the struct on every render of the parent. Stored properties get re-initialized. `@ObservedObject` does *not* manage lifetime — it just observes a model passed in. So writing `@ObservedObject var vm = TimerVM()` re-runs `TimerVM()` on every render, throwing away the old `elapsed`. The lifecycle-owning wrapper for *creating* an observable is `@StateObject` (legacy) or `@State` on an `@Observable` (modern).

**(b) Why the two children do not share state.**

Each `ChildView()` constructor call runs its own `TimerVM()` initializer. Even if the wrapper *did* persist, the two children have built two *different* `TimerVM` instances. Sharing requires *one* instance to be created in a parent (or higher), then handed down to both children.

**Fix (modern, iOS 17+):**

```swift
import SwiftUI
import Observation

@Observable
final class TimerVM {
    var elapsed = 0
}

struct ParentView: View {
    @State private var vm = TimerVM()       // ONE instance, owned here
    var body: some View {
        VStack {
            ChildView(vm: vm)               // hand the same instance down
            ChildView(vm: vm)
        }
    }
}

struct ChildView: View {
    var vm: TimerVM                          // receiver: plain var, no wrapper needed
    var body: some View {
        VStack {
            Text("Elapsed: \(vm.elapsed)")
            Button("Tick") { vm.elapsed += 1 }
        }
    }
}
```

**Why this works:** `@State` in `ParentView` tells SwiftUI "instantiate `TimerVM` once when the parent first appears, and persist it across re-renders." Both children receive the same reference. Tapping Tick in either child mutates the shared `elapsed`; both `Text`s re-render because both *read* `vm.elapsed`. No data loss on parent re-render.

(Legacy-equivalent acceptable answer: `@StateObject private var vm = TimerVM()` in parent, `@ObservedObject var vm: TimerVM` in child, with `TimerVM: ObservableObject` and `@Published var elapsed`.)

---

## Section B subtotal: 4 points (1.25 + 1.25 + 1.5)

---

## Section C — View Decomposition (3 points)

```swift
VStack(alignment: .leading, spacing: 12) {

    // Row 1 - Reminders ON
    HStack(spacing: 12) {
        Image(systemName: "bell.fill")
            .font(.title3)
            .foregroundStyle(.orange)
            .frame(width: 28)
        Text("Reminders").font(.body)
        Spacer()
        Text("ON").font(.body).bold().foregroundColor(.green)
    }

    // Row 2 - Dark mode OFF
    HStack(spacing: 12) {
        Image(systemName: "moon.fill")
            .font(.title3)
            .foregroundStyle(.purple)
            .frame(width: 28)
        Text("Dark mode").font(.body)
        Spacer()
        Text("OFF").font(.body).foregroundStyle(.secondary)
    }

    // Row 3 - Week starts on Monday
    HStack(spacing: 12) {
        Image(systemName: "calendar")
            .font(.title3)
            .foregroundStyle(.blue)
            .frame(width: 28)
        Text("Week starts on").font(.body)
        Spacer()
        Text("Monday").font(.body).foregroundStyle(.secondary)
    }

    // Row 4 - Reset all habits >
    HStack(spacing: 12) {
        Image(systemName: "trash")
            .font(.title3)
            .foregroundStyle(.red)
            .frame(width: 28)
        Text("Reset all habits").font(.body)
        Spacer()
        Image(systemName: "chevron.right")
            .foregroundStyle(.secondary)
    }
}
.padding()
```

**Grading guidance.**

- 0.5 pt: outer `VStack(alignment: .leading)` with reasonable `spacing:`.
- 0.5 pt: each row is an `HStack` with the correct *order* `[icon, label, Spacer(), value]`.
- 0.5 pt: a `Spacer()` *between* the label and the value in every row (this is what pins values to the trailing edge).
- 0.5 pt: SF Symbols sized via `.font(...)` (not `.frame`), with `.frame(width: 28)` reserved as a fixed icon column so labels align across rows.
- 0.5 pt: per-row colours roughly correct (orange / purple / blue / red on the icons; green for ON; secondary for OFF and Monday and the chevron).
- 0.5 pt: outer `.padding()` on the VStack.

**Why each part is the way it is.** A list of rows is vertical, so the outer container is `VStack`. Each row is left-label / right-value, so each row is an `HStack`. The Spacer is the only thing that actually pushes the value to the trailing edge; without it the items would clump in the centre of the row. The fixed-width icon frame is what makes the *labels* line up across rows — without it, the row that has a wider icon would push the label further right than the others.

(Acceptable variation: extracting a `SettingsRow(icon:tint:label:trailing:)` helper view. As long as the structure is right, full marks.)

---

## Section C subtotal: 3 points

---

## Grand total: 10 points

| Section | Points | Topics covered                                                                  |
| ------- | ------ | ------------------------------------------------------------------------------- |
| A       | 3.0    | Struct-vs-class param passing, mutating funcs, dictionary pipeline, class-in-array aliasing |
| B       | 4.0    | @Observable + @State ownership, modifier order (frame/background/cornerRadius), @StateObject vs @ObservedObject |
| C       | 3.0    | Settings list of repeated label-on-left / value-on-right rows                    |

### How to self-grade

- **Section A**: outputs must be exact, including spacing. `0 0` not `(0, 0)`. `Optional(...)` if the value is optional.
- **Section B**: half marks for spotting the bug, half for a clean fix. Q3 needs *both* "why it resets" and "why they don't share" — partial credit otherwise.
- **Section C**: structure (`VStack` of `HStack` rows with `Spacer` in each) carries 2/3 of the marks. Modifiers carry the rest.

If you got under 7/10, focus revision on:
- Force-internalising "struct copies, class shares" by re-doing Q1, Q4 of Section A from a blank page.
- Drilling the modifier-order rule from Section B Q2 — `padding -> frame -> background -> cornerRadius`.
- Re-deriving Section B Q3 in your head: "creator -> `@State`; receiver -> plain `var` (or `@Bindable` if it needs `$`)".
