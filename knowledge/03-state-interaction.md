# State Management & User Interaction (SwiftUI)

Final exam prep — Class 3 (Interactions) + Class 10 (MVVM/Observation) + HW4-6.

## 1. Mental model

```text
        ┌────────────┐  tap / edit / focus
        │   Action   │◄──────────────────┐
        └─────┬──────┘                   │
              │ writes                   │
              ▼                          │
   ┌─────────────────────┐               │
   │   State storage     │   (lives outside the struct,
   │   @State / model    │    survives re-creation)
   └─────────┬───────────┘               │
             │ invalidates dependents    │
             ▼                           │
   ┌─────────────────────┐  diff + draw  │
   │  body recomputed    │──────────────►│
   │  (View struct new)  │   pixels      │
   └─────────────────────┘               │
                                          (user sees update,
                                           cycle repeats)
```

- View is a `struct` (value type). Cannot mutate stored properties directly.
- Mutable state must be wrapped (`@State`, `@Binding`, etc.).
- When state changes, SwiftUI re-invokes `body`.
- Constants in a View use `let` (no wrapper).

## 2. Property Wrappers

| Wrapper        | Owns?      | Where                          | Use for                                 |
|----------------|------------|--------------------------------|-----------------------------------------|
| `@State`       | Yes (View) | inside View struct             | Local mutable value (and `@Observable` model owned by the View) |
| `@Binding`     | No (proxy) | inside child View struct       | Read/write parent's `@State`            |
| `@Observable`  | —          | macro on `class` (model)       | Reference-type model (iOS 17+)          |
| `@Bindable`    | No         | inside View, on `@Observable`  | Bindings to model properties from a child |
| `@Environment` | No         | inside View                    | Read system values (`\.dismiss`, `\.colorScheme`) **or** an `@Observable` injected via `.environment(model)` |
| `@FocusState`  | Yes (View) | inside View struct             | Track which TextField is focused        |

```text
   Parent View          Child View          External Storage
   (creator)            (receiver)          (model / system)
       │                    │                      │
@State ●────owns──────────────────────────────────►│ value box
       │                    │                      │
@Binding ─── $x ───────────►● reads & writes ─────►│ same box (proxy)
       │                    │                      │
@Observable ●─ init(model) ►● plain var or          │ class instance
       │                @Bindable for $store.x ────►│ (property-tracked)
       │                    │                      │
@Environment(M.self) ◄───── pulled by type ◄─ .environment(m) at root
       │                    │                      │
@FocusState ●───── $focus ───────► .focused(...)   │ keyboard target
       │                    │                      │
@Environment(\.dismiss) ◄── system value (read-only)
```

**Creator vs receiver rule:** the View that *creates* an `@Observable` model uses `@State` (so the instance survives re-renders); any child that just *uses* the model takes a plain `let`/`var` (read-only) or `@Bindable var` (read-write). Put the wrapper on the wrong side and you either rebuild the model on every render or lose write-back.

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

The contract:

- Model: `@Observable final class VM { var x = 0 }`
- Creator owns it via `@State private var vm = VM()`
- Receiver (child) takes a plain `let`/`var` (read-only) or `@Bindable var vm: VM` (read-write).
- Injection: `.environment(vm)` at the root + `@Environment(VM.self) private var vm` in descendants.
- Re-render trigger: any `var` actually read inside `body` — property-level tracking.

## 8. `@State` vs `@Observable`

| Wrapper | Owner | Direction | Use when |
|---|---|---|---|
| `@State` (value) | this view | owns, read+write locally | UI flag, draft text, counter |
| `@State` (`@Observable`) | this view | owns class instance for life of view | view *creates* the model |
| `@Binding` | parent (proxy) | child reads + writes parent storage | row toggles, numpad button |
| `@Bindable` | upstream | child needs `$store.x` for TextField | child got `@Observable` from parent |
| `@Environment(M.self)` | ancestor | descendant reads injected model | model used across many screens |
| `@Environment(\.key)` | system | read-only system value | `dismiss`, `colorScheme`, `scenePhase` |
| `@FocusState` | this view | owns focus identity | which field has the keyboard |

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

| Severity | Gotcha | What goes wrong |
|---|---|---|
| HIGH | Mutating `@State` inside `body` (no event) | Re-render schedules another mutation → infinite loop / runtime warning |
| HIGH | Re-creating an `@Observable` from a plain `let`/`var` in a parent re-render | Owner isn't `@State` so model is rebuilt → all in-memory state lost |
| HIGH | Passing `value` instead of `$value` to a `@Binding` parameter | Type mismatch or no write-back; child edits don't reach parent |
| HIGH | Reading `@Bindable` without first holding the model in a property | `$store.x` unavailable; TextField binding silently does nothing |
| MED | Mutating `@State` from a closure that captures `self` (struct) by value | Write hits a copy, not the live storage; UI never updates |
| MED | `@Observable` mutated off the main thread | Purple warnings, dropped/late re-renders; wrap in `@MainActor` |
| LOW | `.onChange(of:)` on a value type fires only on whole-value change | Nested struct field edits via `$` may not re-trigger as expected |
| LOW | `@Environment(\.dismiss)` invoked from `init`/`body` | Dismisses immediately on appear; only call from an action closure |

## 14. Drill checklist

- Who owns the state? Which view re-renders on tap?
- Refactor `@State` -> `@Observable` class.
- Spot missing `$`, missing `private`, missing `@State`.
- Predict prints from sequenced taps.
- Add TextField bound to existing model (`@Bindable` / `$store.x`).
- Parent->child via `@Binding`; child writes back.
- Computed `isValid` + `.disabled(!isValid)`.
