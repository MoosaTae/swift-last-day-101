# 03 - State Management and User Interaction (SwiftUI)

> Tutorial companion to the cheat sheet. Read this once for understanding, then drill the cheat sheet for speed.

---

## Mental Model: Views Are Functions of State

> **Priority:** SKIM — useful framing but not asked verbatim.

SwiftUI flips the imperative UI model on its head. You do not "update the label when the button is tapped". You **declare what the UI looks like for any given state**, and SwiftUI re-runs that declaration whenever state changes.

```
Action  --writes-->  State  --triggers-->  body recompute  -->  new View tree
(tap)               (@State)              (SwiftUI runs it)     (diffed, drawn)
```

Two consequences flow from this:

1. **Views are `struct`s (value types).** They get created, copied, and thrown away constantly. A view instance from one frame is not the same as the one from the next frame.
2. **Stored properties of a struct cannot be mutated from a method on the struct** (and `body` is effectively such a method). So where does mutable state live?

That is the entire reason property wrappers exist. `@State`, `@Binding`, `@Observable`, etc. are SwiftUI's way of moving mutable storage **outside** the struct (into a hidden box that survives re-creation), while letting your code read and write it through a normal-looking property.

### The single source of truth principle

Each piece of state should have **exactly one owner**. Every other view that needs to read or write that state gets a *reference* to it (`@Binding`, `@Bindable`, `@Environment`), never a copy. Two `@State` variables holding the same logical value is a bug — they will drift apart.

The whole decision matrix below is essentially: "given who owns this state and where it lives, which wrapper expresses that?"

---

## 1. Decision Matrix — Which Wrapper, When

> **Priority:** DRILL — picking the right wrapper is core practical-exam reflex.

| I want to...                                                  | Use                                  |
| ------------------------------------------------------------- | ------------------------------------ |
| Own a simple value (Bool, Int, String, struct) in this view   | `@State private var x = ...`         |
| Let a child view read AND write a parent's `@State`           | parent: `$x`, child: `@Binding var x`|
| Own a reference-type model (class) for this view's lifetime   | `@State private var m = Model()` (iOS 17+ with `@Observable`) |
| Receive an existing `@Observable` model from a parent         | `@Bindable var m: Model`             |
| Receive an `@Observable` model without needing `$`-bindings   | plain `var m: Model` (just observe)  |
| Inject a model deep into a subtree without prop drilling      | iOS 17+: `.environment(model)` + `@Environment(Model.self)` |
| Read a system value (color scheme, dismiss action, locale)    | `@Environment(\.keyPath)`            |
| Persist a small value across launches                         | `@AppStorage("key")` (see topic 05)  |
| Track which TextField is focused                              | `@FocusState`                        |

### Pre-iOS-17 wrappers (legacy, but still on slides)

| Old wrapper              | iOS 17+ replacement                          |
| ------------------------ | -------------------------------------------- |
| `class M: ObservableObject` + `@Published var x` | `@Observable final class M { var x }` |
| `@StateObject var m = M()`                       | `@State private var m = M()`          |
| `@ObservedObject var m: M`                       | `@Bindable var m: M` (or plain `var m: M`) |
| `@EnvironmentObject var m: M`                    | `@Environment(M.self) private var m`  |

If a question hands you `ObservableObject`/`@Published`, treat it as the legacy form of the same idea.

---

## 2. `@State` — Local Value-Type State

> **Priority:** DRILL — `@State` rules and `private` convention asked verbatim.

### Why this exists

Your view is a struct. Structs cannot mutate themselves from a method. But a counter view *needs* a mutable count. `@State` solves this by storing the value **outside the struct**, in storage that SwiftUI manages and that survives across the many re-creations of the view struct.

```
            view struct (recreated every render)
            +-----------------------+
            |  @State var count     |---+
            +-----------------------+   |
                                        | reads/writes via wrapper
                                        v
            +------------------------------+
            |  hidden persistent storage   |   <- survives re-renders
            |  managed by SwiftUI          |
            +------------------------------+
```

### Why `let` properties don't work for mutable UI state

```swift
struct Counter: View {
    let count = 0                       // immutable, can never change
    var body: some View {
        Button("inc") { count += 1 }    // ERROR: can't mutate let
    }
}
```

Even `var count = 0` (without the wrapper) fails — `body` is a getter on a value type and cannot mutate stored properties. `@State` redirects the storage to outside the struct, where mutation is legal.

### Annotated example

```swift
struct CounterView: View {
    @State private var count = 0       // private: only this view should write it
                                       // var:    @State is always var
                                       // = 0:    must initialize at declaration
    var body: some View {
        VStack {
            Text("Count: \(count)")    // read -> SwiftUI tracks dependency
            Button("Increment") {
                count += 1             // write -> triggers body recompute
            }
            Button("Reset") { count = 0 }
        }
    }
}
```

### Three rules for `@State`

1. **Always `private`.** Nobody outside this view should write it directly. Outsiders get bindings or call methods.
2. **Always `var`.** Wrapper holds a value that changes; `let` would defeat the purpose.
3. **Always initialized.** SwiftUI uses the initial value the *first* time the view appears; subsequent re-creations of the struct ignore the initializer because storage already exists.

---

## 3. `@Binding` — Pass Write-Access to a Child

> **Priority:** DRILL — `$` prefix and parent->child flow asked every year.

### Why this exists

A child view often needs to mutate a piece of state owned by its parent (e.g. a row toggle that flips a parent's `Bool`). Copying the value into the child via a normal `var` wouldn't work — the child would mutate its own copy and the parent would never see the change. `@Binding` is a **two-way reference** to someone else's `@State`.

### The `$` prefix

Every property wrapper has a "projected value" accessed via `$`. For `@State`, the projected value is a `Binding` to the underlying storage. Passing `$count` to a child gives the child read+write access, not a copy.

```
PARENT                                   CHILD
+--------------------+                   +--------------------+
| @State var isOn    |--owns-->[Bool]<--| @Binding var isOn  |
|                    |   storage   ^    |                    |
| ToggleRow(isOn:    |             |    | reads & writes the |
|   $isOn)           |             |    | parent's storage   |
+--------------------+             |    +--------------------+
        |                          |
        +---- $isOn (projected) ---+
              "two-way reference"
```

### Annotated parent + child

```swift
struct ParentView: View {
    @State private var isOn = false        // parent OWNS this storage
    var body: some View {
        VStack {
            Text(isOn ? "ON" : "OFF")      // re-renders when isOn flips
            ToggleRow(isOn: $isOn)         // $isOn = Binding<Bool>, NOT Bool
        }
    }
}

struct ToggleRow: View {
    @Binding var isOn: Bool                // proxy: no storage of its own
                                           // no default value allowed here
    var body: some View {
        Toggle("Power", isOn: $isOn)       // forwards binding into Toggle
    }
}
```

### Numpad pattern (from class slides)

```swift
struct ContentView: View {
    @State private var selectedNo = 0       // parent owns the selection
    var body: some View {
        VStack {
            Text("Selected: \(selectedNo)")
            HStack {
                Numpad(value: 7, selectedNo: $selectedNo)
                Numpad(value: 8, selectedNo: $selectedNo)
                Numpad(value: 9, selectedNo: $selectedNo)
            }
        }
    }
}

struct Numpad: View {
    var value: Int                          // plain value (read-only input)
    @Binding var selectedNo: Int            // write-back channel to parent
    var body: some View {
        Button("\(value)") { selectedNo = value }  // mutates parent's @State
    }
}
```

### Common `@Binding` mistakes

- Forgetting `$` at the call site: `ToggleRow(isOn: isOn)` — type error, passes `Bool` not `Binding<Bool>`.
- Using `@State` in the child instead of `@Binding`: child gets its own independent copy, parent never sees writes.
- Putting a default value on `@Binding`: not allowed — a binding must reference *somebody's* storage.
- In `#Preview`, a child needing `@Binding` won't have a parent — use `.constant(value)`:
  ```swift
  #Preview { ToggleRow(isOn: .constant(true)) }
  ```

---

## 4. `@StateObject` vs `@ObservedObject` (legacy) -> `@State` vs plain `var` (iOS 17+)

> **Priority:** SKIP — legacy detail, `@Observable` covers it cleanly now.

### Why getting this wrong destroys data

A view struct is recreated on every render. Its properties get re-initialized. If you write `@ObservedObject var store = Store()` (or in modern code, plain `var store = Store()`), then **every re-render builds a fresh `Store`** and your data vanishes the moment a parent re-renders.

`@StateObject` (legacy) and `@State` on an `@Observable` (modern) tell SwiftUI: "make this object exactly once, when the view first appears, and keep it across re-creations of the struct." That's lifecycle ownership.

```
WRONG (ObservedObject as creator)         RIGHT (StateObject / @State creates once)

render 1: var store = Store()  [A]        render 1: @State store = Store()  [A]
render 2: var store = Store()  [B]        render 2: same struct -> still [A]
render 3: var store = Store()  [C]        render 3: still [A]
```

### Rule of thumb

- The view that **creates** the model -> `@StateObject` (legacy) or `@State` (modern, `@Observable`).
- A view that **receives** an already-created model from elsewhere -> `@ObservedObject` (legacy), `@Bindable` or plain `var` (modern).

### Modern (iOS 17+) example

```swift
@Observable
final class Store { var count = 0 }

struct Owner: View {
    @State private var store = Store()       // CREATES -> use @State
    var body: some View { Child(store: store) }
}

struct Child: View {
    var store: Store                         // RECEIVES -> plain var is fine
    var body: some View { Text("\(store.count)") }
}
```

### Legacy form (slides may show this)

```swift
final class Store: ObservableObject {
    @Published var count = 0
}

struct Owner: View {
    @StateObject  private var store = Store()    // creator
    var body: some View { Child(store: store) }
}

struct Child: View {
    @ObservedObject var store: Store             // receiver
    var body: some View { Text("\(store.count)") }
}
```

---

## 5. `@EnvironmentObject` / `@Environment` — Skip the Prop Drill

> **Priority:** SKIM — environment values appear briefly, not deeply tested.

### Why this exists

Imagine a model needed by ten descendant views. Threading it through every intermediate `View(model: model)` constructor is "prop drilling" — tedious and noisy. The environment is a hidden dictionary attached to the view tree; any descendant can pull a value out by type or key.

Use environment when:

- The same model is used in many widely-separated views.
- Intermediate views don't care about the model and shouldn't have to forward it.

Stick to `@Binding` / direct passing when the value only crosses one or two view boundaries. Environment is the heavier hammer.

### Modern form (iOS 17+, `@Observable`)

```swift
@Observable final class AuthStore { var user: String? = nil }

@main
struct App: SwiftUI.App {
    @State private var auth = AuthStore()       // owner at the top
    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(auth)              // inject by type into env
        }
    }
}

struct DeepChild: View {
    @Environment(AuthStore.self) private var auth   // pull out by type
    var body: some View { Text(auth.user ?? "guest") }
}
```

### Legacy form (`ObservableObject` + `@EnvironmentObject`)

```swift
final class AuthStore: ObservableObject {
    @Published var user: String? = nil
}

// inject:  RootView().environmentObject(AuthStore())
// consume: @EnvironmentObject var auth: AuthStore
```

### `@Environment` (lowercase) for system values

`@Environment` (without the "Object") reads built-in system values via key paths — color scheme, locale, dismiss action, scene phase, etc.

```swift
struct Sheet: View {
    @Environment(\.dismiss)     private var dismiss
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack {
            Text(scheme == .dark ? "Dark" : "Light")
            Button("Close") { dismiss() }
        }
    }
}
```

---

## 6. `@Observable` Macro (iOS 17+) — Modern Replacement

> **Priority:** DRILL — modern replacement for ObservableObject, expected on practical.

### Why the macro exists

Pre-iOS 17, you wrote `class Foo: ObservableObject { @Published var x = 0 }` and SwiftUI re-rendered any view that observed `Foo` whenever **any** `@Published` changed. That was coarse — a view reading only `foo.x` would re-render when `foo.y` changed.

`@Observable` (powered by Swift's macro system + the `Observation` framework) does property-level dependency tracking automatically. You write a plain class with plain `var`s, and SwiftUI only re-renders views that actually read the specific property that changed.

### The whole pattern

```swift
import Observation
import SwiftUI

@Observable                                // <- one annotation does everything
final class TodoStore {
    var items: [String] = []
    var draft: String = ""

    func add() {
        let t = draft.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { return }
        items.append(t); draft = ""
    }
    func remove(at offsets: IndexSet) { items.remove(atOffsets: offsets) }
}

struct TodoView: View {
    @State private var store = TodoStore()    // owner -> @State
    var body: some View {
        VStack {
            HStack {
                TextField("New todo", text: $store.draft)   // $ via @Bindable-ish projection
                Button("Add") { store.add() }
            }
            List {
                ForEach(store.items, id: \.self) { Text($0) }
                    .onDelete(perform: store.remove)
            }
        }
    }
}
```

### `@Bindable` for child views needing `$store.x`

A child that *receives* an `@Observable` model and needs to make bindings into it (e.g. for a `TextField`) uses `@Bindable`:

```swift
struct DraftField: View {
    @Bindable var store: TodoStore           // unlocks $store.draft syntax
    var body: some View { TextField("New", text: $store.draft) }
}
```

A child that only **reads** can use plain `var store: TodoStore` — no wrapper needed.

### MVVM in one line

`View -> ViewModel -> Model`. The View renders + dispatches user intents. The ViewModel is an `@Observable class` that holds state and exposes intent methods. The Model is the plain data type (struct) the ViewModel manipulates.

### `@State` vs `@Observable` — picking lane

| Situation                                           | Choice                  |
| --------------------------------------------------- | ----------------------- |
| Local UI flag (sheet shown, draft text, tab index)  | `@State`                |
| Single value owned by one view                      | `@State`                |
| Multi-property domain object with logic / methods   | `@Observable` class     |
| Same instance shared across many views              | `@Observable` + inject  |

---

## 7. User Interaction — Widgets Each in Minimum Useful Form

> **Priority:** DRILL — Button/TextField/Toggle/Slider/Picker minimum forms practical-essential.

Every interactive widget in SwiftUI either takes an action closure (Button, onTapGesture) or a `Binding` (TextField, Toggle, Slider, Picker). The pattern is identical; only the widget changes.

### Button

```swift
Button("Save") { save() }                              // label + action
Button(action: save) { Image(systemName: "tray") }     // custom label view
Button("Submit") { submit() }
    .buttonStyle(.borderedProminent)
    .disabled(name.isEmpty)                            // computed condition
```

### .onTapGesture — make any view tappable

```swift
Image(systemName: "heart")
    .onTapGesture { liked.toggle() }                   // any View can take this
```

Use `Button` when you have a labeled action; use `.onTapGesture` for custom shapes/images where a button frame isn't appropriate.

### TextField + binding

```swift
struct GreetingView: View {
    @State private var name = ""
    var body: some View {
        VStack {
            TextField("Your name", text: $name)        // $name = Binding<String>
                .textFieldStyle(.roundedBorder)
                .onSubmit { print("submitted: \(name)") }
            Text("Hello, \(name.isEmpty ? "stranger" : name)!")
        }
    }
}
```

`SecureField` is the same API for passwords.

### Toggle, Slider, Stepper, Picker

```swift
@State private var on    = false
@State private var sweet = 50.0
@State private var qty   = 1
@State private var flavor = "Original"

Toggle("Cherry", isOn: $on)
Slider(value: $sweet, in: 0...100)
Stepper("Qty: \(qty)", value: $qty, in: 0...10)
Picker("Flavor", selection: $flavor) {
    ForEach(["Original", "Chocolate", "Strawberry"], id: \.self) { Text($0) }
}
.pickerStyle(.menu)
```

The Picker's `tag` type must match the `selection` type **exactly**. Mismatch -> the picker silently fails to update.

### Lifecycle / value-change hooks

```swift
.onAppear { /* runs when view enters hierarchy */ }
.onDisappear { /* runs when leaving */ }
.onChange(of: flavor) { old, new in                 // iOS 17 two-arg form
    print("changed from \(old) to \(new)")
}
.onSubmit { /* TextField submit */ }
```

The single-argument `.onChange(of:) { newValue in ... }` form is **deprecated in iOS 17**; the exam expects the two-argument `(old, new)` closure.

### Alert

```swift
struct DeleteView: View {
    @State private var showAlert = false
    var body: some View {
        Button("Delete") { showAlert = true }
            .alert("Are you sure?", isPresented: $showAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) { performDelete() }
            } message: {
                Text("This cannot be undone.")
            }
    }
}
```

The pattern: a `@State Bool` controls visibility; SwiftUI flips it back to `false` when dismissed.

### FocusState — controlling keyboard focus

```swift
struct LoginView: View {
    @State private var email = ""
    @State private var pwd   = ""
    @FocusState private var focus: Field?           // enum tracks which field
    enum Field { case email, password }

    var body: some View {
        Form {
            TextField("Email", text: $email).focused($focus, equals: .email)
            SecureField("Password", text: $pwd).focused($focus, equals: .password)
            Button("Next") { focus = .password }    // programmatic focus
        }
        .onAppear { focus = .email }
    }
}
```

### Form with validation (computed property)

```swift
struct SignUp: View {
    @State private var email = ""
    @State private var pwd   = ""
    var isValid: Bool { email.contains("@") && pwd.count >= 6 }   // recomputed each render
    var body: some View {
        Form {
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
            SecureField("Password", text: $pwd)
            Button("Sign up") { }
                .disabled(!isValid)                  // declarative gating
        }
    }
}
```

### Larger example — `@Observable` matching game (HW6 shape)

```swift
@Observable
final class Game {
    struct Card: Identifiable { let id = UUID(); var face: String; var up = false }
    var cards: [Card] = []
    func reset(_ faces: [String]) {
        cards = (faces + faces).shuffled().map { Card(face: $0) }
    }
    func flip(_ id: UUID) {
        guard let i = cards.firstIndex(where: { $0.id == id }) else { return }
        cards[i].up.toggle()
    }
}

struct GameView: View {
    @State private var game = Game()
    var body: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 60))]) {
            ForEach(game.cards) { c in
                Text(c.up ? c.face : "?")
                    .frame(width: 60, height: 80)
                    .background(c.up ? .green : .red)
                    .onTapGesture { game.flip(c.id) }
            }
        }
        .onAppear { game.reset(["A","B","C","D"]) }
    }
}
```

---

## 8. Common Pitfalls — Why Each Trips Students

> **Priority:** DRILL — graders specifically hunt these in code-improvement.

| Pitfall                                                       | Why it traps                                                                                |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `@State var x = 0` *without* `private`                        | Compiles, but encourages outside writes; convention says `@State` is always private.        |
| `print` inside `init` of a View struct firing many times      | The struct is rebuilt constantly. `@State` storage survives, but the struct is ephemeral.   |
| Mutating a non-wrapped `var` from `body`                      | Compile error — `body` is a getter on a value type. Wrap the property.                      |
| `let isOn = false; Toggle("x", isOn: $isOn)`                  | `$` only exists on property wrappers. Plain `let` has no projected value.                   |
| Forgetting `$` on `TextField(text:)` / `Toggle(isOn:)`        | Type error: function expects `Binding<T>`, you passed `T`.                                  |
| Putting side effects in `body`                                | `body` runs unpredictably often. Network/print/timers there fire too many times.            |
| Tap order confusion                                           | Action closure runs first, **then** SwiftUI re-runs `body`. So `print` in tap precedes render. |
| Multiple `@State` properties are independent                  | Mutating one does not re-init others; each has its own storage slot.                        |
| `onChange(of:) { newValue in ... }` (single-arg)              | Deprecated in iOS 17. Use `(old, new) in ...`.                                              |
| Mutating state from a background thread                       | UI must be touched on the main thread. Use `@MainActor`, `Task { @MainActor in ... }`, or `await MainActor.run`. |
| `@Binding` in `#Preview` with no parent                       | Use `.constant(true)` to fabricate a binding for previews.                                  |
| `@State` on a plain class (not `@Observable`)                 | Reference identity is preserved, but SwiftUI sees no property changes -> no re-render.      |
| `Picker` tag type doesn't match selection type                | Silent: picker just won't update the selection; no compile error.                           |
| Using `@ObservedObject` (or plain `var`) for object you create| The object is rebuilt on every render -> data loss. Use `@StateObject` / `@State`.          |
| `@EnvironmentObject` / `@Environment(Type.self)` not injected | Runtime crash on first access. The compiler can't verify injection.                         |

---

## 9. The Drill Checklist (the night before)

> **Priority:** DRILL — literally the night-before checklist; do it.

Read each, recall the answer in your head:

- Who **owns** the state? Which view re-renders when it changes?
- Refactor a `@State`-heavy view into a `@Observable` class + `@State var model`.
- Spot the missing `$`, missing `private`, missing `@State`.
- Predict prints from a sequence of taps (action closure runs, then body re-renders).
- Add a `TextField` bound to an existing `@Observable` model (`@Bindable` + `$store.field`).
- Wire parent->child via `@Binding`; child writes back.
- Computed `var isValid: Bool` + `.disabled(!isValid)` for form gating.
- `.onChange(of:) { old, new in }` two-arg form.

---

## 10. Quick Recall Card

> **Priority:** DRILL — last-minute syntax dump.

```swift
// --- Local state ---
@State private var count = 0           // own a value; private, var, initialized

// --- Pass write-access down ---
ChildView(value: $count)               // parent passes binding
struct ChildView: View {
    @Binding var value: Int            // child receives proxy
}

// --- Preview a binding-only view ---
#Preview { ChildView(value: .constant(0)) }

// --- @Observable model (iOS 17+) ---
@Observable final class Store {
    var x = 0
    func bump() { x += 1 }
}
struct Owner: View {
    @State private var store = Store()         // creator
    var body: some View { Child(store: store) }
}
struct Child: View {
    @Bindable var store: Store                 // needs $store.x
    var body: some View { TextField("x", value: $store.x, format: .number) }
}

// --- Environment injection (iOS 17+) ---
RootView().environment(store)
@Environment(Store.self) private var store

// --- System environment values ---
@Environment(\.dismiss)     private var dismiss
@Environment(\.colorScheme) private var scheme

// --- Legacy (slides may use) ---
final class M: ObservableObject { @Published var x = 0 }
@StateObject    private var m = M()        // creator
@ObservedObject var m: M                   // receiver
@EnvironmentObject var m: M                // env receiver
RootView().environmentObject(M())          // env injector

// --- Widgets ---
Button("Tap") { action() }
Image(systemName: "x").onTapGesture { }
TextField("Name", text: $name).onSubmit { }
SecureField("Pwd", text: $pwd)
Toggle("On",   isOn: $on)
Slider(value: $sweet, in: 0...100)
Stepper("Q: \(qty)", value: $qty, in: 0...10)
Picker("F", selection: $flavor) {
    ForEach(options, id: \.self) { Text($0) }
}.pickerStyle(.menu)

// --- Lifecycle / change ---
.onAppear { }
.onDisappear { }
.onChange(of: flavor) { old, new in }    // iOS 17 two-arg form
.onSubmit { }

// --- Alert ---
.alert("Title", isPresented: $showAlert) {
    Button("Cancel", role: .cancel) { }
    Button("OK", role: .destructive) { confirm() }
} message: { Text("Body") }

// --- FocusState ---
@FocusState private var focus: Field?
TextField("x", text: $x).focused($focus, equals: .x)

// --- Validation gating ---
var isValid: Bool { !name.isEmpty }
Button("Go") { }.disabled(!isValid)
```

### One-sentence recalls

- Why does `@State` exist? Views are structs and can't mutate themselves; `@State` moves storage outside the struct so it survives re-creation.
- Why `$x`? It is the projected value of the wrapper, a `Binding<T>` that points back at the wrapper's storage.
- Why `@StateObject` / `@State` for the creator and `@ObservedObject` / plain `var` for the receiver? The creator-marker tells SwiftUI to instantiate once and persist; without it, every re-render builds a new model.
- Why `@Observable`? Property-level dependency tracking: only views that read the changed property re-render.
- Why `.constant(_)` in previews? `@Binding` requires a real backing store; `.constant` fakes one.

If those five answers come automatically, the State Management section of the exam will be fast.
