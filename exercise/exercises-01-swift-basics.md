# Topic 1 — Swift Basics & Data Structures: Practice

A drill pack aligned to the closed-book written exam. Predict outputs in your head before peeking. For Code Improvement, name the failure mode (force unwrap, missing `mutating`, wrong type kind, etc.) — graders reward the *reason*, not just the patch.

---

## Section A — Output Prediction

For each snippet, write down EXACTLY what is printed, including `Optional(...)` wrappers, quotes, and brackets. Newlines between `print` calls are implicit.

### Q1

```swift
let s: String? = "hi"
print(s)
print(s ?? "none")
```

<details><summary>Answer</summary>

```
Optional("hi")
hi
```

Why: printing an Optional directly shows the wrapper; `??` unwraps to the underlying value.

> **React/TS:** `string | undefined` prints as `"hi"` or `undefined` — JS has no `Optional()` wrapper. `??` works the same.
</details>

### Q2

```swift
let dict = ["a": 1, "b": 2]
print(dict["a"])
print(dict["z"])
print(dict["a"] ?? -1)
```

<details><summary>Answer</summary>

```
Optional(1)
nil
1
```

Why: dictionary subscript returns `V?`, so a hit prints `Optional(1)`, a miss prints `nil`, and `??` unwraps the hit.

> **React/TS:** `obj["z"]` is `undefined` (not `null`); `Map.get()` returns `T | undefined`. `??` falls back the same way.
</details>

### Q3

```swift
struct Box { var n = 0 }
var a = Box()
var b = a
b.n = 9
print(a.n, b.n)
```

<details><summary>Answer</summary>

```
0 9
```

Why: `struct` is a value type, so assignment makes an independent copy.

> **React/JS:** no built-in value semantics — `const b = a` aliases. To get a copy: `const b = {...a}`. This is why React state updaters use spread/Immer.
</details>

### Q4

```swift
class Box { var n = 0 }
let a = Box()
let b = a
b.n = 9
print(a.n, b.n)
```

<details><summary>Answer</summary>

```
9 9
```

Why: `class` is a reference type — `a` and `b` point to the same instance, and `let` only freezes the reference, not the properties.

> **React/JS:** this is the default JS behavior — `const b = a` shares the same object; mutating `b.n` mutates `a.n`. Swift's class matches JS object semantics; Swift's struct does not.
</details>

### Q5

```swift
var x = 1
let f = { print(x) }
x = 99
f()
```

<details><summary>Answer</summary>

```
99
```

Why: closures capture variables by reference, so `f` reads `x`'s current value at call time, not at creation time.

> **React/JS:** same — `let x = 1; const f = () => console.log(x); x = 99; f();` prints `99`. Stale-closure bugs in `useEffect`/`useCallback` come from this exact mechanic.
</details>

### Q6

```swift
let nums = [1, 2, 3, 4, 5]
let r = nums.filter { $0 % 2 == 1 }.map { $0 * $0 }.reduce(0, +)
print(r)
```

<details><summary>Answer</summary>

```
35
```

Why: odds `[1,3,5]` -> squares `[1,9,25]` -> sum `35`.

> **React/JS:** identical: `nums.filter(n => n%2 === 1).map(n => n*n).reduce((a,b) => a+b, 0)`. `$0` is Swift shorthand for the first argument.
</details>

### Q8

```swift
enum Payment { case cash(Int); case card(String, Int) }
let p = Payment.card("VISA", 250)
switch p {
case .cash(let v): print("cash \(v)")
case .card(let brand, let v): print("\(brand) \(v)")
}
```

<details><summary>Answer</summary>

```
VISA 250
```

Why: pattern matches the `.card` case and binds both associated values.

> **React/TS:** equivalent to a discriminated union — `type Payment = {kind:'cash', v:number} | {kind:'card', brand:string, v:number}` with `switch (p.kind)`. Swift's enum + pattern matching is more ergonomic than tagged unions.
</details>

### Q9

```swift
let a: Int? = nil
let b: Int? = nil
let c: Int? = 7
print(a ?? b ?? c ?? 0)
```

<details><summary>Answer</summary>

```
7
```

Why: `??` is right-associative and short-circuits — first non-nil wins, so the chain falls through to `c`.

> **React/JS:** identical — JS `??` chains the same way: `a ?? b ?? c ?? 0` returns `7`.
</details>

### Q10

```swift
let raw = "12a"
if let n = Int(raw) {
    print("ok \(n)")
} else {
    print("bad")
}
```

<details><summary>Answer</summary>

```
bad
```

Why: `Int("12a")` returns `nil`, so the `else` branch runs — no crash because there is no force-unwrap.

> **React/JS:** `parseInt("12a")` actually returns `12` (parses prefix); `Number("12a")` returns `NaN`. The `if let` is the safe-unwrap pattern; closest JS analog is `const n = Number(raw); if (!Number.isNaN(n)) { ... } else { ... }`.
</details>

### Q12

```swift
let words = ["apple", "ant", "banana", "berry", "cherry"]
let out = words.filter { $0.hasPrefix("a") }.map { $0.uppercased() }
print(out)
```

<details><summary>Answer</summary>

```
["APPLE", "ANT"]
```

Why: `filter` keeps the two `a*` words in original order, `map` uppercases each; arrays print with brackets and quoted strings.

> **React/JS:** identical: `words.filter(w => w.startsWith("a")).map(w => w.toUpperCase())`.
</details>

### Q13

```swift
func parse(_ s: String) -> Int {
    guard let n = Int(s) else { return -1 }
    return n * 2
}
print(parse("5"))
print(parse("oops"))
```

<details><summary>Answer</summary>

```
10
-1
```

Why: `guard let` exits early when conversion fails; on success, `n` stays in scope below the guard.

> **React/JS:** the early-return pattern: `const n = Number(s); if (Number.isNaN(n)) return -1; return n * 2;`. `guard let` keeps the unwrapped name in scope after the guard, which JS achieves naturally with const.
</details>

### Q14

```swift
let user: [String: Any] = ["name": "Tae", "age": 21]
if let name = user["name"] as? String, let age = user["age"] as? Int {
    print("\(name)-\(age)")
}
```

<details><summary>Answer</summary>

```
Tae-21
```

Why: both conditional casts succeed, both bindings produce values, and string interpolation joins them with the literal dash.

> **React/TS:** like narrowing `Record<string, unknown>` with type guards — `if (typeof user.name === "string" && typeof user.age === "number")`. `as?` is a runtime-checked cast; TS `as` is compile-time only.
</details>

### Q15

```swift
class Counter { var n = 0 }
let c = Counter()
let bump = { c.n += 1 }
bump(); bump(); bump()
print(c.n)
```

<details><summary>Answer</summary>

```
3
```

Why: closures capture reference types by reference, so each call mutates the same `Counter` instance.

> **React/JS:** same — closures over class instances mutate the shared object. This is also why `useRef` works: the `.current` value is shared across renders.
</details>

### Q16

```swift
let raw = ["1", "two", "3", "four", "5"]
let parsed = raw.compactMap { Int($0) }
let mapped = raw.map { Int($0) }
print(parsed)
print(mapped)
```

<details><summary>Answer</summary>

```
[1, 3, 5]
[Optional(1), nil, Optional(3), nil, Optional(5)]
```

Why: `compactMap` drops `nil` results AND unwraps the surviving optionals, giving plain `[Int]`. Plain `map` keeps the `Int?` shape, so each element prints with its `Optional(...)` wrapper or `nil`.

> **React/JS:** `raw.map(Number).filter(n => !Number.isNaN(n))` is the closest. JS has no built-in compactMap; Lodash has `_.compact`.
</details>

### Q17

```swift
let words = ["apple", "ant", "bear", "banana", "cat", "carrot"]

let grouped = Dictionary(grouping: words, by: { $0.first! })
let counts = grouped.mapValues { $0.count }

for (k, v) in counts.sorted(by: { $0.key < $1.key }) {
    print("\(k):\(v)")
}
```

<details><summary>Answer</summary>

```
a:2
b:2
c:2
```

Why: `Dictionary(grouping:by:)` partitions the array by the closure's key — here, the first character. `mapValues { $0.count }` collapses each bucket into its size. The sort orders the keys before printing.

> **React/JS:** equivalent to `Object.groupBy(words, w => w[0])` (ES2024) followed by mapping to lengths. Pre-2024 JS used `reduce` with an accumulator object.
</details>

### Q18

```swift
func makeCounter() -> () -> Int {
    var n = 0
    return {
        n += 1
        return n
    }
}

let c = makeCounter()
let d = makeCounter()
print(c(), c(), c())
print(d(), c())
```

<details><summary>Answer</summary>

```
1 2 3
1 4
```

Why: each call to `makeCounter()` produces a fresh closure that owns its own captured `var n`. `c` and `d` therefore have independent state — `d` starts again at `1` while `c` keeps incrementing past where it left off.

> **React/JS:** classic JS closure factory: `function makeCounter() { let n = 0; return () => ++n; }`. Identical mechanic.
</details>

### Q19

```swift
let scores: [String: Int] = ["A": 80, "B": 45, "C": 70, "D": 30, "E": 90]

let top = scores
    .filter { $0.value >= 50 }
    .sorted { $0.value > $1.value }
    .prefix(3)
    .map { "\($0.key)=\($0.value)" }
    .joined(separator: ", ")

print(top)
print("Z=\(scores["Z"] ?? -1)")
```

<details><summary>Answer</summary>

```
E=90, A=80, C=70
Z=-1
```

Why: filter keeps `A:80`, `C:70`, `E:90`. Sort descending by value gives `E:90, A:80, C:70`. `prefix(3)` keeps all three. `map` formats each entry, `joined` interleaves `, `. The missing key `"Z"` returns `nil`, so `??` falls back to `-1`. This is the canonical mock-anchor pattern (Mock 1 Q4, Mock 5 Q4).
</details>

---

## Section B — Code Improvement

For each item, name the smell and give a safer rewrite. The reasons matter as much as the code.

### B1 — Force unwrap on Int conversion

```swift
// Bad code
let raw = readUserInput()        // returns String
let port = Int(raw)!
print("port=\(port)")
```

<details><summary>Improved code & reasons</summary>

```swift
guard let port = Int(raw) else {
    print("invalid port")
    return
}
print("port=\(port)")
// or:  let port = Int(raw) ?? 8080
```

- `Int(_:)` returns `Int?`; `!` crashes the app whenever input is not a clean integer.
- User input is by definition untrusted — never crash on it.
- `guard let` handles the failure path cleanly; `??` supplies a sane default when one exists.

> **React/TS:** force-unwrap (`!`) is the equivalent of TS non-null assertion `value!` — silent runtime crash if wrong. Prefer `Number(raw)` + `Number.isNaN` check, or `??` with a default.
</details>

### B2 — Force unwrap on dictionary access

```swift
// Bad code
let prices = ["apple": 30, "banana": 20]
let total = prices["apple"]! + prices["mango"]!
print(total)
```

<details><summary>Improved code & reasons</summary>

```swift
let apple = prices["apple"] ?? 0
let mango = prices["mango"] ?? 0
let total = apple + mango
print(total)
```

- Dictionary subscript returns `V?` — missing keys yield `nil`, and `!` on `nil` crashes.
- `"mango"` is not in `prices`, so the original line is a guaranteed runtime crash.
- `??` provides an explicit default and documents the expected fallback.

> **React/JS:** in JS this would silently produce `NaN` (`undefined + undefined`). Same fix: `(prices["apple"] ?? 0) + (prices["mango"] ?? 0)`.
</details>

### B3 — `var` that is never mutated

```swift
// Bad code
func areaOfCircle(radius r: Double) -> Double {
    var pi = 3.14159
    var area = pi * r * r
    return area
}
```

<details><summary>Improved code & reasons</summary>

```swift
func areaOfCircle(radius r: Double) -> Double {
    let pi = 3.14159
    let area = pi * r * r
    return area
}
```

- Neither `pi` nor `area` is reassigned, so both should be `let`.
- `let` signals immutability to the reader and lets the compiler optimize.
- It also unlocks safer use in concurrent contexts where mutability would warn.

> **React/JS:** identical to `let` (mutable) → `const` (immutable). Same `prefer-const` ESLint rule.
</details>

### B4 — Missing `mutating` on a struct method

```swift
// Bad code
struct Counter {
    var value = 0
    func increment() {
        value += 1   // compile error
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct Counter {
    var value = 0
    mutating func increment() {
        value += 1
    }
}
```

- Struct methods cannot mutate stored properties unless marked `mutating`.
- The `mutating` keyword documents that calling the method changes `self`.
- Consumers must hold the struct in a `var`, not a `let`, to call it — that intent is now explicit.
</details>

### B5 — Reference type used where a value type prevents bugs

```swift
// Bad code
class Point {
    var x = 0
    var y = 0
}
let origin = Point()
let p = origin       // shares the same instance!
p.x = 10
print(origin.x)      // 10  — surprise mutation
```

<details><summary>Improved code & reasons</summary>

```swift
struct Point {
    var x = 0
    var y = 0
}
var origin = Point()
var p = origin
p.x = 10
print(origin.x)     // 0  — independent copy
```

- A `Point` is a small piece of data with no identity; value semantics fit better.
- `class` causes aliasing bugs where assignment unexpectedly shares state.
- `struct` copies on assignment, giving safer, easier-to-reason-about code (and SwiftUI prefers structs).

> **React/JS:** JS only has reference semantics — every "copy" is really an alias unless you spread (`{...origin}`). React's immutability discipline (`setState({...prev, x: 10})`) is the workaround Swift gets for free with structs.
</details>

### B6 — Non-exhaustive switch

```swift
// Bad code
enum Direction { case up, down, left, right }
func describe(_ d: Direction) -> String {
    switch d {
    case .up: return "up"
    case .down: return "down"
    }
    // compile error: switch must be exhaustive
}
```

<details><summary>Improved code & reasons</summary>

```swift
func describe(_ d: Direction) -> String {
    switch d {
    case .up: return "up"
    case .down: return "down"
    case .left: return "left"
    case .right: return "right"
    }
}
```

- Swift requires `switch` over enums to cover every case (or use `default`).
- Listing every case makes the compiler your safety net: adding a new case later forces you to update every switch.
- Avoid `default:` here — it would silently swallow new cases without review.

> **React/TS:** TS gives you exhaustive switching via the `never` trick: `default: const _: never = d;` errors when a new union member is added. Swift enforces it natively.
</details>

### B7 — Optional chaining vs force unwrap

```swift
// Bad code
struct User { var name: String }
let user: User? = nil
let upper = user!.name.uppercased()
print(upper)
```

<details><summary>Improved code & reasons</summary>

```swift
let upper = user?.name.uppercased() ?? "UNKNOWN"
print(upper)
```

- `user!` crashes the moment `user` is `nil`, which is exactly the case here.
- Optional chaining `?.` short-circuits the whole expression to `nil` if any link is missing.
- Combine with `??` to provide a fallback so the result is a plain `String`, not `String?`.

> **React/JS:** identical syntax — `user?.name?.toUpperCase() ?? "UNKNOWN"`. JS borrowed both `?.` and `??` from Swift/C#.
</details>

### B8 — Repeated `if let x = x` should be a single `guard let` chain

```swift
// Bad code
func sendMessage(name: String?, address: String?, body: String?) {
    if let name = name {
        if let address = address {
            if let body = body {
                print("To \(name) <\(address)>: \(body)")
            }
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
func sendMessage(name: String?, address: String?, body: String?) {
    guard let name, let address, let body else { return }
    print("To \(name) <\(address)>: \(body)")
}
```

- The "pyramid of doom" hides the happy path under nesting.
- A single `guard let` exits early on any `nil` and keeps the success branch flat.
- Shorthand `let name` (Swift 5.7+) avoids repeating `name = name`.

> **React/JS:** flatten the same way with early returns: `if (!name || !address || !body) return;`. Swift's `guard let` shorthand is what `if (!x) return` looks like with a non-null narrowing baked in.
</details>

### B9 — Class used where a struct fits SwiftUI better

```swift
// Bad code
class TodoItem {
    var title: String
    var done: Bool
    init(title: String, done: Bool = false) {
        self.title = title; self.done = done
    }
}

@State private var items: [TodoItem] = []
```

<details><summary>Improved code & reasons</summary>

```swift
struct TodoItem: Identifiable {
    let id = UUID()
    var title: String
    var done: Bool = false
}

@State private var items: [TodoItem] = []
```

- SwiftUI compares state by value; `@State` on an array of classes will not detect property-level changes because the reference does not change.
- Structs give SwiftUI the predictable diffing it relies on for view updates.
- Adding `Identifiable` with `UUID` plays well with `ForEach` and List rendering.

> **React:** echoes React's "always replace, never mutate state" rule. Mutating an item in place + `setItems(items)` won't re-render because reference is unchanged — same trap.
</details>

### B10 — `inout` parameter and `var p = p` shadowing

```swift
// Bad code (caller expects mutation, gets none)
struct Point { var x = 0, y = 0 }

func shiftRight(_ p: Point, by dx: Int) {
    p.x += dx          // does not compile
}

var origin = Point()
shiftRight(origin, by: 10)
print(origin.x)        // expecting 10, gets 0
```

<details><summary>Improved code & reasons</summary>

Two issues:

1. **Cannot mutate a `let` parameter on a value type.** Function parameters are immutable by default, and `Point` is a struct.
2. **Even if we shadow with `var p = p`, the caller does not see the change** — the function would mutate a local copy.

There are two correct fixes depending on intent:

**Variant 1 — `inout` (mutate caller's struct in place):**
```swift
func shiftRight(_ p: inout Point, by dx: Int) {
    p.x += dx
}

var origin = Point()
shiftRight(&origin, by: 10)
print(origin.x)        // 10
```

The `&` at the call site marks "pass me by reference."

**Variant 2 — return a new struct (functional style, often preferred):**
```swift
func shifted(_ p: Point, by dx: Int) -> Point {
    var copy = p          // local-mutation shadow
    copy.x += dx
    return copy
}

var origin = Point()
origin = shifted(origin, by: 10)
print(origin.x)        // 10
```

The `var copy = p` shadow is what allows the local mutation; you return the modified copy and the caller reassigns. This is the same pattern Swift's standard library uses (`array.sorted()` returns a new array).

Why both forms exist: `inout` is concise but couples the function to in-place mutation; returning a new value composes better and is friendlier to concurrency. Mock-style trap: students often expect a struct passed by value to mutate the caller "because it looked like it did" inside the function.
</details>

---

## Section C — Practical Mini-Tasks

Five small refactors. Read the starter, attempt before opening the reference solution.

### C1 — Add `mutating func incrementGrade()` to a struct

```swift
// Starter
struct Student {
    let name: String
    var grade: Int   // 0...100
}

// Your task:
// Add a method `incrementGrade(by:)` that increases `grade` by the given amount,
// clamped to a maximum of 100. Then write the two lines that mutate `alice` and print her grade.
```

<details><summary>Reference solution</summary>

```swift
struct Student {
    let name: String
    var grade: Int

    mutating func incrementGrade(by delta: Int) {
        grade = min(100, grade + delta)
    }
}

var alice = Student(name: "Alice", grade: 88)
alice.incrementGrade(by: 20)
print(alice.grade)   // 100
```

Notes:
- `mutating` is required because the method changes a stored property.
- `alice` must be `var`, otherwise the mutating call fails to compile.
- Clamping with `min` prevents the grade from exceeding the valid range.
</details>

### C2 — Refactor a nested if-let pyramid into a single guard-let chain

```swift
// Starter
func loginCard(username: String?, token: String?, expiry: Int?) -> String {
    if let u = username {
        if let t = token {
            if let e = expiry, e > 0 {
                return "\(u):\(t) exp=\(e)"
            }
        }
    }
    return "invalid"
}
```

<details><summary>Reference solution</summary>

```swift
func loginCard(username: String?, token: String?, expiry: Int?) -> String {
    guard let username, let token, let expiry, expiry > 0 else {
        return "invalid"
    }
    return "\(username):\(token) exp=\(expiry)"
}
```

Notes:
- One `guard` covers all unwraps and the `expiry > 0` check via a comma-separated condition list.
- The happy path is no longer indented, so the function reads top-to-bottom.
- Shorthand bindings (`let username` instead of `let username = username`) cut noise.

> **React/TS:** equivalent JS pattern — `if (!username || !token || !expiry || expiry <= 0) return "invalid";` then proceed with the unwrapped values.
</details>

### C4 — Total revenue from `[Order]` enum array with associated values

```swift
// Starter
enum Order {
    case product(name: String, price: Double, qty: Int)
    case shipping(fee: Double)
    case discount(amount: Double)   // subtract from total
}

let orders: [Order] = [
    .product(name: "Pen", price: 25, qty: 4),
    .shipping(fee: 30),
    .product(name: "Book", price: 120, qty: 2),
    .discount(amount: 50)
]

// Your task:
// Compute the total revenue (products + shipping - discount) using one reduce or for-in.
```

<details><summary>Reference solution</summary>

```swift
let total = orders.reduce(0.0) { running, order in
    switch order {
    case .product(_, let price, let qty):
        return running + price * Double(qty)
    case .shipping(let fee):
        return running + fee
    case .discount(let amount):
        return running - amount
    }
}
print(total)   // 25*4 + 30 + 120*2 - 50 = 320.0
```

Notes:
- `reduce(0.0, ...)` seeds a `Double` accumulator so the inferred result type is `Double`.
- The `switch` is exhaustive because we handle every enum case — adding a new case would force us to update this function.
- `Double(qty)` is needed because `Int * Double` is not allowed implicitly in Swift.

> **React/TS:** with discriminated unions: `orders.reduce((acc, o) => { switch (o.kind) { case 'product': return acc + o.price * o.qty; ... } }, 0)`. Same shape, more verbose without enum associated values.
</details>

