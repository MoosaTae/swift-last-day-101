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
</details>

### Q7

```swift
func greet(_ name: String, from sender: String = "Tae") -> String {
    "Hi \(name) from \(sender)"
}
print(greet("Ann"))
print(greet("Ben", from: "Cat"))
```

<details><summary>Answer</summary>

```
Hi Ann from Tae
Hi Ben from Cat
```

Why: omitted argument falls back to the default value; supplied argument overrides it.
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
</details>

### Q11

```swift
let score = 80
let grade: String
switch score {
case 0..<50: grade = "F"
case 50..<80: grade = "C"
case 80...100: grade = "A"
default: grade = "?"
}
print(grade)
```

<details><summary>Answer</summary>

```
A
```

Why: `50..<80` excludes 80, but `80...100` includes it, so the third case matches.
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
</details>

### B10 — Implicit type inference vs explicit annotation clarity

```swift
// Bad code
let total = []                  // inferred as [Any]
let price = 0                   // inferred as Int, but used as money
let rate = 1                    // intended as a percentage Double
let net = Double(price) * rate  // type-juggling fights the reader
```

<details><summary>Improved code & reasons</summary>

```swift
let total: [Order] = []
let price: Double = 0
let rate: Double = 1.0   // 100%
let net = price * rate
```

- Empty literals (`[]`, `[:]`) need an explicit element type or you get unhelpful inferences like `[Any]`.
- Currency and rates should be `Double` (or a dedicated type) — leaving them as `Int` invites silent truncation.
- Explicit annotations document intent and prevent surprising conversions later in the function.
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

### C2 — Fix buggy `BankAccount` and explain why a class is appropriate

```swift
// Starter (buggy)
struct BankAccount {
    var balance: Double = 0
    func deposit(_ amount: Double) {   // missing mutating
        balance += amount
    }
}

let acc = BankAccount()
acc.deposit(100)
print(acc.balance)
```

<details><summary>Reference solution</summary>

```swift
final class BankAccount {
    var balance: Double = 0
    func deposit(_ amount: Double) {
        balance += amount
    }
}

let acc = BankAccount()
acc.deposit(100)
print(acc.balance)   // 100
```

Why a class fits here:
- A bank account has identity — two accounts with the same balance are not interchangeable.
- Operations like deposits and withdrawals are expected to mutate a shared instance held by multiple parts of the app (UI, services).
- Reference semantics avoid the trap of mutating a copy and losing the change.
- Bonus: as a struct alternative, you would need `mutating` and to hold the value in `var`, but multiple consumers would each see a private copy.
</details>

### C3 — Refactor a nested if-let pyramid into a single guard-let chain

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
</details>

### C5 — Complete `WordCounter` returning the most-used word via Dictionary

```swift
// Starter
struct WordCounter {
    private(set) var counts: [String: Int] = [:]

    mutating func add(_ sentence: String) {
        // TODO: split on spaces, lowercase each token, increment its count
    }

    func mostUsed() -> String? {
        // TODO: return the word with the highest count, or nil if empty.
        // Tie-breaker is irrelevant.
        return nil
    }
}

// Expected:
// var wc = WordCounter()
// wc.add("Swift is great and Swift is fun")
// print(wc.mostUsed() ?? "none")   // "swift"
```

<details><summary>Reference solution</summary>

```swift
struct WordCounter {
    private(set) var counts: [String: Int] = [:]

    mutating func add(_ sentence: String) {
        let tokens = sentence
            .lowercased()
            .split(separator: " ")
            .map(String.init)
        for word in tokens {
            counts[word, default: 0] += 1
        }
    }

    func mostUsed() -> String? {
        counts.max(by: { $0.value < $1.value })?.key
    }
}

var wc = WordCounter()
wc.add("Swift is great and Swift is fun")
print(wc.mostUsed() ?? "none")   // swift
```

Notes:
- `counts[word, default: 0] += 1` is the idiomatic counter pattern — no force unwrap, no manual `if` check.
- `split(separator:)` returns `[Substring]`; mapping with `String.init` gives plain `String` keys.
- `max(by:)` on a dictionary returns an optional `(key, value)` tuple; `?.key` extracts the word safely.
- Returning `String?` lets callers use `??` to provide a fallback — far better than crashing on an empty input.
</details>
