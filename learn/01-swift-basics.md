# 01 - Swift Language Basics and Data Structures

> Tutorial companion to the cheat sheet. Read this once for understanding, then drill the cheat sheet for speed.

---

## Mental Model: What Swift Actually Is

> **Priority:** SKIM — framing intro, helpful but not asked verbatim.

Swift is a **statically typed, type-inferred, compiled** language that gives you two parallel tools for almost every job:

| Concern              | Safe / default tool         | Sharp tool (use rarely)     |
| -------------------- | --------------------------- | --------------------------- |
| Mutability           | `let` (constant)            | `var` (variable)            |
| Missing values       | `Optional<T>` + binding     | Force unwrap `!`            |
| Identity / sharing   | `struct` (value, copied)    | `class` (reference, shared) |
| Type at runtime      | `as?` (optional cast)       | `as!` (forced cast)         |
| Collection access    | `dict[k] ?? default`        | `dict[k]!`, `arr[i]` OOB    |

The exam mostly tests whether you know **which lane to be in and why**. Pick the safe lane unless the sharp tool is justified.

Three big mental models for this whole topic:

1. **Optional is a box.** `Int?` is not an `Int`. It's a box that either contains an `Int` or contains nothing. You must open the box before using the value.
2. **Structs are photocopies, classes are shared whiteboards.** Assigning a struct copies. Assigning a class copies the *pointer* — both names point at the same object.
3. **Closures capture by reference.** A closure is a function plus a snapshot of which variables it can see. It sees the *latest* value at call time, not the value at creation time.

If you internalize these three, you can answer 80% of output-prediction questions on sight.

---

## 1. Variables and Type Inference

> **Priority:** DRILL — `let` vs `var` and inference appear in output prediction.

### Why this exists

Swift's type system is strict but ergonomic: you almost never have to write the type because the compiler infers it from the literal. `let` vs `var` forces you to declare *intent* — "this never changes" vs "this will mutate" — which catches bugs at compile time.

```swift
let name = "Tae"          // inferred String, immutable
var age: Int = 21         // explicit annotation, mutable
age += 1                  // OK because var
let pi = 3.14             // inferred Double (decimal literal -> Double)
let n  = 7                // inferred Int (integer literal -> Int)
```

### Inference rules to memorize

| Literal       | Inferred type |
| ------------- | ------------- |
| `42`          | `Int`         |
| `3.14`        | `Double`      |
| `"hi"`        | `String`      |
| `true`        | `Bool`        |
| `[1, 2, 3]`   | `[Int]`       |
| `["a": 1]`    | `[String:Int]`|
| `(1, "x")`    | `(Int, String)` tuple |

### Edge case: integer division

```swift
(3 + 4) / 2            // 3   <- Int / Int truncates toward zero
Double(7) / 2          // 3.5 <- promoting one operand promotes the result
let avg = Double(a + b) / Double(count)   // standard pattern
```

This is exam-bait. If both sides of `/` are `Int`, the result is `Int`.

---

## 2. Optionals — The Box Mental Model

> **Priority:** DRILL — `if let`, `guard let`, `??` are exam staples.

### Why optionals exist

In most languages, any reference can secretly be `null`, and you find out at runtime via a crash. Swift makes "might be missing" part of the **type**: `String` can never be nil, `String?` might be. The compiler refuses to let you use the inside of the box until you've explicitly opened it.

```
   String        String?
   +---+         +----------+
   |"hi"         | Some("hi")|     <- "the box has a value"
   +---+         +----------+
                 +----------+
                 |   None   |     <- "the box is empty" (nil)
                 +----------+
```

### Declaring and inspecting

```swift
var s: String? = "hi"
print(s)        // Optional("hi")   <- prints the BOX, not the value
print(s!)       // hi               <- forcibly opens the box; CRASH if nil
```

`print(s)` showing `Optional("hi")` is the #1 output-prediction trap. The compiler even warns you, but the code still runs.

### The Unwrap Toolkit

You have five ways to deal with an optional. Memorize them as a decision tree.

```
Need the value?
|
+-- Yes, and have a fallback.        ->  ??       (nil-coalescing)
|
+-- Yes, conditionally do something. ->  if let   (scoped to true branch)
|
+-- Yes, or bail out of function.    ->  guard let (continues in main flow)
|
+-- Just want to chain a method.     ->  ?.       (optional chaining)
|
+-- I'm 100% sure it's not nil.      ->  !        (avoid; usually a bug)
```

```swift
// if let — value usable inside the block
if let n = Int("42") {
    print(n)            // 42, n is a non-optional Int here
}

// guard let — value usable AFTER the guard, in the rest of the scope
func parse(_ s: String) -> Int {
    guard let n = Int(s) else { return 0 }   // bail early
    return n * 2                              // n is plain Int from here on
}

// ?? nil-coalescing — provide a default
let m = Int("oops") ?? 0     // 0 (parse failed -> nil -> fallback)

// ?. optional chaining — call only if non-nil; whole expression is optional
let len = s?.count ?? 0      // s might be nil OR s.count is the int

// ! force unwrap — runtime crash if nil
let x = Int("12a")!          // CRASH
```

### Multi-binding and conditions

`if let` and `guard let` accept multiple bindings *and* boolean conditions in one statement, separated by commas. All must succeed.

```swift
if let a = Int("3"), let b = Int("4"), a < b {
    print(a + b)         // only runs if BOTH parses succeed AND a<b
}
```

### Shorthand (Swift 5.7+)

When the new variable has the same name as the optional, you can omit the right side:

```swift
var name: String? = "Tae"
guard let name else { return }   // shorthand for `guard let name = name`
print(name.uppercased())          // name is now non-optional in this scope
```

---

## 3. Force Unwrap (`!`) — The Canonical Bad Code

> **Priority:** DRILL — code-improvement target, rewrite reflex required.

### Why this is the #1 exam target

Force unwrap converts `T?` to `T` by asserting "I promise this is not nil." If you're wrong, the program crashes. The exam will hand you code with `!` and ask you to fix it. This section is worth practicing until the rewrites are reflex.

### The four red-flag spots

```swift
Int("abc")!          // String -> Int? returns nil for non-numbers
URL(string: s)!      // returns nil for malformed URLs
dict[key]!           // dictionary subscript ALWAYS returns Optional
value as! SomeType   // forced downcast crashes on type mismatch
```

If you see `!` after any of those, it's broken. Rewrite it.

### Four safe rewrites

```swift
// (a) if let — branch on success/failure
if let n = Int(s) {
    print("got \(n)")
} else {
    print("invalid input")
}

// (b) guard let — required value, bail early if missing
guard let n = Int(s) else { return 0 }
// use n freely below

// (c) ?? — sensible default
let n = Int(s) ?? 0

// (d) optional chaining — skip the call entirely if nil
let upper = name?.uppercased()    // String? (nil if name was nil)
```

### Template answer for the exam

> "`Int(input)!` crashes if `input` is not a valid integer string. This is unsafe because `Int(_:)` returns `Int?`, which is `nil` for non-numeric input. Replace with optional binding (`if let n = Int(input) { ... } else { ... }`) or nil-coalescing (`let n = Int(input) ?? 0`) to handle the `nil` case explicitly."

Memorize that sentence structure. Substitute `URL(string:)`, `dict[k]`, or `as!` as needed.

---

## 4. String <-> Int Conversions

> **Priority:** DRILL — `Int(str)` returns optional, classic gotcha.

### Why this comes up constantly

User input arrives as `String`. Numeric IDs, ports, ages, prices all need parsing. The parse can fail, so the result is optional.

```swift
Int("7")           // Optional(7)
Int("3.14")        // nil   <- has a decimal, not a valid Int
Int("7") ?? -1     // 7
String(42)         // "42"  <- Int -> String never fails

"id-\(Int("7") ?? 0)"   // "id-7"   <- always provide a fallback in interpolation
```

Interpolating an optional directly leaks the `Optional(...)` wrapper into the output:

```swift
let x: Int? = 20
print("age=\(x)")           // age=Optional(20)     <- almost always wrong
print("age=\(x ?? 0)")      // age=20
```

---

## 5. Collections

> **Priority:** DRILL — dict subscript returns optional, common output trick.

### Mental model

| Type       | Ordered? | Unique? | Keyed?         | Subscript returns |
| ---------- | -------- | ------- | -------------- | ----------------- |
| Array      | Yes      | No      | by Int index   | `T` (crashes OOB) |
| Set        | No       | Yes     | no             | n/a               |
| Dictionary | No       | Keys yes| by `Key`       | `V?` (Optional!)  |
| Tuple      | Fixed    | n/a     | by position/label | `T` (compile-time) |

### Array

```swift
var xs = [1, 2, 3]
xs.append(4)           // [1,2,3,4]
xs.count               // 4
xs.isEmpty             // false
xs[0]                  // 1   (xs[99] -> CRASH: index out of range)

// functional pipeline — common in exam questions
[1,2,3,4]
    .filter { $0 % 2 == 0 }    // [2, 4]
    .map    { $0 * $0 }         // [4, 16]
    .reduce(0, +)               // 20    <- start at 0, add each
```

`reduce(0, +)` is shorthand for `reduce(0) { acc, x in acc + x }`. The operator `+` is itself a function `(Int,Int)->Int`.

### Dictionary — the optional surprise

```swift
let d = ["a": 1, "b": 2]
print(d["a"])          // Optional(1)   <- always optional!
print(d["z"])          // nil
let v = d["a"] ?? 0    // 1
```

This is the trap: even when the key exists, the subscript type is `V?`, because the compiler can't prove the key is present at the call site.

### Set

```swift
var seen: Set<String> = ["a", "b"]
seen.insert("a")       // (inserted: false, ...)
seen.contains("b")     // true
```

### Tuple

```swift
let point = (x: 3, y: 4)
print(point.x)             // 3 — labeled access
let (a, b) = (1, 2)        // destructuring
```

---

## 6. Control Flow

> **Priority:** DRILL — `if let`, `guard`, `switch` exhaustiveness in output prediction.

### `if` with bindings

Already covered in optionals, but worth repeating: `if let` is a *statement*, not just sugar.

```swift
guard let n, !n.isEmpty else { return }   // Swift 5.7 shorthand + condition
```

### `switch` — exhaustive and pattern-matching

`switch` in Swift is far more powerful than C. It must be **exhaustive** (cover every case) and supports range patterns, tuple patterns, value bindings, and `where` clauses.

```swift
switch score {
case 0..<50:                 print("F")    // half-open range
case 50..<80:                print("C")
case 80...100 where score == 100:  print("A+")  // closed range + guard
default:                     print("?")
}
```

#### Tuple switch

```swift
switch (x, y) {
case (0, 0):                 print("origin")
case (_, 0):                 print("on x-axis")    // _ means "any"
case (let a, let b) where a == b:
                             print("diagonal at \(a)")  // bind + guard
default:                     print("somewhere")
}
```

### Loops

```swift
for x in xs { print(x) }
for (i, v) in xs.enumerated() { print("\(i): \(v)") }   // index + value
for k in 1...5 { ... }            // 1,2,3,4,5
for k in 1..<5 { ... }            // 1,2,3,4
```

---

## 7. Closures

> **Priority:** DRILL — trailing closure syntax + `map`/`filter` output trace.

### Mental model

A closure is **a function value plus the variables it captured from its surrounding scope**. "Capture" means it remembers a *reference* to those variables, not a snapshot of their value at creation time.

```swift
var x = 1
let f = { print(x) }    // f captures x by reference
x = 99
f()                     // 99   <- prints CURRENT value of x, not 1
```

This is the most common closure exam trap. The closure was *created* when `x == 1`, but it doesn't matter — at call time `x` is `99`.

### Trailing closure syntax

When the last argument of a function is a closure, you can move it outside the parens:

```swift
nums.sorted(by: { (a, b) in a < b })   // verbose
nums.sorted { a, b in a < b }           // trailing closure
nums.sorted { $0 < $1 }                 // shorthand argument names
nums.sorted(by: <)                      // operator as function
```

`$0`, `$1` are auto-generated names for the first, second argument.

### Common patterns

```swift
nums.map    { $0 * 10 }              // transform
nums.filter { $0 > 0 }               // keep matching
nums.reduce(0) { acc, x in acc + x } // collapse to single value
nums.sorted { $0 > $1 }              // descending
```

### Capture lists (preview, more in lifecycle topics)

```swift
let f = { [x] in print(x) }   // capture x BY VALUE at this moment
x = 99
f()                            // prints the original captured value
```

You probably won't be tested on capture lists for this exam, but know they exist.

---

## 8. Functions

> **Priority:** DRILL — argument labels and `_` patterns appear in code reading.

### Why argument labels exist

Swift lets you have a *parameter name* (used inside the function) and an *argument label* (used at the call site). This makes call sites read like English while keeping the body terse.

```swift
//        label  name    type        default
func greet(to name: String, from sender: String = "Tae") -> String {
    "Hi \(name) from \(sender)"   // implicit return on single-expression
}

greet(to: "Bob")                       // "Hi Bob from Tae"
greet(to: "Bob", from: "Alice")        // override default
```

### Suppressing the label with `_`

```swift
func square(_ x: Int) -> Int { x * x }
square(5)        // no label needed
```

### Returning tuples for multiple values

```swift
func minMax(_ xs: [Int]) -> (min: Int, max: Int)? {
    guard let first = xs.first else { return nil }   // empty -> nil
    var lo = first, hi = first
    for x in xs.dropFirst() {
        if x < lo { lo = x }
        if x > hi { hi = x }
    }
    return (min: lo, max: hi)
}

if let r = minMax([3, 1, 4, 1, 5]) {
    print(r.min, r.max)   // 1 5
}
```

---

## 9. Struct vs Class — Value vs Reference

> **Priority:** DRILL — value vs reference semantics is a classic output trace.

### The memory model (this is the core idea)

```
STRUCT (value type)                 CLASS (reference type)

var s1 = S(n: 0)                    let c1 = C(n: 0)
+--------+                          +--------+         +-----------+
|  s1    |--> [n: 0]                |  c1    |-------> | heap obj  |
+--------+                          +--------+         | n: 0      |
                                                       +-----------+

var s2 = s1     // COPY            let c2 = c1     // copy POINTER
+--------+                          +--------+
|  s1    |--> [n: 0]                |  c1    |---+
+--------+                          +--------+   |
+--------+                          +--------+   +--> [ heap obj ]
|  s2    |--> [n: 0]                |  c2    |---+      n: 0
+--------+                          +--------+

s2.n = 5                            c2.n = 5
+--------+                          +--------+
|  s1    |--> [n: 0]  (untouched)   |  c1    |---+
+--------+                          +--------+   +--> [ heap obj ]
+--------+                          +--------+   |       n: 5
|  s2    |--> [n: 5]                |  c2    |---+    (BOTH see it)
+--------+                          +--------+
```

### Code

```swift
struct S { var n = 0 }
class  C { var n = 0 }

var s1 = S(); var s2 = s1; s2.n = 5
// s1.n == 0, s2.n == 5     <- struct: independent copies

let c1 = C(); let c2 = c1; c2.n = 5
// c1.n == 5, c2.n == 5     <- class: shared instance
```

### The `let` on a class trap

```swift
let c = C()
c.n = 10        // OK! `let` makes c's POINTER constant, not the object's contents
c = C()         // ERROR — can't reassign the pointer
```

A `let`-bound class reference still allows mutating any `var` property of the object. To make properties immutable, declare them with `let` inside the class.

### When to use which

| Use struct when                           | Use class when                          |
| ----------------------------------------- | --------------------------------------- |
| Holding plain data (Point, User, Item)    | Identity matters (same object reused)   |
| You want predictable copy semantics       | You need inheritance                    |
| SwiftUI views, models, most things        | You need deinit / reference cycles      |
| Default choice — start here               | You need to share + mutate from far away|

Default to `struct`. Reach for `class` only when you have a reason.

---

## 10. Enums

> **Priority:** SKIM — basic enums useful, associated values rarely deep tested.

### Why enums are powerful in Swift

Swift enums are **sum types**: each case can carry its own associated data. They model "this value is exactly one of N shapes" precisely. Combined with `switch`, the compiler enforces that you handle every case.

### Raw-value enum

```swift
enum Dir: String, CaseIterable {
    case up, down, left, right
}

Dir.up.rawValue              // "up"
Dir(rawValue: "down")        // Optional(.down)   <- can fail!
Dir(rawValue: "sideways")    // nil
Dir.allCases.count           // 4   (from CaseIterable)
```

`String` raw values default to the case name. `Int` raw values default to 0, 1, 2... unless you specify.

### Associated-value enum

```swift
enum Result2 {
    case ok(Int)
    case fail(String)
}

let r: Result2 = .ok(42)

switch r {
case .ok(let v):    print("value \(v)")     // bind associated value
case .fail(let m):  print("error \(m)")
}
```

This is how `Optional` itself is implemented under the hood: `enum Optional<T> { case none; case some(T) }`.

---

## 11. Output Prediction Practice

> **Priority:** DRILL — directly mirrors written-exam Output Prediction items.

These are calibrated to the exam style. Cover the right column, predict, then check.

### Snippet 1 — Optional printing

```swift
let s: String? = "hi"
print(s)
print(s!)
```

**Output:**
```
Optional("hi")
hi
```

**Why:** `print(s)` prints the boxed optional. `s!` opens the box.

---

### Snippet 2 — Integer division then promotion

```swift
print((3 + 4) / 2)
print(Double(7) / 2)
```

**Output:**
```
3
3.5
```

**Why:** Int / Int = Int (truncates). Once one side is Double, the result is Double.

---

### Snippet 3 — Struct vs Class assignment

```swift
struct S { var n = 0 }
class  C { var n = 0 }

var s1 = S(); var s2 = s1; s2.n = 5
let c1 = C(); let c2 = c1; c2.n = 5
print(s1.n, s2.n, c1.n, c2.n)
```

**Output:**
```
0 5 5 5
```

**Why:** struct copies on assign; class shares the instance through both names.

---

### Snippet 4 — Closure capture

```swift
var x = 10
let f = { print(x) }
x = 42
f()
```

**Output:**
```
42
```

**Why:** Closures capture by reference. At call time, `x` is 42.

---

### Snippet 5 — Functional pipeline

```swift
print([1, 2, 3, 4].filter { $0 % 2 == 0 }.map { $0 * $0 }.reduce(0, +))
```

**Output:**
```
20
```

**Why:** filter -> [2, 4], map -> [4, 16], reduce 0+4+16 = 20.

---

### Snippet 6 — Dictionary subscript

```swift
print(["a": 1]["a"])
print(["a": 1]["b"])
```

**Output:**
```
Optional(1)
nil
```

**Why:** Dictionary subscript always returns Optional. Use `?? default` to unbox.

---

### Snippet 7 — Range switch

```swift
let score = 65
let grade: String
switch score {
case ..<50:    grade = "F"
case 50..<80:  grade = "C"
default:       grade = "A"
}
print(grade)
```

**Output:**
```
C
```

**Why:** 65 falls in `50..<80` (50 inclusive, 80 exclusive).

---

### Snippet 8 — Optional in interpolation

```swift
let opt: Int? = 20
print("age=\(opt)")
print("age=\(opt ?? 0)")
```

**Output:**
```
age=Optional(20)
age=20
```

**Why:** Direct interpolation prints the box. `??` unwraps to the value.

---

## 12. Code Improvement Examples (Bad -> Better)

> **Priority:** DRILL — Code Improvement is a graded written-exam category.

### Example A: Force-unwrapped String -> Int

**Bad:**
```swift
let portString = readLine() ?? ""
let port = Int(portString)!     // crashes on bad input
startServer(on: port)
```

**Why bad:** `Int(_:)` returns `Int?`. If `portString` is `"abc"` or empty, `Int(portString)` is `nil`, and `!` traps the program. User input is exactly the situation where you cannot trust the value.

**Better:**
```swift
let portString = readLine() ?? ""
guard let port = Int(portString), (1...65535).contains(port) else {
    print("invalid port")
    return
}
startServer(on: port)            // port is plain Int here
```

Also acceptable depending on context: `let port = Int(portString) ?? 8080`.

---

### Example B: Forced cast and dictionary force-unwrap

**Bad:**
```swift
let json: [String: Any] = fetchJSON()
let name = json["name"]! as! String
let age  = json["age"]! as! Int
print("\(name), \(age)")
```

**Why bad:** Two crash sites per line. Dictionary subscript is `Optional`, force-unwrap crashes if key missing. `as!` crashes if the value isn't actually that type. JSON from a network is the *least* trustworthy input you have.

**Better:**
```swift
guard
    let name = json["name"] as? String,
    let age  = json["age"]  as? Int
else {
    print("malformed user payload")
    return
}
print("\(name), \(age)")          // both unwrapped, both correctly typed
```

`as?` returns `nil` on failed cast instead of crashing. Combined with `guard let`, the failure path is one explicit branch.

---

### Example C: Struct mutation through copy (silent bug)

**Bad:**
```swift
struct Counter { var n = 0 }

func bump(_ c: Counter) {
    var c = c              // shadow with mutable copy
    c.n += 1               // mutates the COPY, caller never sees it
}

var counter = Counter()
bump(counter)
print(counter.n)           // 0 — surprise!
```

**Why bad:** Structs are copied on parameter pass. Mutating the parameter has no effect on the caller. The author probably wanted reference semantics.

**Better (option 1 — return a new value, idiomatic Swift):**
```swift
func bumped(_ c: Counter) -> Counter {
    var c = c
    c.n += 1
    return c
}
counter = bumped(counter)        // explicit reassignment
```

**Better (option 2 — `inout` parameter when caller-mutation is the goal):**
```swift
func bump(_ c: inout Counter) { c.n += 1 }
bump(&counter)                   // & at call site signals mutation
print(counter.n)                 // 1
```

**Better (option 3 — use a class if shared mutable state is the design):**
```swift
class Counter { var n = 0 }
let counter = Counter()
func bump(_ c: Counter) { c.n += 1 }   // mutates the shared object
```

The lesson: pick the data type that matches your sharing model. Don't fight value semantics with `var c = c` shadowing.

---

## 13. Common Pitfalls

> **Priority:** DRILL — graders specifically hunt these in written sections.

These trip students up because the code *compiles* and the bug only appears at runtime or in surprising output.

| Pitfall                                       | Why it trips students                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------- |
| `print(optional)` showing `Optional("hi")`    | Compiles fine, only the *output* is wrong. Always unwrap before print.      |
| `dict[k]!` when key exists at runtime         | Compiler can't prove key exists; subscript is `V?` regardless.              |
| `Int / Int` truncating                        | `5 / 2 == 2`, not `2.5`. Promote one side to `Double` before dividing.      |
| `let c = ClassInstance(); c.prop = ...`       | Works! `let` only freezes the pointer, not the object's `var` properties.   |
| Struct passed to function and mutated         | Mutation is on a copy; caller is unaffected. Use `inout` or return new value.|
| Closure capturing a mutating var              | Sees the latest value, not the value at closure creation.                   |
| `if let x = x` and using `x` outside the `if` | `if let` only binds inside the block. Use `guard let` for outer scope.      |
| `Int("3.14")` returning `nil`                 | `Int(_:)` rejects decimals. Use `Double("3.14")` first.                     |
| `arr[i]` with `i >= arr.count`                | Runtime crash. Guard with `i < arr.count` or use `arr.indices.contains(i)`. |
| Switch missing `default` on non-enum          | Compile error — switches must be exhaustive. Add `default`.                 |
| `as!` to a type the value isn't               | Runtime crash. Always use `as?` and bind.                                   |
| Force unwrap "because it can't be nil"        | Famous last words. If you can prove it, use `guard let` and remove the proof.|

---

## 14. Quick Recall Card

> **Priority:** DRILL — last-minute syntax dump, repeat aloud tonight.

Last-minute syntax dump. Cover the explanation, recall the line.

```swift
// --- Variables ---
let x = 10                    // immutable, type Int inferred
var y: Double = 1.5           // mutable, annotated

// --- Optionals ---
var s: String? = "hi"
if let s = s { use(s) }
guard let s = s else { return }
let v = s ?? "default"
let n = s?.count              // optional chaining -> Int?
let bad = s!                  // force unwrap, avoid

// --- String <-> Int ---
let n = Int("42") ?? 0
let str = String(42)

// --- Collections ---
var arr = [1,2,3]; arr.append(4)
let dict = ["a": 1]; let v = dict["a"] ?? 0
var set: Set<String> = ["a"]; set.insert("b")
let tup = (x: 1, y: 2); tup.x

// --- Functional ---
arr.map    { $0 * 2 }
arr.filter { $0 > 0 }
arr.reduce(0, +)
arr.sorted { $0 < $1 }

// --- Control flow ---
for (i, v) in arr.enumerated() { }
switch x {
case 0..<10: ...
case 10...20 where x == 15: ...
default: ...
}

// --- Functions ---
func f(_ x: Int, label name: String = "Tae") -> Int { x * 2 }
func minMax(_ xs:[Int]) -> (min:Int, max:Int)? { ... }

// --- Closures ---
let add: (Int, Int) -> Int = { $0 + $1 }
nums.sorted { $0 > $1 }       // trailing
{ [x] in print(x) }           // capture list (by value)

// --- Struct vs Class ---
struct S { var n = 0 }        // value, copied
class  C { var n = 0 }        // reference, shared
// inout for mutating param:
func bump(_ c: inout S) { c.n += 1 }; bump(&s)

// --- Enum ---
enum Dir: String, CaseIterable { case up, down }
Dir(rawValue: "up")           // Dir?
enum R { case ok(Int); case fail(String) }
switch r { case .ok(let v): ...; case .fail(let m): ... }
```

### The night-before drill

1. Predict snippets 3, 4, 6, 8 in your head.
2. Rewrite `let port = Int(envVar)!` three safe ways from memory.
3. One sentence each:
   - Why does struct copy and class share? (Value type stores data inline; class stores a pointer to a heap object.)
   - Why does `print(optional)` show `Optional(...)`? (Optional is a real type; `print` shows the box.)
   - Why does `let c = C(); c.n = 5` work? (`let` freezes the pointer, not the pointee's `var` properties.)
4. Write a `switch` over `Result2` from memory.

If all four feel automatic, you are ready for the Output Prediction and Code Improvement sections.
