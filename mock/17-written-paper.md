# Mock 5 — Written Exam (Closed Book)
**Time: 45 minutes | Total: 10 points**

> Instructions for student: do not look at `18-written-answers.md` until you finish.
> Suggested time budget: Section A ~12 min, Section B ~18 min, Section C ~15 min.

---

## Section A — Output Prediction (3 points)

For each question, write down exactly what gets printed (one line per `print` call). If a value would print with the `Optional(...)` wrapper, write that wrapper. Order matters.

### Q1 (0.75 pt)

```swift
let nums = [1, 2, 3, 4, 5, 6]
let result = nums
    .filter { $0 % 2 == 1 }
    .map    { $0 * 10 }
    .reduce(0, +)
print(result)
print(nums.map { $0 + 1 }.first ?? -1)
```

---

### Q2 (0.75 pt)

```swift
let raw = ["10", "x", "20", "", "30", "abc"]
let cleaned = raw.compactMap { Int($0) }
print(cleaned)
print(cleaned.reduce(0, +))
print(raw.count, cleaned.count)
```

---

### Q3 (0.75 pt)

```swift
enum Shape {
    case circle(radius: Double)
    case rect(w: Double, h: Double)
    case point
}

let shapes: [Shape] = [.circle(radius: 3), .rect(w: 4, h: 5), .point]

for s in shapes {
    switch s {
    case .circle(let r):           print("c=\(r)")
    case .rect(let w, let h):      print("r=\(w * h)")
    case .point:                   print("p")
    }
}
```

---

### Q4 (0.75 pt)

```swift
let prices = ["apple": 30, "banana": 20, "cherry": 50]

let total = prices
    .filter { $0.value >= 25 }
    .map    { $0.value }
    .reduce(0, +)

print(total)
print(prices["mango"] ?? 0)
print("keys=\(prices.keys.sorted())")
```

> Note: `.keys.sorted()` produces a deterministic alphabetical order.

---

## Section B — Code Improvement (4 points)

For each snippet: (a) state what is wrong and why it is unsafe / incorrect, (b) rewrite it correctly. You do not have to keep variable names; just keep the intent.

### Q1 (1.5 pt)

```swift
func loadUsers() async -> [String] {
    let url = URL(string: "https://api.example.com/users")!
    let (data, _) = try! await URLSession.shared.data(from: url)
    let names = try! JSONDecoder().decode([String].self, from: data)
    return names
}
```

State **two** distinct problems with this function (there are at least two — both involve unsafe assumptions). Rewrite the function so that it returns `[String]` on success and an empty array on any failure, with the failure printed to the console.

---

### Q2 (1.5 pt)

```swift
struct Note: Codable {
    let id: Int
    let title: String
    let createdAt: Date
}

// JSON the server actually sends:
// { "note_id": 1, "title": "Hi", "created_at": 1715260800 }

func parse(_ data: Data) -> Note? {
    let decoder = JSONDecoder()
    return try? decoder.decode(Note.self, from: data)
}
```

The function compiles and `parse(...)` always returns `nil` no matter what valid payload you pass in. State **why** it returns `nil` (be specific about the two mismatches), then rewrite `Note` and/or the decoder so that the JSON above decodes correctly into a `Note`.

---

### Q3 (1 pt)

```swift
func averageGrade(of scores: [Int]) -> Double {
    let total = scores.reduce(0, +)
    return Double(total) / Double(scores.count)
}

print(averageGrade(of: [80, 90, 100]))   // 90.0  — fine
print(averageGrade(of: []))              // ???   — surprise
```

State what happens on the empty-array call and why. Rewrite `averageGrade` so that an empty input does **not** crash or produce `nan`, and document your choice (return `Double?` or return `0`, your call — but justify).

---

## Section C — View Decomposition (3 points)

Use only `VStack`, `HStack`, `Text`, `Image`, and `Spacer`. Modifiers allowed: `.font`, `.foregroundColor` / `.foregroundStyle`, `.padding`, `.bold()`, `.frame(...)`, `.background(...)`, `.cornerRadius(...)`, plus `spacing:` / `alignment:` arguments on the stacks. You do not need to wrap the result in a `View` — just write the body content.

### Q1 (3 pt) — Chat message bubbles

Wireframe — a chat thread showing two messages, one from "them" (left-aligned) and one from "me" (right-aligned). Each bubble has a sender name, the message text, and a timestamp.

```
+---------------------------------------------------+
|  Alice                                            |
|  +----------------------+                         |
|  | Hey, are you free    |                         |
|  | tonight?             |                         |
|  +----------------------+                         |
|  19:42                                            |
|                                                   |
|                                            Me     |
|                         +----------------------+  |
|                         | Yes, see you at 8.   |  |
|                         +----------------------+  |
|                                            19:43  |
+---------------------------------------------------+
```

Layout requirements:

- The **outer** layout is a `VStack(alignment: .leading)` holding the whole thread.
- Each message is itself a small block: sender name on top, bubble in the middle, timestamp at the bottom — all stacked vertically.
- For "Alice" (them): the block sits at the leading edge, the bubble has a light gray background.
- For "Me": the block is pushed to the trailing edge, the bubble has a blue background and white text.
- Bubbles have padding inside, corner radius ~12.
- Sender name is `.caption` and `.foregroundStyle(.secondary)`. Timestamp is `.caption2` and `.foregroundStyle(.secondary)`. Message text is `.body`.
- Use `Spacer()` correctly to push the "Me" block right (hint: wrap it in an `HStack { Spacer(); meBlock }`).

Write the SwiftUI body for the whole thread (both messages). You may copy bubble structure between the two — just make sure the alignments and colors differ.

---

**End of paper.** Re-read your Section B answers — that is where most points are lost. Then check yourself against `18-written-answers.md`.
