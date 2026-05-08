# Mock 2 — Written Exam Answers
**Total: 10 points**

> Self-grading guide. Each answer shows the expected output / fix plus 2-4 lines of reasoning so you understand *why*.

---

## Section A — Output Prediction (3 points)

### Q1 (0.5 pt)

```
20
```

**Why:**
- `sorted(by: >)` produces `[9, 6, 5, 4, 3, 2, 1, 1]`.
- `.prefix(3)` keeps the first three: `[9, 6, 5]`.
- `.reduce(0, +)` sums them: `9 + 6 + 5 = 20`.
- `<` and `>` are operator functions that satisfy `(T, T) -> Bool`, so they can be passed directly to `sorted(by:)`.

---

### Q2 (0.75 pt)

```
Tae S, Aom K
Tae S
none
```

**Why:**
- `fullName` is a computed property — recomputed on each access. `map { $0.fullName }` produces `["Tae S", "Aom K"]`, joined with `", "`.
- `names.first` is `Optional(p)`. `?.fullName` chains to get `Optional("Tae S")`, then `?? "none"` unwraps to `"Tae S"`.
- `first(where:)` returns `nil` (no element matches `"Bob"`), so `?? "none"` falls back to `"none"`.

---

### Q3 (0.75 pt)

```
1
2
3
1
```

**Why:** This is a closure capturing a local variable. `count` lives in the enclosing function scope, but the returned closure keeps a reference to it after `makeCounter()` returns. Each call to `next()` mutates the same captured `count`. Calling `makeCounter()` again creates a fresh `count = 0` in a new scope, so `other()` starts again from `1`.

---

### Q4 (1 pt)

```
2
["banana", "blueberry"]
missing
["BANANA", "BLUEBERRY", "CHERRY"]
```

**Why:**
- `Dictionary(grouping:by:)` buckets values by the closure's return key. Group `"a"` -> `["apple", "ant"]` (count 2). Group `"b"` -> `["banana", "blueberry"]`.
- Looking up `grouped["b"]` is `Optional<[String]>`; `?.sorted()` returns `Optional(["banana", "blueberry"])` (already alphabetical here), and `?? []` unwraps it.
- `grouped["z"]` is `nil` (no group), so `?.first` is `nil`, and `?? "missing"` falls back.
- The chain `filter { $0.count > 5 }` keeps `"banana"` (6), `"blueberry"` (9), `"cherry"` (6). `map(uppercased)` then `sorted()` produces deterministic order.

---

## Section A subtotal: 3 points (0.5 + 0.75 + 0.75 + 1.0)

---

## Section B — Code Improvement (4 points)

### Q1 (1 pt)

**What's wrong:** `Counter` is a plain `class` (reference type), and `@State` only triggers re-renders when *the value of the wrapped property* changes. With a class, mutating `counter.value` does **not** change the reference SwiftUI is observing — the pointer to the `Counter` instance stays the same — so SwiftUI sees no change and never recomputes `body`. `@State` plus a plain class is a silent dead-end for reactivity.

**Fix (option A — make `Counter` a struct, the Swift default):**

```swift
struct Counter {
    var value: Int = 0
}

struct CounterView: View {
    @State private var counter = Counter()

    var body: some View {
        VStack {
            Text("Count: \(counter.value)")
            Button("Increment") { counter.value += 1 }
        }
    }
}
```

Mutating any property of a struct held in `@State` changes the whole value (structs have value semantics), so SwiftUI re-renders.

**Fix (option B — keep the class, mark it `@Observable`):**

```swift
import Observation

@Observable
final class Counter {
    var value: Int = 0
}

struct CounterView: View {
    @State private var counter = Counter()      // @State on @Observable class is fine in iOS 17+
    var body: some View {
        VStack {
            Text("Count: \(counter.value)")
            Button("Increment") { counter.value += 1 }
        }
    }
}
```

Either is acceptable. Key idea: SwiftUI cannot observe a plain class through `@State`. Use a struct, or make the class observable.

---

### Q2 (1.5 pt)

**What's wrong (two related issues):**

1. **`@State var isOn: Bool` in the child.** The child should not own this state — it should *receive write access* to the parent's state. `@State` here gives the child its own private copy of the bool, completely disconnected from the parent's `darkMode` / `notifications`. That is why the child's label flips (it mutates its own copy) but the parent never updates.
2. **`ToggleRow(isOn: darkMode)` in the parent.** Even if the child used `@Binding`, this call passes the current *value* of `darkMode`, not a binding to it. A binding requires the projected value `$darkMode`.

The two bugs reinforce each other: the child silently accepts a copy because its declaration is also wrong.

**Fix:**

```swift
struct ToggleRow: View {
    @Binding var isOn: Bool                         // proxy to parent's storage

    var body: some View {
        HStack {
            Text(isOn ? "ON" : "OFF")
            Spacer()
            Button("Flip") { isOn.toggle() }        // mutates parent's @State
        }
    }
}

struct SettingsView: View {
    @State private var darkMode = false
    @State private var notifications = false

    var body: some View {
        VStack {
            ToggleRow(isOn: $darkMode)              // pass binding, not value
            ToggleRow(isOn: $notifications)
            Text("Dark mode: \(darkMode ? "yes" : "no")")
        }
    }
}
```

Key idea: the parent owns the truth; children that mutate it use `@Binding` and the parent passes `$state`.

---

### Q3 (1.5 pt)

**What's wrong (at least two distinct problems):**

1. **Two force-unwraps of `Double(_:)`.** `Double("ten")` returns `nil`, so `Double(discountString)!` traps the program. User-supplied / API-supplied strings cannot be trusted to parse; force-unwrapping converts a recoverable error into a crash.
2. **Side computation inside `body` followed by `return VStack { ... }`.** Mixing imperative statements with the view builder is legal Swift but fragile and unidiomatic — and crucially, the crash from `!` happens *during view construction*, taking down the whole UI. Computed properties or pure-builder bodies are safer.
3. (Minor) `\(price)` interpolates a Double directly, producing things like `199.0` rather than a currency-friendly string. Using `String(format:)` or a number formatter is better, but not strictly required to score full marks.

**Fix:**

```swift
struct ProductView: View {
    let priceString: String
    let discountString: String

    private var parsed: (price: Double, discount: Double)? {
        guard
            let price = Double(priceString),
            let discount = Double(discountString)
        else { return nil }
        return (price, discount)
    }

    var body: some View {
        if let p = parsed {
            let final = p.price - (p.price * p.discount / 100)
            VStack {
                Text("Price: \(p.price, format: .number)")
                Text("Discount: \(p.discount, format: .number)%")
                Text("Final: \(final, format: .number)")
            }
        } else {
            Text("Invalid price or discount.")
                .foregroundStyle(.red)
        }
    }
}
```

Acceptable simpler variant using `??`:

```swift
var body: some View {
    let price = Double(priceString) ?? 0
    let discount = Double(discountString) ?? 0
    let final = price - (price * discount / 100)
    return VStack {
        Text("Price: \(price)")
        Text("Discount: \(discount)%")
        Text("Final: \(final)")
    }
}
```

Key idea: never force-unwrap an `Optional` returned by a parser. Use `if let`, `guard let`, or `??`, and surface the failure in the UI rather than crashing.

---

## Section B subtotal: 4 points (1.0 + 1.5 + 1.5)

---

## Section C — View Decomposition (3 points)

Grading note: small modifier-order or color-name differences are fine. The structure (which `Stack` contains what, where the `Spacer` goes, image-on-left layout) is what carries the points.

### Q1 (1.5 pt)

```swift
HStack(spacing: 12) {
    Image("carbonara")
        .resizable()                              // MUST come before frame for asset images
        .scaledToFill()
        .frame(width: 64, height: 64)
        .clipShape(Circle())                      // or RoundedRectangle(cornerRadius: 12)
    VStack(alignment: .leading, spacing: 2) {
        Text("Spaghetti Carbonara")
            .font(.headline)
        Text("Italian")
            .font(.caption)
            .foregroundStyle(.secondary)
    }
    Spacer()                                      // push "25 min" to trailing edge
    Text("25 min")
        .font(.body)
        .foregroundStyle(.secondary)
}
.padding(.vertical, 4)
```

**Why this layout:** the row is one horizontal line with three logical groups (image | text column | trailing label), so the outer container is `HStack`. The two-line text block ("title" + "subtitle") is a nested `VStack(alignment: .leading)` so both lines line up along the left edge. A single `Spacer()` between the text column and "25 min" is what pins the time to the trailing edge — without it, all three groups would clump together. `.resizable()` is required *before* `.frame` for an asset image; without it the bitmap keeps its intrinsic size.

---

### Q2 (1.5 pt)

```swift
VStack(spacing: 8) {
    Image("me")
        .resizable()
        .scaledToFill()
        .frame(width: 80, height: 80)
        .clipShape(Circle())

    Text("Tae S.")
        .font(.title2)
        .bold()
    Text("iOS Developer")
        .font(.subheadline)
        .foregroundStyle(.secondary)

    HStack {
        VStack {
            Text("42").font(.headline).bold()
            Text("Posts").font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)               // each column claims an equal share
        VStack {
            Text("128").font(.headline).bold()
            Text("Followers").font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        VStack {
            Text("7").font(.headline).bold()
            Text("Following").font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
    .padding(.top, 8)
}
.padding()
```

**Why this layout:** the whole card is a vertical stack of four logical rows (avatar, name+subtitle, stat row), so the outer container is `VStack` with default `.center` alignment — that handles the horizontal centering of every child automatically. The stat row is an `HStack` of three nested `VStack`s. The `.frame(maxWidth: .infinity)` on each inner column is the trick that makes them split the available width evenly; without it, the columns would shrink to text width and clump in the center. An equally valid alternative is `Spacer()` between each pair of columns, but `maxWidth: .infinity` is the cleaner three-equal-columns idiom.

---

## Section C subtotal: 3 points (1.5 + 1.5)

---

## Grand total: 10 points

| Section | Points | Topics covered                                                                |
| ------- | ------ | ----------------------------------------------------------------------------- |
| A       | 3.0    | Closures + functional pipelines, computed properties, capture, dictionaries   |
| B       | 4.0    | `@State` + class trap, `@Binding` vs value, force-unwrap on `Double(_:)`      |
| C       | 3.0    | Image-on-left card row, three-column even split with `.frame(maxWidth:)`      |

### How to self-grade

- Got the output **exactly** right (every line, including `Optional(...)` wrappers, list ordering, quotes)? Full marks.
- Section B: 0.5 pt for spotting the bug, the rest for a working fix. If you only said "use `@Binding`" without writing the corrected views, half credit.
- Section C: structure first (right `Stack` nesting, `Spacer` or `maxWidth` to distribute space, `.resizable()` before `.frame` on asset images), modifiers second. Wrong outer container = lose most of the question; right structure with one missing modifier = lose ~0.25.

If you got under 7/10, re-read the cheat-sheet for the section you lost the most on, then redo this paper from a blank page tomorrow morning.
