# Topic 6 — Output Prediction: Practice

Pure Swift, console only. For each snippet, predict EXACTLY what is printed. Watch for `Optional(...)` wrappers, integer vs double division, value vs reference semantics, closure capture, defer ordering, didSet/willSet, and `for-in` snapshots.

## Section A — Output Prediction

### Q1

```swift
let a = 7
let b = 2
print(a / b)
print(Double(a) / Double(b))
```

<details><summary>Answer</summary>

```
3
3.5
```

Why: `Int / Int` is integer division (truncates toward zero), so `7 / 2 = 3`. Promoting both sides to `Double` gives true floating-point division `3.5`.

> **React/JS:** JS has no integer-division by default — `7/2 === 3.5`. To get Swift-style integer division, use `Math.floor(7/2)` or `Math.trunc(7/2)`.
</details>

### Q2

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

### Q3

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

### Q4

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

### Q5

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

### Q6

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

### Q7

```swift
func go() {
    print("A")
    defer { print("B") }
    defer { print("C") }
    print("D")
}
go()
```

<details><summary>Answer</summary>

```
A
D
C
B
```

Why: `defer` blocks run in reverse (LIFO) order when the enclosing scope exits. Both defers fire after `print("D")` and after the function returns; the later-registered `C` runs before the earlier-registered `B`.

> **React/JS:** no native `defer`. Closest: stacking `try { ... } finally { ... }` blocks, or pushing onto an array of cleanup functions and iterating in reverse — what `useEffect`'s cleanup does.
</details>

### Q8

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

> **React/JS:** opposite default — `const ys = xs; ys.push(4)` mutates `xs` too. To get Swift-style: `const ys = [...xs]`. This is the React "always spread before mutating" rule.
</details>

### Q9

```swift
var counts: [String: Int] = [:]
let words = ["a", "b", "a", "c", "a"]
for w in words {
    counts[w, default: 0] += 1
}
print(counts["a"] ?? 0)
print(counts["z"] ?? -1)
```

<details><summary>Answer</summary>

```
3
-1
```

Why: `dict[key, default: 0] += 1` is the idiomatic counter pattern. `a` appears 3 times. `"z"` is missing, so `counts["z"]` is `nil` and `??` falls back to `-1`.

> **React/JS:** `counts[w] = (counts[w] ?? 0) + 1` — same pattern, no `default:` shortcut.
</details>

### Q10

```swift
for i in stride(from: 1, through: 10, by: 3) {
    print(i, terminator: " ")
}
print()
```

<details><summary>Answer</summary>

```
1 4 7 10 

```

Why: `stride(from: 1, through: 10, by: 3)` yields 1, 4, 7, 10 (10 is included because it lands exactly on a step). Each value is printed with a trailing space; the bare `print()` at the end emits one newline.

> **React/JS:** equivalent to `for (let i = 1; i <= 10; i += 3) process.stdout.write(\`${i} \`); console.log();`. `through:` = `<=`; `to:` would be `<`.
</details>

### Q11

```swift
var sum = 0
for i in 1...6 where i % 2 == 0 {
    sum += i
}
print(sum)
```

<details><summary>Answer</summary>

```
12
```

Why: the `where` clause filters to even values in `1...6`, namely 2, 4, 6. Their sum is 12.

> **React/JS:** no `where` in for-of. Equivalent: `[1,2,3,4,5,6].filter(i => i % 2 === 0).reduce((a,b) => a+b, 0)` or an `if` inside the loop.
</details>

### Q12

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

Why: `if let name = name` shadows the outer `name` only inside the block. Outside, `name` is still the original optional, which is `"Tae"` here, so `?? "nil"` unwraps to `Tae`. Note that `"nil"` would only appear if the original had been `nil`.
</details>

### Q13

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

> **React/JS:** equivalent: `if (!s) return "empty"; return s[0];` — JS strings are already character-indexable.
</details>

### Q14

```swift
struct Bag {
    var items: [String] = [] {
        didSet { print("now \(items.count)") }
    }
}
var b = Bag()
b.items.append("x")
b.items.append("y")
b.items.removeLast()
```

<details><summary>Answer</summary>

```
now 1
now 2
now 1
```

Why: `didSet` fires on every write that mutates the property, including `append` and `removeLast` on a stored array (because mutating an array on a struct counts as writing the whole property).

> **React/JS:** closest is `useEffect(() => { console.log("now", items.length) }, [items])` — fires after every state change. JS doesn't have property observers without Proxy.
</details>

### Q15

```swift
struct Temp {
    var c: Double = 0 {
        willSet { print("will \(c) -> \(newValue)") }
        didSet  { print("did  \(oldValue) -> \(c)") }
    }
}
var t = Temp()
t.c = 25
t.c = 30
```

<details><summary>Answer</summary>

```
will 0.0 -> 25.0
did  0.0 -> 25.0
will 25.0 -> 30.0
did  25.0 -> 30.0
```

Why: `willSet` runs before the new value is stored; inside it, the property still holds the old value and `newValue` holds the incoming value. `didSet` runs after; the property now holds the new value and `oldValue` holds what was there before. `Double` literals print with a trailing `.0`.
</details>

### Q16

```swift
protocol Greeter { func greet() }
extension Greeter {
    func greet() { print("hello from default") }
}
struct A: Greeter {}
struct B: Greeter {
    func greet() { print("hello from B") }
}
let g1: Greeter = A()
let g2: Greeter = B()
g1.greet()
g2.greet()
```

<details><summary>Answer</summary>

```
hello from default
hello from B
```

Why: when a conforming type does not implement a protocol requirement, the extension's default is used. When the type provides its own implementation, the type's version wins via dynamic dispatch on the protocol requirement.

> **React/TS:** TS interfaces can't have defaults. Closest analog: an abstract class with method overrides, or a base mixin object that subclasses override.
</details>

### Q17

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
```

<details><summary>Answer</summary>

```
1 2 3
```

Why: the inner closure captures the local `var n` by reference, so `n` survives past `makeCounter`'s return and increments across calls. `print(c(), c(), c())` evaluates the three calls left-to-right, producing `1 2 3` separated by spaces.

> **React/JS:** classic JS closure factory: `function makeCounter() { let n = 0; return () => ++n; }`. Identical mechanic.
</details>

### Q18

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

> **React/JS:** opposite default — `const snapshot = arr` shares; even `[...arr]` only shallow-copies. Deep snapshots need `structuredClone(arr)` or `JSON.parse(JSON.stringify(arr))`.
</details>

### Q19

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

> **React/JS:** `compactMap` ≈ `raw.map(s => Number(s)).filter(n => !Number.isNaN(n))` — JS has no built-in compactMap, but Lodash provides `_.compact`.
</details>

### Q20

```swift
var xs = [1, 2, 3]
for x in xs {
    xs.append(x * 10)
}
print(xs)
```

<details><summary>Answer</summary>

```
[1, 2, 3, 10, 20, 30]
```

Why: `Array` is a value type, and `for x in xs` iterates over the value of `xs` captured at loop start. Mutations to `xs` inside the body do not extend the iteration. The body runs three times (for 1, 2, 3) and appends 10, 20, 30 to the live `xs`.

> **React/JS:** `for (const x of xs) xs.push(x*10)` would loop forever — JS arrays are references, so the iterator sees newly-pushed elements. Swift's value semantics prevent this footgun.
</details>
