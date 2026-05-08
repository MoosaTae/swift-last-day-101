# Swift Basics — Final Exam Cheatsheet

**Closed-book targets:** output prediction + code improvement (force-unwrap fixes).

## 1. Variables & Type Inference

- `let` immutable, `var` mutable. Inferred unless annotated. No-decimal literal -> `Int`; with-decimal -> `Double`.

```swift
let name = "Tae"; var age: Int = 21; age += 1; let pi = 3.14   // Double
```

## 2. Optionals

`T?` may be nil. `T!` implicitly unwrapped (auto-unwrap on use; crashes if nil).

```swift
var s: String? = "hi"
print(s)        // Optional("hi")
print(s!)       // hi   (crash if nil)
```

Unwrap toolkit: `if let`, `guard let`, `??`, `?.`, `!` (avoid).

```swift
if let n = Int("42") { print(n) }   // 42
let m = Int("oops") ?? 0            // 0
let len = s?.count ?? 0
```

## 3. Force-Unwrap Dangers (HEAVILY tested)

`Int(_:)` returns `Int?`. `Int("abc")!` -> crash.

Four safe rewrites:

```swift
if let n = Int(s) { ... } else { ... }            // (a)
guard let n = Int(s) else { return 0 }            // (b)
let n = Int(s) ?? 0                                // (c)
let upper = name?.uppercased()                     // (d) chaining
```

Red flags on exam: any `!` after `Int(...)`, `URL(string:)`, `dict[key]`, `as!`.

## 4. String <-> Int

```swift
Int("7")        // Optional(7)
Int("3.14")     // nil
Int("7") ?? -1  // 7
String(42)      // "42"
"id-\(Int("7") ?? 0)"   // "id-7"
```

## 5. Collections

**Array**: `append`, `count`, `isEmpty`, `xs[i]` (crashes OOB), `map`, `filter`, `reduce(0, +)`.
**Dictionary** subscript returns `V?`: `d["x"] ?? 0`.
**Set**: unordered unique; `insert`, `contains`.

## 6. Control Flow

```swift
if let a = Int("3"), let b = Int("4"), a < b { ... }
guard let n, !n.isEmpty else { return }
switch score {
case 0..<50: ...; case 50..<80: ...
case 80...100 where score == 100: ...
default: ...
}
switch (x,y) { case (0,0): ...; case (_,0): ...; case (let a, let b) where a==b: ...; default: ... }
for (i,v) in arr.enumerated() { ... }
```

## 7. Closures

```swift
nums.sorted { $0 < $1 }       // trailing closure + $0/$1
nums.map { $0 * 10 }
```

Capture by reference — closure sees later mutations:

```swift
var x = 1; let f = { print(x) }; x = 99; f()   // 99
```

## 8. Functions

```swift
func greet(to name: String, from sender: String = "Tae") -> String { "Hi \(name) from \(sender)" }
func square(_ x: Int) -> Int { x * x }
func minMax(_ xs:[Int]) -> (min:Int,max:Int)? { ... }
```

## 8.5 `inout` parameters

Pass-by-reference for value types: caller's variable is mutated in place. Marker `&` at the call site.

```swift
func bump(_ x: inout Int) { x += 1 }
var n = 10
bump(&n)        // n is now 11
```

- `inout` only works with `var` (not `let`) and not with literals.
- Common code-improvement: replacing a function that returns a new value AND ignores the result with an `inout` mutation is usually wrong — prefer return values unless the mutation is the entire point.

## 9. Struct vs Class

- `struct` = value type, copied on assignment/parameter-pass.
- `class` = reference type, shared.

```swift
struct S { var n=0 }; class C { var n=0 }
var s1=S(); var s2=s1; s2.n=5         // s1.n=0, s2.n=5
let c1=C(); let c2=c1; c2.n=5         // c1.n=5, c2.n=5
```

`let` on a class still allows mutating its `var` properties.

## 10. Enums

```swift
enum Dir: String, CaseIterable { case up, down, left, right }
Dir.up.rawValue           // "up"
Dir(rawValue:"down")      // Optional(.down)
Dir.allCases.count        // 4

enum Result2 { case ok(Int); case fail(String) }
switch r { case .ok(let v): ...; case .fail(let m): ... }
```

## 11. Output Prediction Drills (memorize)

| #   | Code                                                             | Output                         |
| --- | ---------------------------------------------------------------- | ------------------------------ |
| A   | `print(Optional("hi"))`                                          | `Optional("hi")`               |
| B   | `Int("12a")!`                                                    | runtime crash                  |
| C   | `(3+4)/2` then `Double(7)/2`                                     | `3` then `3.5`                 |
| D   | struct vs class copy (s1/s2/c1/c2 above)                         | `0 5 5 5`                      |
| E   | closure capture (var x=10; let f={print(x)}; x=42; f())          | `42`                           |
| F   | `print(["a":1]["a"])`                                            | `Optional(1)`                  |
| G   | `[1,2,3,4].filter{$0%2==0}.map{$0*$0}.reduce(0,+)`               | `20`                           |
| H   | `switch 65 { case ..<50: "F"; case 50..<80: "C"; default: "A" }` | `C`                            |
| I   | `print("age=\(Optional(20))")` vs `\(opt ?? 0)`                  | `age=Optional(20)` vs `age=20` |
| J   | `defer` ordering — `func f(){ defer{print("a")}; defer{print("b")}; print("c") }` | `c` `b` `a` (defers run reverse) |
| K   | `willSet`/`didSet` — `var n=0 { willSet{print("w\(newValue)")} didSet{print("d\(oldValue)")} }` then `n=5; n=9` | `w5 d0 w9 d5` |
| L   | protocol-extension static dispatch — `protocol P{}; extension P{ func f(){print("ext")} }; struct S:P{ func f(){print("S")} }; let p:P=S(); p.f()` | `ext` (not "S" — extension method, no requirement, dispatched by static type `P`) |
| M   | `compactMap` shape — `["1","x","3"].compactMap{ Int($0) }` | `[1, 3]` (drops nil; `map` would give `[Optional(1), nil, Optional(3)]`) |
| N   | for-in array snapshot — `var xs=[1,2,3]; for x in xs { xs.append(x); if xs.count>6 {break} }; print(xs)` | `[1, 2, 3, 1, 2, 3]` (loop iterates over the original copy, not the growing array) |
| O   | stateful closure — `func makeCounter() -> () -> Int { var n=0; return { n+=1; return n } }; let c=makeCounter(); print(c(),c(),c())` | `1 2 3` (closure captures `n` by reference) |
| P   | `dict[k, default:]` — `var d=["a":1]; d["b", default:0] += 10; print(d)` | `["a":1, "b":10]` (creates key if missing, then mutates) |
| Q   | `try?` — `func f() throws -> Int { throw E.x }; print(try? f())` | `nil` (try? converts throw to nil, swallows error) |

## 12. Code-Improvement Checklist

**Swift basics (closed-book):**
1. `Int(s)!` -> `if let`/`??`
2. `URL(string:s)!` -> `guard let`
3. `dict[k]!` -> `dict[k] ?? default`
4. `as!` -> `as?` + `if let`
5. unchecked `arr[i]` -> bounds guard (`indices.contains(i)` or `arr.first`/`arr.last`)
6. magic numbers -> `let constant`
7. duplicate computation -> store in `let`
8. long if/else over one value -> `switch`
9. `[Any]` inference (`let xs = [1, "a", 3.0]`) -> annotate the intended type or split into homogeneous arrays
10. `try?` swallowing async errors -> use `do/catch` and surface `error.localizedDescription`

**SwiftUI failure modes (practical exam):**
11. **`@ObservedObject` on the creator** — `@ObservedObject var vm = VM()` rebuilds VM on every parent re-render. Fix: `@StateObject` (or `@Observable` + `@State`).
12. **Mutating state inside `body`** — assigning to `@State` from `body` (not from a closure) loops re-renders. Move into `.onAppear`, `.task`, or a button action.
13. **`@Published` mutated off the main thread** — mark the VM `@MainActor`, or hop with `await MainActor.run { ... }`.
14. **`ForEach(items, id: \.self)` with duplicates** — same hash collapses rows / breaks animation. Use `Identifiable` with `UUID`.
15. **Heavy work in `body`** (sort/decode/network on every render). Move to `.task`/`.onAppear` and store the result in `@State`.
16. **Strong-reference cycle in closures** — escaping closure on a class captures `self`. Use `[weak self] in guard let self else { return }` for `Timer`/long-lived async.
17. **`.onAppear { await load() }`** — `onAppear` is sync. Use `.task { await load() }` or `.onAppear { Task { await load() } }`.
18. **Force-unwrap `URL(string:)!`** in async load — use `guard let url else { return }`.

**Template answer:**

> `Int(input)!` crashes if `input` is not a valid integer. Replace with `if let n = Int(input) { ... } else { ... }` or `let n = Int(input) ?? 0`.

**Template answer (SwiftUI):**

> `@ObservedObject var vm = VM()` re-creates the view-model every time the parent re-renders, losing all in-flight state. The view that *creates* the model should use `@StateObject` (or `@State` with an `@Observable` class on iOS 17+); only views that *receive* an existing instance should use `@ObservedObject`.

## Last-minute drills

- Predict D, E, G, I in your head.
- Rewrite `let port = Int(envVar)!` three safe ways.
- One sentence: why struct copies, class shares.
- Write a `switch` over `Result2`.
