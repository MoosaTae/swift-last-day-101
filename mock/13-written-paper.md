# Mock 4 — Written Exam (Closed Book)
**Time: 45 minutes | Total: 10 points**

> Instructions for student: do not look at `14-written-answers.md` until you finish.
> Suggested time budget: Section A ~10 min, Section B ~20 min, Section C ~15 min.

---

## Section A — Output Prediction (3 points)

For each question, write down exactly what gets printed (one line per `print` call). If a value would print with the `Optional(...)` wrapper, write that wrapper. Order matters.

### Q1 (0.75 pt)

```swift
struct Point { var x = 0; var y = 0 }
class  Pin   { var x = 0; var y = 0 }

func bumpPoint(_ p: Point) {
    var p = p
    p.x += 5
}

func bumpPin(_ p: Pin) {
    p.x += 5
}

var pt = Point()
let pn = Pin()

bumpPoint(pt)
bumpPin(pn)

print(pt.x, pt.y)
print(pn.x, pn.y)
```

---

### Q2 (0.75 pt)

```swift
struct Counter {
    var count = 0
    mutating func tick() { count += 1 }
    func ticked() -> Counter {
        var copy = self
        copy.count += 1
        return copy
    }
}

var a = Counter()
a.tick()
a.tick()

let b = a.ticked()
let c = b.ticked()

print(a.count)
print(b.count)
print(c.count)
```

---

### Q3 (0.75 pt)

```swift
let habits = ["read": 5, "run": 0, "code": 7, "draw": 2]

let result = habits
    .filter { $0.value > 0 }
    .sorted { $0.value > $1.value }
    .prefix(2)
    .map { "\($0.key)=\($0.value)" }

print(result)
print(habits["meditate"] ?? "missing")
```

---

### Q4 (0.75 pt)

```swift
class Box { var n: Int; init(_ n: Int) { self.n = n } }

func mystery(_ items: [Box]) -> Int {
    var total = 0
    for b in items {
        b.n *= 2
        total += b.n
    }
    return total
}

let boxes = [Box(1), Box(2), Box(3)]
let sum = mystery(boxes)

print(sum)
print(boxes.map { $0.n })
```

---

## Section B — Code Improvement (4 points)

For each snippet: (a) state what is wrong and why, (b) rewrite it correctly. You do not have to keep variable names; just keep the intent.

### Q1 (1.25 pt)

```swift
import SwiftUI
import Observation

@Observable
final class HabitStore {
    var habits: [String] = []
    func add(_ h: String) { habits.append(h) }
}

struct HabitListView: View {
    @ObservedObject var store = HabitStore()    // <-- problem #1
    @State private var draft = ""

    var body: some View {
        VStack {
            HStack {
                TextField("New habit", text: draft)   // <-- problem #2
                Button("Add") { store.add(draft); draft = "" }
            }
            ForEach(store.habits, id: \.self) { Text($0) }
        }
    }
}
```

There are two bugs marked with comments. Each silently breaks the app — `@ObservedObject` does not even apply to an `@Observable` type, and the `TextField` will not compile. State *why* each is wrong (one sentence each is enough), and write the corrected `HabitListView`.

---

### Q2 (1.25 pt)

```swift
struct CardBadge: View {
    var body: some View {
        Text("STREAK 7")
            .foregroundColor(.white)
            .cornerRadius(12)
            .background(Color.orange)
            .padding()
            .frame(width: 140, height: 40)
    }
}
```

The author wanted: a 140 x 40 orange pill, with white text centred inside, with rounded corners, and outer padding around the whole pill so it does not touch its neighbours.

Explain why the current modifier order produces the wrong visual (square corners, wrong-sized background, text not in the middle of the pill), and rewrite the `body` so the result matches the intent. State the canonical order rule in one sentence.

---

### Q3 (1.5 pt)

```swift
import SwiftUI

final class TimerVM: ObservableObject {
    @Published var elapsed = 0
}

struct ParentView: View {
    var body: some View {
        VStack {
            ChildView()
            ChildView()    // two siblings reading the same model
        }
    }
}

struct ChildView: View {
    @ObservedObject var vm = TimerVM()    // <-- problem
    var body: some View {
        VStack {
            Text("Elapsed: \(vm.elapsed)")
            Button("Tick") { vm.elapsed += 1 }
        }
    }
}
```

The author complains: "I tap Tick on the first child, the count goes up, but when I tap somewhere else in the parent (or the parent re-renders for any reason), my count resets to 0!" Also: "the two children should share the same counter, but they don't."

Explain (a) why `@ObservedObject var vm = TimerVM()` resets on every re-render, and (b) why the two children do not share state today. Then rewrite *both* views so the counter survives re-renders **and** the two children share one `TimerVM`. Use modern iOS-17 wrappers (`@Observable`, `@State`, plain `var`) in your fix.

---

## Section C — View Decomposition (3 points)

Use only `VStack`, `HStack`, `Text`, `Image`, and `Spacer`. Modifiers allowed: `.font`, `.foregroundColor` / `.foregroundStyle`, `.padding`, `.bold()`, `.frame(...)`, `.background(...)`, `.cornerRadius(...)`, plus `spacing:` / `alignment:` arguments on the stacks. You do not need to wrap the result in a `View` — just write the body content.

### Q1 (3 pt)

Wireframe — a Habit Tracker "Settings" screen body. It is a vertical list of four rows. Each row has a label on the left and a value/control on the right, separated by a Spacer. The four rows are stacked vertically with comfortable spacing.

```
+---------------------------------------------------+
| [bell.fill]  Reminders                  ON        |
+---------------------------------------------------+
| [moon.fill]  Dark mode                  OFF       |
+---------------------------------------------------+
| [calendar]   Week starts on             Monday    |
+---------------------------------------------------+
| [trash]      Reset all habits            >        |
+---------------------------------------------------+
```

Specifications:

- The whole screen is a `VStack(alignment: .leading, spacing: 12)`.
- Each row is an `HStack(spacing: 12)` with: (left) an SF Symbol icon, (middle-left) a body-sized label, (Spacer), (right) a value `Text` or chevron `Image`.
- Each icon has a fixed `.frame(width: 28)` so the four labels line up vertically across all rows.
- Icons: `"bell.fill"` orange, `"moon.fill"` purple, `"calendar"` blue, `"trash"` red. Size them with `.font(.title3)`.
- Right-side values: `"ON"` green-bold, `"OFF"` secondary, `"Monday"` secondary, and the last row uses an `"chevron.right"` image (secondary).
- Outer `.padding()` on the whole VStack.

Write the SwiftUI body content (the 4-row VStack and its rows). You do **not** have to write a separate `RowView` struct — inlining all four rows is fine, even though it repeats. Aim for a structurally correct, readable answer.

---

**End of paper.** Re-read your Section B answers — those carry the most points and are the easiest to lose on partial reasoning. Then check yourself against `14-written-answers.md`.
