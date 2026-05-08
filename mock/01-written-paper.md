# Mock Written Exam (Closed Book)
**Time: 45 minutes | Total: 10 points**

> Instructions for student: do not look at `02-written-answers.md` until you finish.
> Suggested time budget: Section A ~10 min, Section B ~20 min, Section C ~15 min.

---

## Section A — Output Prediction (3 points)

For each question, write down exactly what gets printed (one line per `print` call). If a value would print with the `Optional(...)` wrapper, write that wrapper. Order matters.

### Q1 (0.5 pt)

```swift
let raw: String? = "42"
print(raw)
print(Int(raw ?? "") ?? -1)
```

---

### Q2 (0.75 pt)

```swift
struct Box   { var n = 0 }
class  Crate { var n = 0 }

var b1 = Box();   var b2 = b1;   b2.n = 9
let c1 = Crate(); let c2 = c1;   c2.n = 9

print(b1.n, b2.n)
print(c1.n, c2.n)
```

---

### Q3 (0.75 pt)

```swift
var multiplier = 2
let scale = { (x: Int) in x * multiplier }
print(scale(5))
multiplier = 10
print(scale(5))
```

---

### Q4 (1 pt)

```swift
let scores = ["math": 80, "thai": 65, "eng": 92]

let passed = scores
    .filter { $0.value >= 70 }
    .map    { $0.key.uppercased() }
    .sorted()

print(passed)
print(scores["art"] ?? "n/a")
print("count=\(passed.count)")
```

> Note: `passed` is sorted alphabetically, so the array order is deterministic.

---

## Section B — Code Improvement (4 points)

For each snippet: (a) state what is wrong and why it is unsafe / incorrect, (b) rewrite it correctly. You do not have to keep variable names; just keep the intent.

### Q1 (1 pt)

```swift
func greet(from input: String) {
    let age = Int(input)!
    print("Hello, you are \(age) years old.")
}

greet(from: "twenty")
```

---

### Q2 (1.5 pt)

```swift
struct CartItem {
    var quantity: Int
}

func addOne(_ item: CartItem) {
    var item = item
    item.quantity += 1
}

var apple = CartItem(quantity: 1)
addOne(apple)
addOne(apple)
print(apple.quantity)   // author expected 3, got 1
```

State what is wrong. Then provide a fix that keeps `CartItem` as a `struct` and lets `apple.quantity` actually become `3` after the two calls. (Two acceptable fixes exist; show one and briefly mention the other.)

---

### Q3 (1.5 pt)

```swift
struct ProfileView: View {
    @State var username = ""           // <-- problem #1
    var isValid: Bool { !username.isEmpty }

    var body: some View {
        VStack {
            TextField("Name", text: username)              // <-- problem #2
            NameTag(username: username)                    // <-- problem #3
            Button("Save") { }.disabled(!isValid)
        }
    }
}

struct NameTag: View {
    @State var username: String                            // <-- problem #4
    var body: some View { Text("Hi, \(username)") }
}
```

There are four issues across the two views (marked with comments — but in your answer, explain *why* each one is wrong, not just *what* to change). Provide a corrected version of both views.

---

## Section C — View Decomposition (3 points)

Use only `VStack`, `HStack`, `Text`, `Image`, and `Spacer`. Modifiers allowed: `.font`, `.foregroundColor` / `.foregroundStyle`, `.padding`, `.bold()`, `.frame(...)`, plus `spacing:` / `alignment:` arguments on the stacks. You do not need to wrap the result in a `View` — just write the body content.

### Q1 (1.5 pt)

Wireframe — a notification settings row:

```
+------------------------------------------------+
| [bell]   Notifications                    >    |
+------------------------------------------------+
```

- The bell on the left is an SF Symbol (`"bell.fill"`), orange.
- "Notifications" is a body-sized label.
- The `>` chevron on the far right is `"chevron.right"`, secondary color.
- Comfortable horizontal padding, a small fixed-width column for the icon so multiple rows would line up.

Write the SwiftUI body.

---

### Q2 (1.5 pt)

Wireframe — a "subject grade" row from a grades list:

```
+------------------------------------------------+
| 4 Credit                                  3.0  |
| Math                                           |
+------------------------------------------------+
```

- Top-left small grey caption: `"4 Credit"` (caption2, gray).
- Bottom-left headline: `"Math"`.
- Right-aligned bold blue title-ish number: `"3.0"` (title3, bold, blue), vertically aligned with the credit-line.
- The two left labels stack as a column, the grade is pushed to the trailing edge.

Write the SwiftUI body.

---

**End of paper.** Re-read your Section B answers — that is where most points are lost. Then check yourself against `02-written-answers.md`.
