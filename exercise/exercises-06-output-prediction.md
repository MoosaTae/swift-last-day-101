# Topic 6 — Output Prediction: Practice

Pure Swift, console only. For each snippet, predict EXACTLY what is printed. Watch for `Optional(...)` wrappers, value vs reference semantics, closure capture, parameter shadowing, dictionary pipelines, and enum associated values.

## Section A — Output Prediction

### Q1

```swift
let s: String? = "hi"
print(s)
print(s ?? "fallback")
let n: Int? = nil
print(n ?? 0)
```

<details><summary>Answer</summary>

```
Optional("hi")
hi
0
```

Why: printing an `Optional` directly shows the `Optional(...)` wrapper. `??` unwraps to the underlying value when non-nil, or the fallback when nil.

> **React/TS:** no `Optional(...)` wrapper in JS — `console.log("hi")` prints `hi`, `console.log(undefined)` prints `undefined`. `??` works the same.
</details>

### Q2

```swift
let age: Int? = 5
print("age=\(age)")
print("age=\(age ?? 0)")
```

<details><summary>Answer</summary>

```
age=Optional(5)
age=5
```

Why: the famous string-interpolation gotcha. Interpolating an `Int?` directly embeds the wrapper text `Optional(5)`. Use `??` (or `if let`) to unwrap first.

> **React/TS:** `\`age=${age}\`` produces `age=5` — JS template literals don't have an "Optional wrapper" — this gotcha is Swift-only.
</details>

### Q3

```swift
struct Point { var x = 0 }
var a = Point()
var b = a
b.x = 7
print(a.x, b.x)
```

<details><summary>Answer</summary>

```
0 7
```

Why: `struct` is a value type. `var b = a` copies, so `b.x = 7` does not touch `a`.

> **React/JS:** to get the same independence: `const b = {...a}`. Plain `const b = a` aliases.
</details>

### Q4

```swift
class Point { var x = 0 }
let a = Point()
let b = a
b.x = 7
print(a.x, b.x)
```

<details><summary>Answer</summary>

```
7 7
```

Why: `class` is a reference type. `a` and `b` point to the same instance, and `let` only freezes the reference, not the instance's `var` properties.

> **React/JS:** this is JS's default for objects/classes. Mutating shared references is exactly why React imposes immutability discipline.
</details>

### Q5

```swift
var n = 1
let f = { print(n) }
n = 50
f()
n = 100
f()
```

<details><summary>Answer</summary>

```
50
100
```

Why: closures capture `var`s by reference, so each call reads `n`'s current value at call time, not at the time the closure was created.

> **React/JS:** identical — `let n = 1; const f = () => console.log(n);`. This is the source of stale-closure bugs in `useEffect`/`useCallback`.
</details>

### Q6

```swift
var xs = [1, 2, 3]
var ys = xs
ys.append(4)
print(xs)
print(ys)
```

<details><summary>Answer</summary>

```
[1, 2, 3]
[1, 2, 3, 4]
```

Why: arrays are value types in Swift. `var ys = xs` copies, so `ys.append(4)` does not modify `xs`.

> **React/JS:** opposite default — `const ys = xs; ys.push(4)` mutates `xs` too. To get Swift-style: `const ys = [...xs]`.
</details>

### Q7

```swift
let name: String? = "Tae"
if let name = name {
    print("inside: \(name)")
}
print("outside: \(name ?? "nil")")
```

<details><summary>Answer</summary>

```
inside: Tae
outside: Tae
```

Why: `if let name = name` shadows the outer `name` only inside the block. Outside, `name` is still the original optional, which is `"Tae"` here, so `?? "nil"` unwraps to `Tae`. The literal string `"nil"` would only appear if the original had been `nil`.
</details>

### Q8

```swift
func first(_ s: String?) -> String {
    guard let s, !s.isEmpty else { return "empty" }
    return String(s.first!)
}
print(first("hello"))
print(first(""))
print(first(nil))
```

<details><summary>Answer</summary>

```
h
empty
empty
```

Why: `guard let s, !s.isEmpty` short-circuits on both nil and empty string. Only `"hello"` survives, and `s.first!` yields the `Character` `h`, wrapped back into a `String`.
</details>

### Q9

```swift
func makeCounter() -> () -> Int {
    var n = 0
    return {
        n += 1
        return n
    }
}
let c = makeCounter()
print(c(), c(), c())
let d = makeCounter()
print(d(), c())
```

<details><summary>Answer</summary>

```
1 2 3
1 4
```

Why: each call to `makeCounter()` produces a fresh closure that owns its own captured `var n`. `c` and `d` therefore have independent state — `d` starts again at `1` while `c` continues from where it left off (now `4`).

> **React/JS:** classic JS closure factory. Identical mechanic.
</details>

### Q10

```swift
struct SBox { var v = 0 }
var arr = [SBox(), SBox()]
arr[0].v = 9
let snapshot = arr
arr[0].v = 100
print(arr[0].v, snapshot[0].v)
```

<details><summary>Answer</summary>

```
100 9
```

Why: `Array` and `SBox` are both value types, so `let snapshot = arr` makes a deep copy of the array and its struct elements. Mutating `arr[0].v` afterward leaves `snapshot[0].v` untouched at its earlier value of 9.

> **React/JS:** opposite default — even `[...arr]` only shallow-copies. Deep snapshots need `structuredClone(arr)`.
</details>

### Q11

```swift
let raw = ["1", "2", "x", "4"]
let parsed = raw.compactMap { Int($0) }
let mapped = raw.map { Int($0) }
print(parsed)
print(mapped)
```

<details><summary>Answer</summary>

```
[1, 2, 4]
[Optional(1), Optional(2), nil, Optional(4)]
```

Why: `compactMap` drops `nil` results and unwraps the rest, giving plain `Int`s. `map` keeps the `Int?` shape, so each element prints with its optional wrapper (or `nil`).
</details>

### Q12

```swift
struct Point { var x = 0 }
class Box { var n = 0 }

func mutate(p: Point, b: Box) {
    var p = p          // shadow to allow mutation
    p.x = 99
    b.n = 99
}

var p = Point()
let b = Box()
mutate(p: p, b: b)
print(p.x, b.n)
```

<details><summary>Answer</summary>

```
0 99
```

Why: `Point` is a struct (value type) — the function gets a copy, the `var p = p` shadow lets us mutate that copy locally, but the caller's `p` is untouched. `Box` is a class (reference type) — the function gets the same reference, so `b.n = 99` is visible to the caller. Mock-style trap: students often expect `99 99` (because the function "looks like it mutated p"). The correct answer is `0 99`.

To make the struct mutation visible, the function must declare `inout p: Point` and the caller must call `mutate(p: &p, b: b)`.
</details>

### Q13

```swift
class Counter { var n = 0 }

let items: [Counter] = [Counter(), Counter()]
for item in items {
    item.n += 10
}
print(items[0].n + items[1].n)
print(items.map(\.n))
```

<details><summary>Answer</summary>

```
20
[10, 10]
```

Why: `let items` only freezes the array binding (you can't reassign `items` or `append` to it), but the elements are class instances — references — so their `var n` properties are still mutable. The for-loop mutates each instance through its reference. Mock-style trap: students often expect a compiler error from "let + mutation". `let` on a reference-type array does NOT make the elements immutable.
</details>

### Q14

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

Why: filter keeps `A:80`, `C:70`, `E:90` (drops `B:45` and `D:30`). Sort descending by value gives `E:90, A:80, C:70`. Prefix(3) keeps all three. Map formats each entry, `joined` interleaves `, `. The missing key `"Z"` returns `nil`, so `??` falls back to `-1`. This is the canonical mock-anchor pattern (Mock 1 Q4, Mock 5 Q4).
</details>

### Q15

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

Why: `Dictionary(grouping: by:)` partitions `words` into `["a": ["apple","ant"], "b": ["bear","banana"], "c": ["cat","carrot"]]`. `mapValues { $0.count }` collapses each list to its size. The sort orders the keys alphabetically before printing. Mock 2 Q4 anchor pattern.
</details>

### Q16

```swift
enum Event {
    case login(user: String)
    case error(code: Int, msg: String)
    case ping
}

let events: [Event] = [
    .login(user: "tae"),
    .error(code: 404, msg: "not found"),
    .ping,
]

for e in events {
    switch e {
    case let .login(u):
        print("login: \(u)")
    case let .error(code, msg):
        print("error \(code): \(msg)")
    case .ping:
        print("ping")
    }
}
```

<details><summary>Answer</summary>

```
login: tae
error 404: not found
ping
```

Why: `case let .login(u)` binds the associated value into `u`. `case let .error(code, msg)` destructures both associated values. `.ping` has no payload, so no binding is needed. Mock 5 Q3 anchor pattern.
</details>
