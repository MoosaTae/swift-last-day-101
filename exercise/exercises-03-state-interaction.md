# Topic 3 — State Management & User Interaction: Practice

## Section A — Output/Behavior Prediction (10 problems)

### A1. Counter increments

```swift
struct CounterA: View {
    @State private var count = 0
    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Inc") { count += 1 }
        }
    }
}
```

User taps "Inc" three times. What does the `Text` show?

<details><summary>Answer</summary>

`Count: 3`

Each tap mutates `count` via the `@State` wrapper, SwiftUI invalidates the view, and `body` is recomputed reading the latest value.

> **React:** like `const [count, setCount] = useState(0)` then `setCount(c => c + 1)` — same render-on-change model.
</details>

### A2. Toggle switching between two text labels

```swift
struct ToggleLabel: View {
    @State private var isOn = false
    var body: some View {
        VStack {
            Toggle("Power", isOn: $isOn)
            Text(isOn ? "ON" : "OFF")
        }
    }
}
```

The user flips the switch on, then off, then on again. What does `Text` show at the end?

<details><summary>Answer</summary>

`ON`

The final state of `isOn` is `true` after the last flip, so the ternary evaluates to `"ON"`.

> **React:** equivalent to controlled `<input type="checkbox" checked={isOn} onChange={e => setIsOn(e.target.checked)} />`.
</details>

### A3. TextField updating Text below it

```swift
struct EchoView: View {
    @State private var name = ""
    var body: some View {
        VStack {
            TextField("Name", text: $name)
            Text("Hi, \(name)")
        }
    }
}
```

The user types `Tae` in the field. What does the `Text` show?

<details><summary>Answer</summary>

`Hi, Tae`

`TextField` writes through the `$name` binding on every keystroke, and the `Text` reads the same `@State` so it stays in sync.

> **React:** `$name` is the analog of passing `[value, setValue]`; `<input value={name} onChange={e => setName(e.target.value)} />` does the same two-way wiring.
</details>

### A4. Slider value displayed as Int

```swift
struct SliderView: View {
    @State private var v = 0.0
    var body: some View {
        VStack {
            Slider(value: $v, in: 0...100)
            Text("Value: \(Int(v))")
        }
    }
}
```

The user drags the slider so `v` becomes `42.7`. What does the `Text` show?

<details><summary>Answer</summary>

`Value: 42`

`Int(42.7)` truncates toward zero, dropping the fractional part.

> **React:** `Int(42.7)` is `Math.trunc(42.7)` — both drop the fractional part toward zero.
</details>

### A5. Picker selection changing displayed label

```swift
struct PickerView: View {
    @State private var flavor = "Original"
    let options = ["Original", "Chocolate", "Strawberry"]
    var body: some View {
        VStack {
            Picker("Flavor", selection: $flavor) {
                ForEach(options, id: \.self) { Text($0) }
            }
            Text("Chosen: \(flavor)")
        }
    }
}
```

The user picks `Chocolate`. What does the `Text` show?

<details><summary>Answer</summary>

`Chosen: Chocolate`

The picker writes its tag (the string itself, because `id: \.self`) into `flavor` via the binding, and the `Text` re-renders.

> **React:** controlled `<select value={flavor} onChange={e => setFlavor(e.target.value)}>` over `options.map(...)`.
</details>

### A6. Trap — missing `@State`

```swift
struct BadCounter: View {
    var count = 0
    var body: some View {
        Button("Tap: \(count)") { count += 1 }
    }
}
```

What happens when this is compiled?

<details><summary>Answer</summary>

Compile error: `cannot assign to property: 'self' is immutable`.

Views are structs (value types), and a closure passed to `Button` captures `self` immutably. Without `@State`, `count` is a stored property on the struct that cannot be mutated from `body`.

> **React:** in React this same bug compiles and runs silently — mutating a local `let count = 0` inside `onClick` does nothing visible. Swift turns the same mistake into a compile error because views are immutable structs.
</details>

### A7. Trap — parent passes `value` instead of `$value` to a `@Binding`

```swift
struct Child: View {
    @Binding var name: String
    var body: some View { TextField("Name", text: $name) }
}

struct Parent: View {
    @State private var name = ""
    var body: some View {
        Child(name: name)   // <- wrong
    }
}
```

What happens?

<details><summary>Answer</summary>

Compile error: `cannot convert value of type 'String' to expected argument type 'Binding<String>'`.

`@Binding var name` requires a `Binding<String>`, which is produced with the `$` projected-value prefix (`$name`). Passing the bare `String` is a type mismatch.

> **React:** like passing only `value` to a controlled child that also needs `setValue` — the child can read but not write back.
</details>

### A8. `.onChange(of:)` two-arg form firing on change

```swift
struct ChangeView: View {
    @State private var n = 0
    @State private var log = ""
    var body: some View {
        VStack {
            Text(log)
            Button("Inc") { n += 1 }
        }
        .onChange(of: n) { old, new in
            log += "[\(old)->\(new)]"
        }
    }
}
```

The user taps "Inc" three times. What does `Text(log)` show?

<details><summary>Answer</summary>

`[0->1][1->2][2->3]`

The two-argument `onChange` closure receives the previous and new value each time `n` changes.

> **React:** like `useEffect(() => { ... }, [n])`, but the closure receives both `old` and `new` directly — no need for a `useRef` to remember the previous value.
</details>

### A9. Multi-tap sequence on counter

```swift
struct MultiTap: View {
    @State private var n = 0
    var body: some View {
        VStack {
            Text("\(n)")
            Button("+2") { n += 2 }
            Button("-1") { n -= 1 }
            Button("x2") { n *= 2 }
        }
    }
}
```

Starting from `0`, the user taps `+2`, `+2`, `-1`, `x2`. What does `Text` show?

<details><summary>Answer</summary>

`6`

`0 + 2 = 2`, `2 + 2 = 4`, `4 - 1 = 3`, `3 * 2 = 6`.
</details>

### A10. `@StateObject` vs `@ObservedObject` re-creation

```swift
final class Counter: ObservableObject {
    @Published var n = 0
    init() { print("init Counter") }
}

struct Inner: View {
    @StateObject var s = Counter()      // owns
    @ObservedObject var o = Counter()   // recreated each init
    var body: some View {
        VStack {
            Text("s=\(s.n) o=\(o.n)")
            Button("inc") { s.n += 1; o.n += 1 }
        }
    }
}

struct Outer: View {
    @State private var tick = 0
    var body: some View {
        VStack {
            Inner()
            Button("Re-render parent") { tick += 1 }
        }
    }
}
```

The user taps "inc" twice (so both reach 2), then taps "Re-render parent" once. What does the `Text` inside `Inner` show?

<details><summary>Answer</summary>

`s=2 o=0`

`@StateObject` is created once and tied to the view's identity, so `s.n` survives the parent re-render. `@ObservedObject` initialized inline is rebuilt every time `Inner` is reinitialized, so `o` is replaced by a fresh `Counter()` with `n = 0`. (You will also see two `init Counter` prints originally, then one more on the parent re-render.)

> **React:** `@StateObject` ≈ `useState(() => new Counter())` (lazy init, persists across renders). `@ObservedObject var o = Counter()` ≈ `const o = new Counter()` written directly in the function body — rebuilt every render.
</details>

## Section B — Code Improvement (10 problems)

### B1. Mutable view property without `@State`

```swift
struct V: View {
    var count = 0
    var body: some View {
        Button("Tap \(count)") { count += 1 }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct V: View {
    @State private var count = 0
    var body: some View {
        Button("Tap \(count)") { count += 1 }
    }
}
```

Reasons: a `View` is a value-type struct, so closures capture `self` immutably and you cannot mutate stored properties from `body`. Wrap mutable view-local state with `@State` so SwiftUI manages it in external storage and re-renders on change.

> **React:** in React the same bug compiles silently — `let count = 0; count += 1` runs but never re-renders. Reach for `useState`.
</details>

### B2. `@State` without `private`

```swift
struct V: View {
    @State var count = 0
    var body: some View { Text("\(count)") }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct V: View {
    @State private var count = 0
    var body: some View { Text("\(count)") }
}
```

Reasons: `@State` represents view-internal storage. Exposing it publicly invites callers to write `V(count: 5)`, which is fragile because SwiftUI re-creates the struct on every render and discards init values after the first creation. Keep it `private` and pass data in via `@Binding` or an `@Observable` model instead.

> **React:** treat `useState` as component-internal — don't lift it into props unless the parent owns the truth.
</details>

### B3. Passing `name` instead of `$name` to TextField

```swift
struct V: View {
    @State private var name = ""
    var body: some View {
        TextField("Name", text: name)
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct V: View {
    @State private var name = ""
    var body: some View {
        TextField("Name", text: $name)
    }
}
```

Reasons: `TextField(text:)` expects a `Binding<String>`. Passing the bare `String` is a type error. The `$` prefix yields the projected `Binding<String>` so the field can read and write through the same `@State` storage.

> **React:** like writing `<input value={name} />` without `onChange` — the field has no write path. `$name` provides both directions in one prop.
</details>

### B4. Child has `@State var count` when it should be `@Binding var count`

```swift
struct Stepper2: View {
    @State var count: Int
    var body: some View {
        Button("\(count)") { count += 1 }
    }
}

struct Parent: View {
    @State private var n = 0
    var body: some View { Stepper2(count: n) }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct Stepper2: View {
    @Binding var count: Int
    var body: some View {
        Button("\(count)") { count += 1 }
    }
}

struct Parent: View {
    @State private var n = 0
    var body: some View { Stepper2(count: $n) }
}
```

Reasons: `@State` makes the child own a private copy that the parent never sees, so `n` never updates. The child needs a two-way connection to the parent's source of truth, which is exactly what `@Binding` provides. The parent passes `$n`.

> **React:** the child wrote `useState(props.n)` (snapshot copy) instead of taking `[n, setN]` from props. The copy diverges from the parent forever.
</details>

### B5. Using `@ObservedObject` to create the object

```swift
final class Store: ObservableObject {
    @Published var n = 0
}

struct V: View {
    @ObservedObject var store = Store()
    var body: some View {
        Button("\(store.n)") { store.n += 1 }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
final class Store: ObservableObject {
    @Published var n = 0
}

struct V: View {
    @StateObject private var store = Store()
    var body: some View {
        Button("\(store.n)") { store.n += 1 }
    }
}
```

Reasons: `@ObservedObject` does not own the lifetime of the object — its initializer expression runs every time the view struct is recreated, so a new `Store()` can replace the old one and lose state. `@StateObject` instantiates exactly once per view identity. (In iOS 17+ projects, prefer `@Observable` + `@State private var store = Store()`.)

> **React:** `useState(new Store())` runs `new Store()` every render but discards all but the first; the safe form is `useState(() => new Store())` (lazy init). `@StateObject` is exactly that lazy-init contract.
</details>

### B6. Class with shared mutable state — should be `ObservableObject` with `@Published`

```swift
final class Cart {
    var items: [String] = []
}

struct V: View {
    var cart = Cart()
    var body: some View {
        VStack {
            Text("Items: \(cart.items.count)")
            Button("Add") { cart.items.append("x") }
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
final class Cart: ObservableObject {
    @Published var items: [String] = []
}

struct V: View {
    @StateObject private var cart = Cart()
    var body: some View {
        VStack {
            Text("Items: \(cart.items.count)")
            Button("Add") { cart.items.append("x") }
        }
    }
}
```

Reasons: a plain class held in an unwrapped property does not notify SwiftUI when its members change, so the `Text` never re-renders. Conform to `ObservableObject`, mark mutable members `@Published`, and own the instance with `@StateObject` (or use `@Observable` + `@State` on iOS 17+).

> **React:** plain JS objects held in `useRef` don't trigger re-renders on mutation. You'd reach for Zustand, Context + reducer, or `useSyncExternalStore` to get reactive shared state.
</details>

### B7. TextField that doesn't update because of wrong binding type

```swift
struct V: View {
    @State private var query = ""
    var body: some View {
        TextField("Search", text: .constant(query))
        Text(query)
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct V: View {
    @State private var query = ""
    var body: some View {
        VStack {
            TextField("Search", text: $query)
            Text(query)
        }
    }
}
```

Reasons: `.constant(query)` creates a read-only binding, so typing in the field has no place to write back — the field appears frozen. Use `$query` for a real two-way binding into `@State`.

> **React:** equivalent to `<input value={query} readOnly />` — appears bound but never writes.
</details>

### B8. Toggle whose label doesn't change because dependent Text isn't reading bound state

```swift
struct V: View {
    @State private var isOn = false
    var label = "OFF"
    var body: some View {
        VStack {
            Toggle("Power", isOn: $isOn)
            Text(label)
        }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct V: View {
    @State private var isOn = false
    var body: some View {
        VStack {
            Toggle("Power", isOn: $isOn)
            Text(isOn ? "ON" : "OFF")
        }
    }
}
```

Reasons: `label` is a plain stored property unrelated to `isOn`, so flipping the toggle never changes the displayed text. Derive the label from the bound state inside `body` so SwiftUI re-renders when `isOn` changes.

> **React:** same rule: derive computed values inline in JSX (`{isOn ? "ON" : "OFF"}`) rather than caching them in a separate state/prop that can drift.
</details>

### B9. Button action that mutates a `let` constant

```swift
struct V: View {
    let count = 0
    var body: some View {
        Button("Tap \(count)") { count += 1 }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
struct V: View {
    @State private var count = 0
    var body: some View {
        Button("Tap \(count)") { count += 1 }
    }
}
```

Reasons: `let` is immutable — `count += 1` is a compile error. The value also needs to drive re-renders, which means it must live in `@State` (or a model), not as a struct stored property.

> **React:** `const count = 0; count += 1` is also a TS/JS error. Use `useState` for both reactivity and mutability.
</details>

### B10. View recreating its data source every render

```swift
final class Loader: ObservableObject {
    @Published var rows: [String] = []
    init() { rows = (1...100).map { "Row \($0)" } }
}

struct V: View {
    @ObservedObject var loader = Loader()   // recreated each init
    var body: some View {
        List(loader.rows, id: \.self) { Text($0) }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
final class Loader: ObservableObject {
    @Published var rows: [String] = []
    init() { rows = (1...100).map { "Row \($0)" } }
}

struct V: View {
    @StateObject private var loader = Loader()
    var body: some View {
        List(loader.rows, id: \.self) { Text($0) }
    }
}
```

Reasons: `@ObservedObject var loader = Loader()` re-runs `Loader()` every time the view struct is reinitialized, throwing away cached rows and causing redundant work. `@StateObject` ties creation to the view's identity so `Loader` is built exactly once.

> **React:** same lesson as B5: `useState(() => new Loader())` builds once; `useState(new Loader())` rebuilds and discards every render.
</details>

## Section C — Practical Mini-Tasks (5 tasks)

### C1. Counter view: complete `@State` and `+` button

Starter:

```swift
struct CounterTask: View {
    // TODO: declare state for count

    var body: some View {
        VStack {
            // TODO: show current count
            // TODO: add a + button that increments
        }
    }
}
```

Your task: declare a private `@State` integer named `count` starting at 0, show it as `Text`, and add a `+` button that increments it.

<details><summary>Reference solution</summary>

```swift
struct CounterTask: View {
    @State private var count = 0

    var body: some View {
        VStack(spacing: 16) {
            Text("\(count)").font(.largeTitle)
            Button("+") { count += 1 }
                .buttonStyle(.borderedProminent)
        }
    }
}
```

> **React:** `const [count, setCount] = useState(0)` + `<button onClick={() => setCount(c => c + 1)}>+</button>`.
</details>

### C2. Login form bound to an `ObservableObject` view model

Starter:

```swift
final class LoginVM: ObservableObject {
    @Published var email = ""
    @Published var password = ""
    var canSubmit: Bool { email.contains("@") && password.count >= 6 }
    func submit() { /* network */ }
}

struct LoginView: View {
    // TODO: own a LoginVM
    var body: some View {
        // TODO: two TextFields bound to vm + a Button disabled until canSubmit
        EmptyView()
    }
}
```

Your task: own the view model with the right wrapper, bind two text fields to its `email` and `password`, and add a disabled-when-invalid `Sign in` button that calls `submit()`.

<details><summary>Reference solution</summary>

```swift
struct LoginView: View {
    @StateObject private var vm = LoginVM()

    var body: some View {
        Form {
            TextField("Email", text: $vm.email)
                .textInputAutocapitalization(.never)
            SecureField("Password", text: $vm.password)
            Button("Sign in") { vm.submit() }
                .disabled(!vm.canSubmit)
        }
    }
}
```

Notes: `@StateObject` ensures the VM is created once. `$vm.email` produces a `Binding<String>` from the `@Published` property. On iOS 17+ you would mark `LoginVM` `@Observable` and own it via `@State private var vm = LoginVM()`.

> **React:** typically a Zustand store or Context+reducer; the closest direct analog is `useState(() => new LoginVM())` plus per-field setters. `$vm.email` collapses `[vm.email, e => setVm({...vm, email: e})]` into one expression.
</details>

### C3. `RatingPicker(rating: $rating)` child

Starter:

```swift
struct RatingPicker: View {
    // TODO: receive a binding to an Int rating (1...5)
    var body: some View {
        HStack {
            // TODO: 5 buttons, tap sets rating
        }
    }
}

struct ParentRating: View {
    @State private var rating = 3
    var body: some View {
        VStack {
            Text("Rating: \(rating)")
            RatingPicker(rating: $rating)
        }
    }
}
```

Your task: write `RatingPicker` so it correctly mutates the parent's `rating` via `@Binding`.

<details><summary>Reference solution</summary>

```swift
struct RatingPicker: View {
    @Binding var rating: Int

    var body: some View {
        HStack {
            ForEach(1...5, id: \.self) { i in
                Button(action: { rating = i }) {
                    Image(systemName: i <= rating ? "star.fill" : "star")
                }
                .buttonStyle(.plain)
            }
        }
    }
}
```

Notes: declare `@Binding var rating: Int` (no default value), and assign with `rating = i`. The parent passes `$rating`. For previews use `RatingPicker(rating: .constant(3))`.

> **React:** controlled-component pattern: `<RatingPicker rating={rating} onChange={setRating} />`. `@Binding` packages those two props into one.
</details>

### C4. `ColorPreview` reading RGB from three sliders

Starter:

```swift
struct ColorPreview: View {
    // TODO: r, g, b state in 0...1
    var body: some View {
        VStack {
            // TODO: 3 sliders + a Rectangle showing Color(red:green:blue:)
            EmptyView()
        }
    }
}
```

Your task: keep three `Double` state values bound to three sliders and render a colored `Rectangle` that updates live.

<details><summary>Reference solution</summary>

```swift
struct ColorPreview: View {
    @State private var r = 0.5
    @State private var g = 0.5
    @State private var b = 0.5

    var body: some View {
        VStack(spacing: 12) {
            Rectangle()
                .fill(Color(red: r, green: g, blue: b))
                .frame(height: 120)
            Slider(value: $r, in: 0...1) { Text("R") }
            Slider(value: $g, in: 0...1) { Text("G") }
            Slider(value: $b, in: 0...1) { Text("B") }
        }
        .padding()
    }
}
```

Notes: each `@State` triggers a `body` recompute when its slider drags, and `Color(red:green:blue:)` is recomputed with the latest values.

> **React:** three `useState`s + a derived inline style `style={{ background: `rgb(${r*255},${g*255},${b*255})` }}` recomputed in JSX.
</details>

### C5. `TodoItem` row with checkbox bound to parent's array (`ForEach($items)`)

Starter:

```swift
struct Todo: Identifiable {
    let id = UUID()
    var title: String
    var done: Bool
}

struct TodoItem: View {
    // TODO: @Binding var todo: Todo
    var body: some View {
        // TODO: HStack with toggle bound to todo.done and Text(todo.title)
        EmptyView()
    }
}

struct TodoList: View {
    @State private var items: [Todo] = [
        Todo(title: "Buy milk", done: false),
        Todo(title: "Walk dog", done: false),
    ]
    var body: some View {
        List {
            // TODO: ForEach over $items so each row gets a Binding<Todo>
        }
    }
}
```

Your task: write `TodoItem` with a `@Binding var todo: Todo` and wire `TodoList` using `ForEach($items)` so toggling a row mutates the parent's array.

<details><summary>Reference solution</summary>

```swift
struct TodoItem: View {
    @Binding var todo: Todo

    var body: some View {
        HStack {
            Toggle("", isOn: $todo.done)
                .labelsHidden()
            Text(todo.title)
                .strikethrough(todo.done)
        }
    }
}

struct TodoList: View {
    @State private var items: [Todo] = [
        Todo(title: "Buy milk", done: false),
        Todo(title: "Walk dog", done: false),
    ]

    var body: some View {
        List {
            ForEach($items) { $todo in
                TodoItem(todo: $todo)
            }
        }
    }
}
```

Notes: `ForEach($items)` requires `Todo: Identifiable` and yields a `Binding<Todo>` per element, which you destructure with `$todo in`. The child uses `$todo.done` to bind the toggle straight to the array's source of truth.

> **React:** no `$items` shortcut. You'd map with index and write `onChange={updated => setItems(prev => prev.map((it, j) => j === i ? updated : it))}` per row. SwiftUI collapses that whole boilerplate into one destructured `$todo`.
</details>

## Section D — View Decomposition

### D1. Settings screen for a workout app

```
+------------------------------------------------+
| Settings                                       |
+------------------------------------------------+
|                                                |
|  Notifications                                 |
| +--------------------------------------------+ |
| | Enable Notifications              [  ON ]  | |
| +--------------------------------------------+ |
|                                                |
|  Workout                                       |
| +--------------------------------------------+ |
| | Daily Goal   [=====O--------]      30 min  | |
| +--------------------------------------------+ |
| | Rest Days                          [- 2 +] | |
| +--------------------------------------------+ |
|                                                |
| +--------------------------------------------+ |
| |              Reset Defaults                | |
| |                  (red)                     | |
| +--------------------------------------------+ |
|                                                |
+------------------------------------------------+
```

Your task: write a `struct SettingsView: View` that reproduces this layout using only `VStack`, `HStack`, `Form`, `Section`, `Text`, `Toggle`, `Slider`, `Stepper`, and `Button`. Declare the necessary `@State` properties for the toggle (Bool), daily-goal slider (Double minutes, range 0...120), rest-days stepper (Int, range 0...7), and a no-op `resetDefaults()` action. The slider row must show "Daily Goal" on the left, the slider in the middle, and `"\(Int(goal)) min"` on the right. The reset button text must be red.

<details><summary>Reference solution</summary>

```swift
struct SettingsView: View {
    @State private var notifications = true
    @State private var dailyGoal: Double = 30
    @State private var restDays: Int = 2

    var body: some View {
        Form {
            Section("Notifications") {
                Toggle("Enable Notifications", isOn: $notifications)
            }

            Section("Workout") {
                HStack {
                    Text("Daily Goal")
                    Slider(value: $dailyGoal, in: 0...120)
                    Text("\(Int(dailyGoal)) min")
                        .monospacedDigit()
                }
                Stepper(value: $restDays, in: 0...7) {
                    Text("Rest Days")
                }
            }

            Section {
                Button(action: resetDefaults) {
                    Text("Reset Defaults")
                        .frame(maxWidth: .infinity)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Settings")
    }

    private func resetDefaults() {
        notifications = true
        dailyGoal = 30
        restDays = 2
    }
}
```

Notes: `Form` provides the grouped iOS-settings chrome for free; each `Section` becomes a card. `Stepper(value:in:)` already lays out label + `- value +` controls horizontally, so no extra `HStack` is needed. `.frame(maxWidth: .infinity)` on the button label centers the text across the row. The slider row uses an explicit `HStack` because we want a custom right-side label (`"\(Int(dailyGoal)) min"`).

> **React:** `Form`/`Section` ≈ a styled `<fieldset>` + `<legend>` group. `@State` properties play the same role as three `useState` hooks; the `$` prefix collapses each `[value, setValue]` pair into a single binding argument.
</details>

