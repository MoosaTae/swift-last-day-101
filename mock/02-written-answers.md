# Mock Written Exam — Answer Key
**Total: 10 points**

> Self-grading guide. Each answer shows the expected output / fix plus 2–4 lines of reasoning so you understand *why*.

---

## Section A — Output Prediction (3 points)

### Q1 (0.5 pt)

```
Optional("42")
42
```

**Why:**
- `print(raw)` prints the box, not the value, because `raw` is still `String?`.
- `raw ?? ""` unwraps to `"42"`, `Int("42")` is `Optional(42)`, `?? -1` unwraps to `42`.

---

### Q2 (0.75 pt)

```
0 9
9 9
```

**Why:**
- `Box` is a `struct` (value type). `var b2 = b1` copies, so mutating `b2.n` does not touch `b1`.
- `Crate` is a `class` (reference type). `let c2 = c1` copies the *pointer*; `c1` and `c2` are the same object, so changing `c2.n` is visible through `c1`. `let` only freezes the pointer, not the object's `var` properties.

---

### Q3 (0.75 pt)

```
10
50
```

**Why:** Closures capture variables by reference, not by value-at-creation. At the first call, `multiplier == 2`, so `5 * 2 = 10`. After `multiplier = 10`, the same closure now reads the new value: `5 * 10 = 50`.

---

### Q4 (1 pt)

```
["ENG", "MATH"]
n/a
count=2
```

**Why:**
- `filter { $0.value >= 70 }` keeps `("math", 80)` and `("eng", 92)`. `"thai"` is dropped because `65 < 70`.
- `map { $0.key.uppercased() }` produces `["MATH", "ENG"]` (in some order, since dictionaries have no order).
- `sorted()` makes it deterministic: `["ENG", "MATH"]` (alphabetical).
- `scores["art"]` is `nil` (key missing), so `?? "n/a"` prints `n/a`.
- `passed.count` is `2`, interpolated into `"count=2"`.

---

## Section A subtotal: 3 points (0.5 + 0.75 + 0.75 + 1.0)

---

## Section B — Code Improvement (4 points)

### Q1 (1 pt)

**What's wrong:** `Int(input)!` force-unwraps the result of `Int(_:)`, which returns `Int?`. For `"twenty"`, the conversion is `nil`, so `!` traps and crashes the program. User-supplied strings are exactly the place you cannot trust the value to be a valid integer.

**Fix (option A — graceful failure with `if let`):**

```swift
func greet(from input: String) {
    if let age = Int(input) {
        print("Hello, you are \(age) years old.")
    } else {
        print("Sorry, '\(input)' is not a valid age.")
    }
}
```

**Fix (option B — sensible default with `??`):**

```swift
func greet(from input: String) {
    let age = Int(input) ?? 0
    print("Hello, you are \(age) years old.")
}
```

Either is acceptable. Key idea: handle the `nil` case explicitly instead of crashing.

---

### Q2 (1.5 pt)

**What's wrong:** `CartItem` is a `struct`, which is a value type. When you pass `apple` into `addOne`, Swift copies it. The line `var item = item` shadows the parameter with a local mutable copy and then mutates *that* copy — the caller's `apple` is untouched. So after two calls, `apple.quantity` is still `1`.

**Fix (option 1 — `inout`, recommended when caller-side mutation is the goal):**

```swift
func addOne(_ item: inout CartItem) {
    item.quantity += 1
}

var apple = CartItem(quantity: 1)
addOne(&apple)             // & at call site marks the in-out argument
addOne(&apple)
print(apple.quantity)      // 3
```

**Fix (option 2 — return a new value, more idiomatic Swift):**

```swift
func addingOne(_ item: CartItem) -> CartItem {
    var item = item
    item.quantity += 1
    return item
}

apple = addingOne(apple)
apple = addingOne(apple)   // caller reassigns
```

Both are correct. `inout` matches the original "mutate in place" intent; returning a new value is more functional and is the more common Swift style. Changing `CartItem` to a `class` is *also* technically a fix, but the question asked us to keep it a `struct`.

---

### Q3 (1.5 pt)

**The four issues:**

1. **`@State var username` (no `private`).** `@State` is owned by this view; the convention is always `private` so other views can't reach in and write it directly.
2. **`TextField("Name", text: username)`** — `TextField` requires `Binding<String>`, but `username` here is a plain `String`. You must pass the projected value: `text: $username`.
3. **`NameTag(username: username)`** — passing a *value* to a child that should re-render when the parent's `username` changes. If `NameTag` needs to read live updates, it should take a `Binding`, and the parent should pass `$username`. (If `NameTag` is meant to be a read-only snapshot, then a plain `var username: String` in the child is fine — but the child currently uses `@State`, see #4.)
4. **`@State var username` in `NameTag`.** A child should not declare `@State` to *receive* a value from its parent — `@State` creates its own private storage that is independent of the parent's. Use `@Binding` (two-way) or a plain `var` (read-only) instead.

**Corrected (assuming `NameTag` is read-only, since it only displays):**

```swift
struct ProfileView: View {
    @State private var username = ""                  // fix #1: private
    var isValid: Bool { !username.isEmpty }

    var body: some View {
        VStack {
            TextField("Name", text: $username)        // fix #2: $username
            NameTag(username: username)               // fix #3: plain value is fine here
            Button("Save") { }.disabled(!isValid)
        }
    }
}

struct NameTag: View {
    var username: String                              // fix #4: plain var, not @State
    var body: some View { Text("Hi, \(username)") }
}
```

(If you decided `NameTag` needs write-back, an equally correct answer uses `@Binding var username: String` in the child and `NameTag(username: $username)` at the call site. State the assumption either way.)

---

## Section B subtotal: 4 points (1.0 + 1.5 + 1.5)

---

## Section C — View Decomposition (3 points)

Grading note: small modifier-order or color-name differences are fine. The structure (which `Stack` contains what, where the `Spacer` goes) is what carries the points.

### Q1 (1.5 pt)

```swift
HStack(spacing: 12) {
    Image(systemName: "bell.fill")
        .font(.title3)                  // SF Symbols size with .font, not .frame
        .foregroundStyle(.orange)
        .frame(width: 28)               // fixed icon column so multiple rows align
    Text("Notifications")
        .font(.body)
    Spacer()                            // pushes the chevron to the trailing edge
    Image(systemName: "chevron.right")
        .foregroundStyle(.secondary)
}
.padding(.horizontal, 16)
.padding(.vertical, 12)
```

**Why this layout:** the row is one horizontal line, so the outer container is `HStack`. The `Spacer()` between the label and the chevron is what actually pins the chevron to the right — without it, the contents would clump in the centre. Sizing an SF Symbol uses `.font(.system(size:))` or `.font(.title3)`, *not* `.frame`, because the symbol is a glyph and only scales with font size unless you add `.resizable()`.

---

### Q2 (1.5 pt)

```swift
HStack {
    VStack(alignment: .leading) {
        Text("4 Credit")
            .font(.caption2)
            .foregroundColor(.gray)
        Text("Math")
            .font(.headline)
    }
    Spacer()                            // pushes "3.0" to the trailing edge
    Text("3.0")
        .font(.title3)
        .bold()
        .foregroundColor(.blue)
}
.padding(.vertical, 4)
```

**Why this layout:** the row has two columns side-by-side, so it's an `HStack`. The left column is two stacked Texts, so it's a nested `VStack(alignment: .leading)` — the `.leading` is what makes the `4 Credit` line up with `Math` along the left edge. A single `Spacer()` consumes the slack between the two columns and shoves `"3.0"` to the trailing edge. Without the `Spacer()`, the HStack would size to its content and centre everything together.

---

## Section C subtotal: 3 points (1.5 + 1.5)

---

## Grand total: 10 points

| Section | Points | Topics covered                                                       |
| ------- | ------ | -------------------------------------------------------------------- |
| A       | 3.0    | Optionals, struct vs class, closure capture, dictionary + functional |
| B       | 4.0    | Force unwrap, struct value semantics + `inout`, `@State` / `@Binding`|
| C       | 3.0    | HStack + Spacer + nested VStack, SF Symbol sizing, frame for column  |

### How to self-grade

- Got the output **exactly** right (every line, including `Optional(...)` and quotes)? Full marks.
- Section B: 0.5 pt for spotting the bug, the rest for a working fix. If you only said "use `if let`" without writing the code, half credit.
- Section C: structure first (right `Stack` nesting and `Spacer` placement), modifiers second. Wrong outer container = lose most of the question; right structure with one missing modifier = lose ~0.25.

If you got under 7/10, re-read the cheat-sheet for the section you lost the most on, then redo this paper from a blank page tomorrow morning.
