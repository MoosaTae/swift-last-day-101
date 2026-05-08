# Mock 2 — Written Exam (Closed Book)
**Time: 45 minutes | Total: 10 points**

> Instructions for student: do not look at `06-written-answers.md` until you finish.
> Suggested time budget: Section A ~10 min, Section B ~20 min, Section C ~15 min.

---

## Section A — Output Prediction (3 points)

For each question, write down exactly what gets printed (one line per `print` call). If a value would print with the `Optional(...)` wrapper, write that wrapper. Order matters.

### Q1 (0.5 pt)

```swift
let nums = [3, 1, 4, 1, 5, 9, 2, 6]

let result = nums
    .sorted(by: >)
    .prefix(3)
    .reduce(0, +)

print(result)
```

---

### Q2 (0.75 pt)

```swift
struct Person {
    let firstName: String
    let lastName: String
    var fullName: String { "\(firstName) \(lastName)" }
}

let p = Person(firstName: "Tae", lastName: "S")
let names = [p, Person(firstName: "Aom", lastName: "K")]

print(names.map { $0.fullName }.joined(separator: ", "))
print(names.first?.fullName ?? "none")
print(names.first(where: { $0.firstName == "Bob" })?.fullName ?? "none")
```

---

### Q3 (0.75 pt)

```swift
func makeCounter() -> () -> Int {
    var count = 0
    return {
        count += 1
        return count
    }
}

let next = makeCounter()
print(next())
print(next())
print(next())

let other = makeCounter()
print(other())
```

---

### Q4 (1 pt)

```swift
let words = ["apple", "ant", "banana", "blueberry", "cherry"]

let grouped = Dictionary(grouping: words, by: { $0.first! })

print(grouped["a"]?.count ?? 0)
print(grouped["b"]?.sorted() ?? [])
print(grouped["z"]?.first ?? "missing")
print(words.filter { $0.count > 5 }.map { $0.uppercased() }.sorted())
```

> Note: dictionary iteration order is not deterministic, but `.sorted()` makes the array output deterministic.

---

## Section B — Code Improvement (4 points)

For each snippet: (a) state what is wrong and why it is unsafe / incorrect, (b) rewrite it correctly. You do not have to keep variable names; just keep the intent.

### Q1 (1 pt)

```swift
struct CounterView: View {
    @State private var counter = Counter()

    var body: some View {
        VStack {
            Text("Count: \(counter.value)")
            Button("Increment") {
                counter.value += 1
            }
        }
    }
}

class Counter {
    var value: Int = 0
}
```

The build succeeds and the button is tappable, but the label never updates. State what is wrong and provide a corrected version that re-renders on each tap. (You may modify either or both types.)

---

### Q2 (1.5 pt)

```swift
struct ToggleRow: View {
    @State var isOn: Bool

    var body: some View {
        HStack {
            Text(isOn ? "ON" : "OFF")
            Spacer()
            Button("Flip") { isOn.toggle() }
        }
    }
}

struct SettingsView: View {
    @State private var darkMode = false
    @State private var notifications = false

    var body: some View {
        VStack {
            ToggleRow(isOn: darkMode)
            ToggleRow(isOn: notifications)
            Text("Dark mode: \(darkMode ? "yes" : "no")")
        }
    }
}
```

When the user taps "Flip" inside `ToggleRow`, the row's own label flips, but the parent's `Text("Dark mode: ...")` never changes. State what is wrong (there are two related issues) and rewrite both views so the parent stays in sync.

---

### Q3 (1.5 pt)

```swift
struct ProductView: View {
    let priceString: String
    let discountString: String

    var body: some View {
        let price = Double(priceString)!
        let discount = Double(discountString)!
        let final = price - (price * discount / 100)

        return VStack {
            Text("Price: \(price)")
            Text("Discount: \(discount)%")
            Text("Final: \(final)")
        }
    }
}

ProductView(priceString: "199.00", discountString: "ten")
```

State everything that is wrong with this view (there are at least two distinct problems) and rewrite it so it compiles, never crashes, and shows a sensible message when the input cannot be parsed.

---

## Section C — View Decomposition (3 points)

Use only `VStack`, `HStack`, `Text`, `Image`, and `Spacer`. Modifiers allowed: `.font`, `.foregroundColor` / `.foregroundStyle`, `.padding`, `.bold()`, `.frame(...)`, `.resizable()`, `.scaledToFill()` / `.scaledToFit()`, `.clipShape(...)`, plus `spacing:` / `alignment:` arguments on the stacks. You do not need to wrap the result in a `View` — just write the body content.

### Q1 (1.5 pt)

Wireframe — a recipe card row, image on the left, two lines of text on the right, time pinned to the far right:

```
+------------------------------------------------------+
| +------+  Spaghetti Carbonara              25 min    |
| |IMAGE |  Italian                                    |
| +------+                                             |
+------------------------------------------------------+
```

- The image on the left is an asset named `"carbonara"`, fixed at 64x64, clipped to a rounded square (use `.clipShape` with any rounded shape; a simple `Circle()` is acceptable if you prefer).
- "Spaghetti Carbonara" is a headline-sized label.
- "Italian" is a caption-sized secondary label, sitting directly under the title.
- "25 min" is right-aligned, body-sized, secondary color, vertically centered with the title row.
- Comfortable spacing between the image and the text column.

Write the SwiftUI body.

---

### Q2 (1.5 pt)

Wireframe — a profile header that sits above a feed:

```
+------------------------------------------------------+
|                    +------+                          |
|                    |AVATAR|                          |
|                    +------+                          |
|                                                      |
|                     Tae S.                           |
|                  iOS Developer                       |
|                                                      |
|        42              128             7             |
|       Posts          Followers      Following        |
+------------------------------------------------------+
```

- Centered avatar (asset `"me"`, 80x80, circular).
- Centered name "Tae S." (title2, bold), with subtitle "iOS Developer" (subheadline, secondary) directly below.
- Three centered stat columns at the bottom: each column is a number on top (headline, bold) and a label below (caption, secondary). Spaced evenly across the full width — adjacent columns equally far apart.
- The whole thing is one vertical group, centered horizontally on the screen.

Write the SwiftUI body.

---

**End of paper.** Re-read your Section B answers — state-management bugs are the highest-value question on this paper. Then check yourself against `06-written-answers.md`.
