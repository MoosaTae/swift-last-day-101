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

### A11. `@Observable` + `@State` survives parent re-render

```swift
import Observation

@Observable
final class Counter {
    var n = 0
    init() { print("init Counter") }
}

struct Inner: View {
    @State private var counter = Counter()
    var body: some View {
        VStack {
            Text("n=\(counter.n)")
            Button("inc") { counter.n += 1 }
        }
    }
}

struct Outer: View {
    @State private var tick = 0
    var body: some View {
        VStack {
            Text("tick=\(tick)")
            Inner()
            Button("Re-render parent") { tick += 1 }
        }
    }
}
```

The user taps "inc" twice, then "Re-render parent" once. What does the `Text` inside `Inner` show, and how many times does `init Counter` print?

<details><summary>Answer</summary>

`n=2`. `init Counter` prints exactly **once**.

Why: `@State` ties the class instance to the view's identity, so the same `Counter` survives across re-renders triggered by the parent's `tick` change. Two increments still leave `counter.n == 2`.

The contract: **`@Observable` class + owner uses `@State` + receivers use `@Bindable`** (or plain `let` if read-only).
</details>

### A12. `@FocusState` auto-focus on appear

```swift
struct SearchBar: View {
    @State private var text = ""
    @FocusState private var focused: Bool
    var body: some View {
        TextField("Search", text: $text)
            .focused($focused)
            .onAppear { focused = true }
    }
}
```

What happens when this view appears, and what is the keyboard state?

<details><summary>Answer</summary>

The `TextField` becomes the first responder automatically — the keyboard slides up and the cursor blinks inside the field — without the user tapping. Setting `focused = true` programmatically gives focus; setting it to `false` dismisses the keyboard.

Why: `@FocusState` is the only state wrapper that controls keyboard focus. `.focused($focused)` attaches the binding to the field; mutations to `focused` are reflected as focus changes. Tapping a `Cancel` button can call `focused = false` to dismiss the keyboard cleanly.
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

### B5. Plain `var` to create an `@Observable`

```swift
import Observation

@Observable
final class Store { var n = 0 }

struct V: View {
    var store = Store()
    var body: some View {
        Button("\(store.n)") { store.n += 1 }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
import Observation

@Observable
final class Store { var n = 0 }

struct V: View {
    @State private var store = Store()
    var body: some View {
        Button("\(store.n)") { store.n += 1 }
    }
}
```

Reasons: a plain stored property does not own the instance's lifetime — its initializer runs every time the view struct is recreated, so a new `Store()` can replace the old one and lose state. `@State` ties creation to the view's identity, instantiating exactly once.

> **React:** `useState(new Store())` runs `new Store()` every render but discards all but the first; the safe form is `useState(() => new Store())` (lazy init). `@State` on an `@Observable` is exactly that lazy-init contract.
</details>

### B6. Class with shared mutable state — should be `@Observable`

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
import Observation

@Observable
final class Cart {
    var items: [String] = []
}

struct V: View {
    @State private var cart = Cart()
    var body: some View {
        VStack {
            Text("Items: \(cart.items.count)")
            Button("Add") { cart.items.append("x") }
        }
    }
}
```

Reasons: a plain class held in an unwrapped property does not notify SwiftUI when its members change, so the `Text` never re-renders. Annotate the class with `@Observable` (property-level dependency tracking) and own the instance with `@State` so the same `Cart` survives re-renders.

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
import Observation

@Observable
final class Loader {
    var rows: [String] = []
    init() { rows = (1...100).map { "Row \($0)" } }
}

struct V: View {
    var loader = Loader()   // recreated each init
    var body: some View {
        List(loader.rows, id: \.self) { Text($0) }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
import Observation

@Observable
final class Loader {
    var rows: [String] = []
    init() { rows = (1...100).map { "Row \($0)" } }
}

struct V: View {
    @State private var loader = Loader()
    var body: some View {
        List(loader.rows, id: \.self) { Text($0) }
    }
}
```

Reasons: `var loader = Loader()` re-runs `Loader()` every time the view struct is reinitialized, throwing away cached rows and causing redundant work. `@State` ties creation to the view's identity so `Loader` is built exactly once.

> **React:** same lesson as B5: `useState(() => new Loader())` builds once; `useState(new Loader())` rebuilds and discards every render.
</details>

### B11. Wrong wrapper for an `@Observable` receiver

```swift
import Observation

@Observable
final class HabitStore {
    var habits: [String] = []
}

struct HabitListView: View {
    @State var store: HabitStore   // wrong: receiver, not owner
    var body: some View {
        List(store.habits, id: \.self) { Text($0) }
    }
}
```

<details><summary>Improved code & reasons</summary>

```swift
import Observation

@Observable
final class HabitStore {
    var habits: [String] = []
}

// Owner (parent):
struct ParentView: View {
    @State private var store = HabitStore()
    var body: some View { HabitListView(store: store) }
}

// Receiver (read-only): plain `let`.
// Receiver (read+write): `@Bindable`.
struct HabitListView: View {
    let store: HabitStore         // read-only
    var body: some View {
        List(store.habits, id: \.self) { Text($0) }
    }
}
```

Reasons:

1. `@State` on a child re-creates the model on every reinitialization — the parent's instance is discarded and the child works with its own copy that the parent can never see.
2. The contract is: **owner uses `@State`, read-only receivers use a plain `let`, read-write receivers use `@Bindable var`.**
3. If `HabitListView` needs to mutate the store (e.g. delete rows), declare `@Bindable var store: HabitStore` and bind via `$store.habits` where required.

Mock 4 written B1 anchor pattern.
</details>

### B13. Share one `@Observable` across siblings

```swift
@Observable
final class Counter { var n = 0 }

struct ChildA: View {
    @State private var counter = Counter()      // own VM
    var body: some View { Button("A: \(counter.n)") { counter.n += 1 } }
}

struct ChildB: View {
    @State private var counter = Counter()      // own VM
    var body: some View { Button("B: \(counter.n)") { counter.n += 1 } }
}

struct ParentView: View {
    var body: some View {
        VStack { ChildA(); ChildB() }
    }
}
```

The two children should share one counter, but they don't. Fix.

<details><summary>Improved code & reasons</summary>

```swift
@Observable
final class Counter { var n = 0 }

struct ChildA: View {
    @Bindable var counter: Counter
    var body: some View { Button("A: \(counter.n)") { counter.n += 1 } }
}

struct ChildB: View {
    @Bindable var counter: Counter
    var body: some View { Button("B: \(counter.n)") { counter.n += 1 } }
}

struct ParentView: View {
    @State private var counter = Counter()
    var body: some View {
        VStack {
            ChildA(counter: counter)
            ChildB(counter: counter)
        }
    }
}
```

Three issues fixed:

1. **Each child owned its own VM** — `@State private var counter = Counter()` in each child created two separate instances. Siblings cannot share state if they don't share a model.
2. **Ownership belonged in the parent** — to share state across siblings, the common ancestor must own it.
3. **Wrong wrapper on the receivers** — the children read AND write to the counter, so they need `@Bindable`. `@State` on a receiver would re-create the model on every re-init and detach it from the parent's instance.

Both children now reference the same `Counter` instance held by the parent. Incrementing in either updates both labels. Mock 4 written B3 anchor pattern.
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

### C2. Login form bound to an `@Observable` view model

Starter:

```swift
import Observation

@Observable
final class LoginVM {
    var email = ""
    var password = ""
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
    @State private var vm = LoginVM()

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

Notes: `@State` on an `@Observable` instance ensures the VM is created exactly once and survives re-renders. `$vm.email` produces a `Binding<String>` straight from the property — `@Observable` makes that projection available without any extra wrapper on read-only fields.

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

### C6. `.sheet` + `@Environment(\.dismiss)` + `@FocusState`

Starter:
```swift
struct AddItemView: View {
    @State private var name = ""
    // TODO: focus state for the text field
    // TODO: dismiss environment
    var onSave: (String) -> Void

    var body: some View {
        // TODO: VStack with TextField (auto-focused on appear),
        //       Save button (disabled when name is empty),
        //       Cancel button (dismisses).
        EmptyView()
    }
}

struct ItemsView: View {
    @State private var items: [String] = []
    @State private var showingAdd = false

    var body: some View {
        // TODO: NavigationStack with a "+" toolbar button that
        //       presents AddItemView in a sheet.
        EmptyView()
    }
}
```

Your task: complete both views so tapping "+" presents a modal sheet, the field auto-focuses, Save appends to `items` and dismisses, Cancel dismisses without saving.

<details><summary>Reference solution</summary>

```swift
struct AddItemView: View {
    @State private var name = ""
    @FocusState private var focused: Bool
    @Environment(\.dismiss) private var dismiss
    var onSave: (String) -> Void

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading) {
                TextField("Name", text: $name)
                    .textFieldStyle(.roundedBorder)
                    .focused($focused)
                    .onAppear { focused = true }
                Spacer()
            }
            .padding()
            .navigationTitle("New Item")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        onSave(name)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}

struct ItemsView: View {
    @State private var items: [String] = []
    @State private var showingAdd = false

    var body: some View {
        NavigationStack {
            List(items, id: \.self) { Text($0) }
                .navigationTitle("Items")
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button { showingAdd = true } label: {
                            Image(systemName: "plus")
                        }
                    }
                }
                .sheet(isPresented: $showingAdd) {
                    AddItemView { name in
                        items.append(name)
                    }
                }
        }
    }
}
```

Key points:

- `@Environment(\.dismiss)` gives the sheet a way to close itself, regardless of who presented it.
- `@FocusState` + `.focused($focused)` + `.onAppear { focused = true }` is the canonical auto-focus pattern. The keyboard slides up the moment the sheet appears.
- The parent passes `onSave` as a closure rather than a binding — the child does not need to know how the parent stores the data.
- Disabling Save when `name.isEmpty` is the equivalent of validation in the closed-book setting; mocks frequently grade this.

Mirror of Mock 1 / Mock 4 / Mock 5 practical Add-flow tasks.
</details>

