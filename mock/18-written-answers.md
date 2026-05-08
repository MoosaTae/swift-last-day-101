# Mock 5 — Written Exam Answers
**Total: 10 points**

> Self-grading guide. Each answer shows the expected output / fix plus 2–4 lines of reasoning so you understand *why*.

---

## Section A — Output Prediction (3 points)

### Q1 (0.75 pt)

```
90
2
```

**Why:**
- `filter { $0 % 2 == 1 }` keeps the odd numbers `[1, 3, 5]`.
- `map { $0 * 10 }` produces `[10, 30, 50]`.
- `reduce(0, +)` sums them: `0 + 10 + 30 + 50 = 90`.
- `nums.map { $0 + 1 }` is `[2, 3, 4, 5, 6, 7]`. Its `.first` is `Optional(2)`, `?? -1` unwraps to `2`.

---

### Q2 (0.75 pt)

```
[10, 20, 30]
60
6 3
```

**Why:**
- `compactMap { Int($0) }` runs `Int(_:)` on each element and **drops the `nil`s**. `"x"`, `""`, and `"abc"` all return `nil`, so they are filtered out. The remaining valid integers are `[10, 20, 30]`, in original order.
- `reduce(0, +)` sums to `60`.
- The original `raw.count` is `6`; after `compactMap`, `cleaned.count` is `3`.

---

### Q3 (0.75 pt)

```
c=3.0
r=20.0
p
```

**Why:**
- The first case binds `radius` to `r = 3.0`. `Double` interpolation prints `3.0`, not `3`.
- The second case binds both associated values: `w = 4.0, h = 5.0`. `w * h` is `20.0`.
- The third case has no associated value, so we just print the literal `"p"`.

---

### Q4 (0.75 pt)

```
80
0
keys=["apple", "banana", "cherry"]
```

**Why:**
- `filter { $0.value >= 25 }` keeps `("apple", 30)` and `("cherry", 50)`. `banana` (20) is dropped.
- `map { $0.value }` gives `[30, 50]` (in some order — but order doesn't matter for `+`).
- `reduce(0, +)` sums to `80`.
- `prices["mango"]` is `nil`, `?? 0` yields `0`.
- `prices.keys.sorted()` is `["apple", "banana", "cherry"]` alphabetically. The interpolation prints the array literal form.

---

## Section A subtotal: 3.0 points (0.75 × 4)

---

## Section B — Code Improvement (4 points)

### Q1 (1.5 pt)

**Two problems:**

1. **`URL(string: "...")!`** — force-unwrapping a URL is a latent crash. If the literal ever changes (typo, env-var injection, runtime substitution), the whole app traps. `URL(string:)` returns `URL?`; use `guard let`.
2. **`try! await URLSession.shared.data(...)` and `try! JSONDecoder().decode(...)`** — `try!` converts a thrown error into a runtime crash. Network failures (offline, 500, timeout) and decode failures (server changed shape) are *expected* runtime conditions, not programmer bugs. Wrap them in `do { ... } catch { ... }` so the app can recover gracefully.

(A third valid critique: the function silently ignores the HTTP status code. Returning the body for a 500 response is a bug. Mentioning this earns full credit but is not required.)

**Rewrite:**

```swift
func loadUsers() async -> [String] {
    guard let url = URL(string: "https://api.example.com/users") else {
        print("Invalid URL")
        return []
    }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode([String].self, from: data)
    } catch {
        print("loadUsers failed: \(error.localizedDescription)")
        return []
    }
}
```

**Key idea:** convert every "I'm sure this can't fail" (`!`, `try!`) into "if it fails, here's the safe fallback" (`guard`, `do/catch`).

---

### Q2 (1.5 pt)

**Two mismatches:**

1. **Key names.** The JSON sends `"note_id"` and `"created_at"` (snake_case), but the struct's auto-synthesized coding keys are `id` and `createdAt`. The decoder looks for `"id"` and `"createdAt"` in the JSON, doesn't find them, and throws `keyNotFound`. `try?` swallows that into `nil`.
2. **Date format.** `1715260800` is a Unix timestamp (seconds since 1970). The default `JSONDecoder.dateDecodingStrategy` is `.deferredToDate`, which expects an ISO-style number formatted as Apple's reference date — not raw Unix seconds. The decoder either type-mismatches or produces a wrong year. We must set `.secondsSince1970`.

**Fix (option A — explicit `CodingKeys`):**

```swift
struct Note: Codable {
    let id: Int
    let title: String
    let createdAt: Date

    enum CodingKeys: String, CodingKey {
        case id        = "note_id"
        case title
        case createdAt = "created_at"
    }
}

func parse(_ data: Data) -> Note? {
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .secondsSince1970
    return try? decoder.decode(Note.self, from: data)
}
```

**Fix (option B — strategy-based, slightly less explicit):**

```swift
func parse(_ data: Data) -> Note? {
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy  = .convertFromSnakeCase   // note_id -> noteId, created_at -> createdAt
    decoder.dateDecodingStrategy = .secondsSince1970
    return try? decoder.decode(Note.self, from: data)
}
```

Note option B requires renaming the property `id` to `noteId` in the struct, since `.convertFromSnakeCase` would map `note_id` -> `noteId`, not `id`. Either solution is acceptable as long as both mismatches are addressed.

---

### Q3 (1 pt)

**What happens:** `[].reduce(0, +)` is `0`, and `[].count` is `0`, so the function returns `Double(0) / Double(0)`. Floating-point division of `0.0 / 0.0` is `nan` (not-a-number), not a crash. The function silently returns garbage that propagates through the rest of your math.

(If the array were `[Int]` and you used integer division `total / scores.count`, you would actually crash with "Division by zero" — but this code uses `Double` division, which produces `nan` instead. Either explanation earns full credit as long as you note that the empty case is the bug.)

**Fix (option A — return `Double?` and let the caller handle empty):**

```swift
func averageGrade(of scores: [Int]) -> Double? {
    guard !scores.isEmpty else { return nil }
    let total = scores.reduce(0, +)
    return Double(total) / Double(scores.count)
}
```

Caller writes `print(averageGrade(of: []) ?? "n/a")`.

**Fix (option B — return `0` for the empty case):**

```swift
func averageGrade(of scores: [Int]) -> Double {
    guard !scores.isEmpty else { return 0 }
    let total = scores.reduce(0, +)
    return Double(total) / Double(scores.count)
}
```

**Justification:** option A is more honest (an empty list has *no* meaningful average; `nil` says so). Option B is more ergonomic (no optional unwrapping at every call site). Pick whichever matches the rest of your codebase. The wrong answer is to leave `nan` flowing through.

---

## Section B subtotal: 4.0 points (1.5 + 1.5 + 1.0)

---

## Section C — View Decomposition (3 points)

Grading note: small modifier-order or color-name differences are fine. The structure (which `Stack` contains what, where the `Spacer` goes) is what carries the points.

### Q1 (3 pt) — Chat message bubbles

```swift
VStack(alignment: .leading, spacing: 16) {

    // ----- Alice (them) - leading aligned -----
    VStack(alignment: .leading, spacing: 4) {
        Text("Alice")
            .font(.caption)
            .foregroundStyle(.secondary)
        Text("Hey, are you free tonight?")
            .font(.body)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.gray.opacity(0.2))
            .cornerRadius(12)
        Text("19:42")
            .font(.caption2)
            .foregroundStyle(.secondary)
    }

    // ----- Me - trailing aligned -----
    HStack {
        Spacer()                                  // pushes the block to trailing
        VStack(alignment: .trailing, spacing: 4) {
            Text("Me")
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("Yes, see you at 8.")
                .font(.body)
                .foregroundColor(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.blue)
                .cornerRadius(12)
            Text("19:43")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
.padding()
```

**Why this layout:**
- The whole thread is vertical, so the outer container is a `VStack`. `alignment: .leading` is the natural baseline; we override it for the "Me" row using `Spacer`.
- Each message is itself a tiny `VStack` of three lines: sender, bubble, timestamp. The bubble is the middle `Text` with `.padding -> .background -> .cornerRadius` (in that order — background must come *after* padding so the colour wraps the padded content; cornerRadius must come *after* background so it rounds the painted area).
- Pushing the "Me" block to the right is done by wrapping it in `HStack { Spacer(); ... }`. The spacer is greedy and consumes all leftover horizontal space, shoving the block to the trailing edge.
- Using `VStack(alignment: .trailing)` inside the "Me" block makes the sender label and timestamp line up with the **right** edge of the bubble, not the left.

**Common student mistakes to watch for:**
- Forgetting the `Spacer` before the "Me" block (everything stays leading-aligned).
- Putting `.background` *before* `.padding` (background paints only behind the text, padding then sits outside the colour — you get a tiny coloured pill with white margin around it instead of a comfortable padded bubble).
- Putting `.cornerRadius` before `.background` (background re-paints square corners on top of the rounded ones).

---

## Section C subtotal: 3.0 points

---

## Grand total: 10 points

| Section | Points | Topics covered                                                             |
| ------- | ------ | -------------------------------------------------------------------------- |
| A       | 3.0    | filter/map/reduce, compactMap, enums with associated values, dict ops      |
| B       | 4.0    | force-try / async errors, CodingKeys + date strategy, division-by-zero    |
| C       | 3.0    | Asymmetric chat layout, Spacer trick for trailing alignment, bubble chain  |

### How to self-grade

- Section A: each line of output must match exactly. `Optional(...)` wrappers, decimal points (`3.0` not `3`), and array literal formatting all count.
- Section B: 0.5 pt for naming the bug, the rest for a working fix. If you only said "use `do/catch`" without writing the rewrite, half credit.
- Section C: structure first (correct nesting, correct Spacer placement), modifiers second. Wrong outer container = lose most of the question; right structure with one missing modifier = lose ~0.25.

If you got under 7/10, re-read the cheat-sheet for the section you lost the most on, then redo this paper from a blank page tomorrow morning.
