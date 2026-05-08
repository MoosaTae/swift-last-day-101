# State Management & User Interaction (SwiftUI)

Final exam prep — Class 3 (Interactions) + Class 10 (MVVM/Observation) + HW4-6.

## 1. Mental model

```
Action  --update-->  State  --re-render-->  View
(tap, edit)         (@State)              (body recomputed)
```

- View is a `struct` (value type). Cannot mutate stored properties directly.
- Mutable state must be wrapped (`@State`, `@Binding`, etc.).
- When state changes, SwiftUI re-invokes `body`.
- Constants in a View use `let` (no wrapper).

## 2. Property Wrappers

### Modern (iOS 17+, Observation framework)

| Wrapper        | Owns?      | Where                          | Use for                                 |
|----------------|------------|--------------------------------|-----------------------------------------|
| `@State`       | Yes (View) | inside View struct             | Local mutable value (and `@Observable` model owned by the View) |
| `@Binding`     | No (proxy) | inside child View struct       | Read/write parent's `@State`            |
| `@Observable`  | —          | macro on `class` (model)       | Reference-type model (iOS 17+)          |
| `@Bindable`    | No         | inside View, on `@Observable`  | Bindings to model properties from a child |
| `@Environment` | No         | inside View                    | Read system values (`\.dismiss`, `\.colorScheme`) **or** an `@Observable` injected via `.environment(model)` |
| `@FocusState`  | Yes (View) | inside View struct             | Track which TextField is focused        |

### Legacy (still works, exam may show either)

| Wrapper             | Owns?      | Where                       | Use for                                                 |
|---------------------|------------|-----------------------------|---------------------------------------------------------|
| `@StateObject`      | Yes (View) | inside View **that creates** the model | Owns an `ObservableObject` lifecycle — created once even on re-render |
| `@ObservedObject`   | No         | inside child View **that receives** | Subscribes to an existing `ObservableObject` passed in  |
| `@EnvironmentObject`| No         | inside View                 | Pull `ObservableObject` injected via `.environmentObject(...)` |

**Creator vs receiver rule (legacy):** the View that *creates* the model uses `@StateObject` (so it survives re-renders); any child that just *uses* the model uses `@ObservedObject` or `@EnvironmentObject`. Swap them and you either rebuild the model on every render (`@ObservedObject` on creator) or crash on missing env (wrong injection).

- `@State` should be `private`, always `var`, always initialized.
- Pass binding with `$value`.

## 3. `@State` — local state

```swift
struct CounterView: View {
    @State private var count = 0
    var body: some View {
        VStack {
            Text("Count: \(count)")
            Button("Increment") { count += 1 }
            Button("Reset")     { count = 0 }
        }
    }
}
```

## 4. `@Binding` — child mutates parent's state

```swift
struct ParentView: View {
    @State private var isOn = false
    var body: some View {
        VStack {
            Text(isOn ? "ON" : "OFF")
            ToggleRow(isOn: $isOn)
        }
    }
}

struct ToggleRow: View {
    @Binding var isOn: Bool
    var body: some View { Toggle("Power", isOn: $isOn) }
}
```

Mistakes: forgetting `$`; using `@State` in child instead of `@Binding`; default value on `@Binding`.

## 5. TextField + binding

```swift
struct GreetingView: View {
    @State private var name = ""
    var body: some View {
        VStack {
            TextField("Your name", text: $name)
                .textFieldStyle(.roundedBorder)
                .onSubmit { print("submitted: \(name)") }
            Text("Hello, \(name.isEmpty ? "stranger" : name)!")
        }
    }
}
```

## 6. Common widgets

```swift
@State private var flavor = "Original"
@State private var on     = false
@State private var sweet  = 50.0
@State private var qty    = 1

Toggle("Cherry", isOn: $on)
Slider(value: $sweet, in: 0...100)
Stepper("Qty: \(qty)", value: $qty, in: 0...10)
Picker("Flavor", selection: $flavor) {
    ForEach(["Original","Chocolate","Strawberry"], id: \.self) { Text($0) }
}.pickerStyle(.menu)

.onAppear { }
.onChange(of: flavor) { old, new in }
.onSubmit { }
```

## 7. `@Observable` (iOS 17+, MVVM)

```swift
import Observation
import SwiftUI

@Observable
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
    @State private var store = TodoStore()
    var body: some View {
        VStack {
            HStack {
                TextField("New todo", text: $store.draft)
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

Child receives existing model:

```swift
struct DraftField: View {
    @Bindable var store: TodoStore
    var body: some View { TextField("New", text: $store.draft) }
}
```

MVVM: View -> ViewModel -> Model. Model = plain types; ViewModel = `@Observable class` with state + intents; View renders + calls intents.

### `@Observable` vs legacy `ObservableObject` (both on the exam)

Two equivalent stacks for "external reference-type model with auto re-render":

| | Modern (iOS 17+) | Legacy (still works) |
|---|---|---|
| Model annotation | `@Observable final class VM { var x = 0 }` | `final class VM: ObservableObject { @Published var x = 0 }` |
| Creator owns it via | `@State private var vm = VM()` | `@StateObject private var vm = VM()` |
| Receiver (child) | `@Bindable var vm: VM` (or just `var vm: VM`) | `@ObservedObject var vm: VM` |
| Injection | `.environment(vm)` + `@Environment(VM.self) var vm` | `.environmentObject(vm)` + `@EnvironmentObject var vm: VM` |
| Re-render trigger | any `var` read in `body` | only `@Published` properties |
| Main actor | not required (use `@MainActor` if you do `Task` work) | mark VM `@MainActor` if it mutates `@Published` from async |

**Topic 05's `WeatherVM` uses the legacy stack** (`ObservableObject` + `@Published` + `@MainActor`). If the exam hands you legacy code, don't "fix" it to `@Observable` — answer in the same paradigm it came in.

## 8. `@State` vs `@Observable`

- View-local UI flag (sheet shown, draft text, tab index) -> `@State`.
- Multi-property domain data with logic -> `@Observable` class.
- Inject same instance into many views -> `@Observable` + pass directly or `@Environment`.

## 9. Counter

```swift
struct Counter: View {
    @State private var n = 0
    var body: some View {
        VStack {
            Text("\(n)").font(.largeTitle)
            HStack {
                Button("-") { n -= 1 }
                Button("+") { n += 1 }
            }.buttonStyle(.borderedProminent)
        }
    }
}
```

## 10. Parent-Child Binding (Numpad from slides)

```swift
struct ContentView: View {
    @State private var selectedNo = 0
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
    var value: Int
    @Binding var selectedNo: Int
    var body: some View {
        Button("\(value)") { selectedNo = value }
    }
}
```

## 11. Form with validation

```swift
struct SignUp: View {
    @State private var email = ""
    @State private var pwd   = ""
    var isValid: Bool { email.contains("@") && pwd.count >= 6 }
    var body: some View {
        Form {
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
            SecureField("Password", text: $pwd)
            Button("Sign up") { }
                .disabled(!isValid)
        }
    }
}
```

## 11.5 Alert, dismiss, environment, focus

### `.alert` (boolean trigger + optional value)

```swift
struct DeleteRow: View {
    @State private var showAlert = false
    var body: some View {
        Button("Delete") { showAlert = true }
            .alert("Delete this item?", isPresented: $showAlert) {
                Button("Delete", role: .destructive) { /* delete */ }
                Button("Cancel", role: .cancel) { }
            } message: {
                Text("This cannot be undone.")
            }
    }
}
```

### Dismiss the current sheet/screen

```swift
struct EditView: View {
    @Environment(\.dismiss) private var dismiss
    var body: some View { Button("Done") { dismiss() } }
}
```

### Environment injection (`@Observable` model shared across screens)

```swift
@Observable final class AppModel { var user = "guest" }

@main struct App: SwiftUI.App {
    @State private var model = AppModel()
    var body: some Scene { WindowGroup { RootView().environment(model) } }
}

struct DeepChild: View {
    @Environment(AppModel.self) private var model       // pull
    var body: some View { Text(model.user) }
}
```

Legacy form: `.environmentObject(model)` + `@EnvironmentObject var model: AppModel` — used with `ObservableObject`.

**Pitfall:** missing `.environment(...)` injection at the root crashes the child at runtime ("No Observable object of type X found").

### `@FocusState` — control which TextField is focused

```swift
struct LoginForm: View {
    @State private var email = ""
    @State private var pwd   = ""
    @FocusState private var focus: Field?
    enum Field { case email, pwd }
    var body: some View {
        VStack {
            TextField("Email", text: $email).focused($focus, equals: .email)
            SecureField("Pwd", text: $pwd).focused($focus, equals: .pwd)
            Button("Next") { focus = .pwd }                 // programmatic focus
            Button("Done") { focus = nil }                  // dismiss keyboard
        }
        .onSubmit { focus = (focus == .email) ? .pwd : nil }
    }
}
```

Bool form: `@FocusState private var isFocused: Bool` + `.focused($isFocused)`.

## 12. @Observable list (HW6 matching-game)

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

## 13. Output-Prediction Gotchas

1. State default `= 0` runs once. The View struct may be recreated many times, but `@State` storage survives. `print` inside struct `init` fires repeatedly; value is NOT reset.
2. Mutating non-wrapped `var` from `body` -> compile error.
3. `let isOn = false; Toggle(...isOn: $isOn)` -> error: `$` needs a wrapper.
4. Missing `$` on `TextField(text:)`/`Toggle(isOn:)` -> type error.
5. State change recomputes the whole `body`; children re-render only if inputs differ. No side effects in `body`.
6. Tap order: action body runs first (`tap 1`), then re-render (`render 1`).
7. Multiple `@State` are independent.
8. iOS 17 `onChange(of:) { old, new in }`; old single-arg deprecated.
9. Mutating state from background thread is undefined; use `MainActor`.
10. `@Binding` in `#Preview` -> `.constant(value)`.
11. `@State` on a plain class (no `@Observable`) does NOT trigger re-render.
12. `Picker` tag type must exactly match selection type; mismatch -> selection silently broken.

## 14. Drill checklist

- Who owns the state? Which view re-renders on tap?
- Refactor `@State` -> `@Observable` class.
- Spot missing `$`, missing `private`, missing `@State`.
- Predict prints from sequenced taps.
- Add TextField bound to existing model (`@Bindable` / `$store.x`).
- Parent->child via `@Binding`; child writes back.
- Computed `isValid` + `.disabled(!isValid)`.
