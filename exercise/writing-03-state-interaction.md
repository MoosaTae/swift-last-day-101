# Topic 3 -- State & Interaction: Writing Drills

Hands-on counterpart to `exercises-03-state-interaction.md`. You write the code; the
solution block is for grading yourself afterwards. iOS 17+ syntax (two-arg
`onChange`, `@Observable`, `@Bindable`).

Six exercises, easy -> exam-level. Budget per exercise is in the heading.

---

## Ex 1 -- Visibility toggle (~5 min)

Target wireframe (ASCII, monospace):

```
+----------------------------+
|        [ Show ]            |
|                            |
|    Secret message here     |
+----------------------------+
```

Behavior:
- A single button at the top.
- When the button reads `Show`, the message below is hidden. Tapping it flips
  the label to `Hide` and reveals the text `Secret message here`.
- Tapping again hides the text and flips the label back to `Show`.
- Nothing else on screen.

Write this view from a blank `body`. The state ownership is yours to choose;
justify it in your head before peeking.

<details><summary>Solution</summary>

```swift
import SwiftUI

struct VisibilityToggle: View {
    @State private var isShown = false

    var body: some View {
        VStack(spacing: 24) {
            Button(isShown ? "Hide" : "Show") {
                isShown.toggle()
            }
            .buttonStyle(.borderedProminent)

            if isShown {
                Text("Secret message here")
            }
        }
        .padding()
    }
}
```

Why: the flag is private view-local UI, so `@State` is the only correct
ownership. The button label and the conditional `Text` both derive from
`isShown` inside `body` -- never duplicate the truth into a separate stored
property.
</details>

---

## Ex 2 -- Refactor: shopping cart counter (~10 min)

This works in the simulator if you tap slowly and squint, but it is a
graveyard of the smells the written exam grades. List every smell you see,
then rewrite it.

```swift
import SwiftUI

class CartModel {
    var items: [String] = []
    var coupon: String? = nil
}

struct CartScreen: View {
    var cart = CartModel()
    @State var couponInput: String = ""
    var total: Int = 0

    var body: some View {
        VStack {
            Text("Items: \(cart.items.count)")
            Text("Total: \(total)")

            TextField("Coupon", text: .constant(couponInput))

            Button("Add item") {
                cart.items.append("milk")
                total = total + 10
            }

            Button("Apply") {
                cart.coupon = couponInput!
            }
        }
    }
}
```

<details><summary>Solution</summary>

Smells:
- `CartModel` is a plain `class` with no `@Observable` (or `ObservableObject`),
  so SwiftUI never re-renders when `items` mutates.
- `var cart = CartModel()` is unwrapped -- the view does not own the lifetime,
  and nothing observes it. With `@Observable`, this should be `@State private
  var cart = CartModel()`.
- `@State var couponInput` is missing `private`; `@State` is view-internal.
- `var total: Int = 0` is a stored property on a struct view; mutating it from
  a button closure is a compile error (`self is immutable`). It is also
  derivable, so it should be a computed property.
- `TextField("Coupon", text: .constant(couponInput))` uses a read-only
  binding, so the field is frozen.
- `cart.coupon = couponInput!` force-unwraps a non-optional `String`, which
  does not even compile in modern Swift. Even if it did, the intent (treat
  empty as nil) should be expressed safely.
- No `private` on the model property, no `@MainActor` discipline (not strictly
  required here, but the model owns mutable state read by the UI thread).

Rewritten:

```swift
import SwiftUI
import Observation

@Observable
final class CartModel {
    var items: [String] = []
    var coupon: String? = nil

    func addItem(_ name: String, price: Int) {
        items.append(name)
        prices.append(price)
    }

    private(set) var prices: [Int] = []
    var total: Int { prices.reduce(0, +) }

    func apply(_ raw: String) {
        let trimmed = raw.trimmingCharacters(in: .whitespaces)
        coupon = trimmed.isEmpty ? nil : trimmed
    }
}

struct CartScreen: View {
    @State private var cart = CartModel()
    @State private var couponInput: String = ""

    var body: some View {
        VStack(spacing: 12) {
            Text("Items: \(cart.items.count)")
            Text("Total: \(cart.total)")

            TextField("Coupon", text: $couponInput)
                .textFieldStyle(.roundedBorder)

            Button("Add item") {
                cart.addItem("milk", price: 10)
            }

            Button("Apply") {
                cart.apply(couponInput)
            }
            .disabled(couponInput.trimmingCharacters(in: .whitespaces).isEmpty)
        }
        .padding()
    }
}
```
</details>

---

## Ex 3 -- Mini-project: temperature converter with `@Observable` VM (~15 min)

Spec:
- A view model named `TempVM` exposes a `celsiusText: String` (the user types
  here), a `fahrenheit: Double` (read-only output), and a `Bool` flag
  `isValid`.
- `isValid` is `true` iff `celsiusText` parses as a `Double`.
- When `isValid`, `fahrenheit` returns `c * 9/5 + 32`. Otherwise it returns
  `0`.
- A method `reset()` clears the input back to empty string.
- The view shows a `TextField` bound to `celsiusText`, a `Text` showing
  `fahrenheit` to one decimal, and a `Reset` button disabled while the input
  is already empty.

Starter (`ContentView.swift`):

```swift
import SwiftUI
import Observation

@Observable
final class TempVM {
    // TODO
}

struct ContentView: View {
    // TODO
    var body: some View { Text("TODO") }
}
```

Oracle (`Tests.swift`) -- your code is "done" when these pass:

```swift
import XCTest
@testable import App

final class TempVMTests: XCTestCase {
    func test_empty_input_is_invalid() {
        let vm = TempVM()
        XCTAssertEqual(vm.celsiusText, "")
        XCTAssertFalse(vm.isValid)
        XCTAssertEqual(vm.fahrenheit, 0, accuracy: 0.0001)
    }

    func test_valid_input_converts() {
        let vm = TempVM()
        vm.celsiusText = "100"
        XCTAssertTrue(vm.isValid)
        XCTAssertEqual(vm.fahrenheit, 212, accuracy: 0.0001)
    }

    func test_negative_input_converts() {
        let vm = TempVM()
        vm.celsiusText = "-40"
        XCTAssertTrue(vm.isValid)
        XCTAssertEqual(vm.fahrenheit, -40, accuracy: 0.0001)
    }

    func test_garbage_input_is_invalid() {
        let vm = TempVM()
        vm.celsiusText = "abc"
        XCTAssertFalse(vm.isValid)
        XCTAssertEqual(vm.fahrenheit, 0, accuracy: 0.0001)
    }

    func test_reset_clears_input() {
        let vm = TempVM()
        vm.celsiusText = "37"
        vm.reset()
        XCTAssertEqual(vm.celsiusText, "")
        XCTAssertFalse(vm.isValid)
    }
}
```

(Note: practical exam runs unit tests for grading; treat the tests as the
spec.)

<details><summary>Solution</summary>

```swift
import SwiftUI
import Observation

@Observable
final class TempVM {
    var celsiusText: String = ""

    var isValid: Bool { Double(celsiusText) != nil }

    var fahrenheit: Double {
        guard let c = Double(celsiusText) else { return 0 }
        return c * 9 / 5 + 32
    }

    func reset() {
        celsiusText = ""
    }
}

struct ContentView: View {
    @State private var vm = TempVM()

    var body: some View {
        VStack(spacing: 16) {
            TextField("Celsius", text: $vm.celsiusText)
                .textFieldStyle(.roundedBorder)
                .keyboardType(.numbersAndPunctuation)

            Text(vm.isValid
                 ? String(format: "%.1f F", vm.fahrenheit)
                 : "Enter a number")

            Button("Reset") { vm.reset() }
                .disabled(vm.celsiusText.isEmpty)
        }
        .padding()
    }
}
```

Why: `@Observable` + `@State private var vm` lets bindings flow with
`$vm.celsiusText` and the View owns the model's lifetime. Computed
`fahrenheit` and `isValid` keep the truth in one place -- the test suite
exercises them directly without driving the UI.
</details>

---

## Ex 4 -- Wireframe: parent picks color, child shows preview (~15 min)

Target wireframe (ASCII, monospace):

```
+--------------------------------+
|  Pick a color                  |
|  ( ) Red   ( ) Green  ( ) Blue |
|                                |
|  +--------------------------+  |
|  |                          |  |
|  |       PREVIEW BOX        |  |
|  |                          |  |
|  +--------------------------+  |
|                                |
|         [ Reset ]              |
+--------------------------------+
```

Behavior:
- A single segmented `Picker` with three options: `Red`, `Green`, `Blue`.
  Default selection is `Red`.
- Below the picker is a `PreviewBox` child view that takes a `@Binding` to
  the color choice and renders a 200x120 rectangle filled with the matching
  color.
- A `Reset` button (in the parent) sets the choice back to `Red`. It is
  disabled while the choice is already `Red`.
- The child view must not own the choice -- it has to write back through the
  binding. Tapping the picker must update the rectangle.

Write the parent view and the `PreviewBox` child. State ownership: parent
holds the truth; child receives a `@Binding`.

<details><summary>Solution</summary>

```swift
import SwiftUI

enum Choice: String, CaseIterable, Identifiable {
    case red, green, blue
    var id: Self { self }
    var color: Color {
        switch self {
        case .red:   return .red
        case .green: return .green
        case .blue:  return .blue
        }
    }
}

struct ParentView: View {
    @State private var choice: Choice = .red

    var body: some View {
        VStack(spacing: 20) {
            Text("Pick a color").font(.headline)

            Picker("Color", selection: $choice) {
                ForEach(Choice.allCases) { c in
                    Text(c.rawValue.capitalized).tag(c)
                }
            }
            .pickerStyle(.segmented)

            PreviewBox(choice: $choice)

            Button("Reset") { choice = .red }
                .disabled(choice == .red)
        }
        .padding()
    }
}

struct PreviewBox: View {
    @Binding var choice: Choice

    var body: some View {
        RoundedRectangle(cornerRadius: 12)
            .fill(choice.color)
            .frame(width: 200, height: 120)
    }
}

#Preview {
    ParentView()
}
```

Why: parent owns the source of truth (`@State`), the segmented `Picker` writes
through `$choice`, and the child uses `@Binding` so the rectangle re-renders
the moment the parent's value changes. The `Picker` tag type must match the
selection type -- both `Choice` here, otherwise selection silently breaks.
</details>

---

## Ex 5 -- Mini-project: pin lock screen with attempt limit (~20 min)

Spec:
- A `PinVM` view model owns:
  - `entered: String` (digits the user has tapped so far, max length 4).
  - A constant `correct: String = "1234"` (set in the initializer).
  - `attemptsLeft: Int` starting at 3.
  - `state: PinState` enum with cases `.entering`, `.unlocked`, `.locked`.
- Methods:
  - `tap(_ digit: String)`: appends a single digit to `entered` only if state
    is `.entering` and `entered.count < 4`. When `entered.count` reaches 4,
    automatically evaluate: equal -> `.unlocked`, not equal -> decrement
    attempts, clear `entered`, and if `attemptsLeft == 0` move to `.locked`,
    else stay `.entering`.
  - `clear()`: sets `entered` to `""` (only while `.entering`).
- A `PinView` shows the current `entered` (masked as bullets, padded to 4
  slots like `* * * _`), three rows of digit buttons (1-9), a `0`, and a
  `Clear` button.

Starter (`ContentView.swift`):

```swift
import SwiftUI
import Observation

enum PinState { case entering, unlocked, locked }

@Observable
final class PinVM {
    var entered: String = ""
    let correct: String
    var attemptsLeft: Int = 3
    var state: PinState = .entering

    init(correct: String = "1234") {
        self.correct = correct
    }

    func tap(_ digit: String) {
        // TODO
    }

    func clear() {
        // TODO
    }
}

struct ContentView: View {
    var body: some View { Text("TODO") }
}
```

Oracle (`Tests.swift`) -- your code is "done" when these pass:

```swift
import XCTest
@testable import App

final class PinVMTests: XCTestCase {
    func test_initial_state() {
        let vm = PinVM()
        XCTAssertEqual(vm.entered, "")
        XCTAssertEqual(vm.attemptsLeft, 3)
        XCTAssertEqual(vm.state, .entering)
    }

    func test_correct_pin_unlocks() {
        let vm = PinVM(correct: "1234")
        for d in ["1","2","3","4"] { vm.tap(d) }
        XCTAssertEqual(vm.state, .unlocked)
        XCTAssertEqual(vm.attemptsLeft, 3)
    }

    func test_wrong_pin_clears_and_decrements() {
        let vm = PinVM(correct: "1234")
        for d in ["9","9","9","9"] { vm.tap(d) }
        XCTAssertEqual(vm.entered, "")
        XCTAssertEqual(vm.attemptsLeft, 2)
        XCTAssertEqual(vm.state, .entering)
    }

    func test_three_wrong_pins_lock() {
        let vm = PinVM(correct: "1234")
        for _ in 0..<3 {
            for d in ["0","0","0","0"] { vm.tap(d) }
        }
        XCTAssertEqual(vm.attemptsLeft, 0)
        XCTAssertEqual(vm.state, .locked)
    }

    func test_taps_ignored_after_lock() {
        let vm = PinVM(correct: "1234")
        for _ in 0..<3 {
            for d in ["0","0","0","0"] { vm.tap(d) }
        }
        vm.tap("1")
        XCTAssertEqual(vm.entered, "")
    }

    func test_taps_ignored_after_unlock() {
        let vm = PinVM(correct: "1234")
        for d in ["1","2","3","4"] { vm.tap(d) }
        vm.tap("9")
        XCTAssertEqual(vm.entered, "")
    }

    func test_clear_only_while_entering() {
        let vm = PinVM(correct: "1234")
        vm.tap("1"); vm.tap("2")
        vm.clear()
        XCTAssertEqual(vm.entered, "")

        for d in ["1","2","3","4"] { vm.tap(d) }
        XCTAssertEqual(vm.state, .unlocked)
        vm.entered = "X"   // simulate stale value, then clear should not touch it
        vm.clear()
        XCTAssertEqual(vm.entered, "X")
    }

    func test_max_four_digits() {
        let vm = PinVM(correct: "9999")
        for _ in 0..<10 { vm.tap("9") }
        // four taps win immediately, the rest are ignored
        XCTAssertEqual(vm.state, .unlocked)
    }
}
```

<details><summary>Solution</summary>

```swift
import SwiftUI
import Observation

enum PinState { case entering, unlocked, locked }

@Observable
final class PinVM {
    var entered: String = ""
    let correct: String
    var attemptsLeft: Int = 3
    var state: PinState = .entering

    init(correct: String = "1234") {
        self.correct = correct
    }

    func tap(_ digit: String) {
        guard state == .entering, entered.count < 4 else { return }
        entered.append(digit)
        if entered.count == 4 {
            evaluate()
        }
    }

    func clear() {
        guard state == .entering else { return }
        entered = ""
    }

    private func evaluate() {
        if entered == correct {
            state = .unlocked
        } else {
            attemptsLeft -= 1
            entered = ""
            if attemptsLeft <= 0 {
                state = .locked
            }
        }
    }
}

struct ContentView: View {
    @State private var vm = PinVM()

    private let rows: [[String]] = [
        ["1","2","3"],
        ["4","5","6"],
        ["7","8","9"],
    ]

    var body: some View {
        VStack(spacing: 20) {
            Text(maskedDisplay)
                .font(.system(.largeTitle, design: .monospaced))

            Text(statusText).foregroundStyle(.secondary)

            ForEach(rows, id: \.self) { row in
                HStack(spacing: 12) {
                    ForEach(row, id: \.self) { d in
                        digitButton(d)
                    }
                }
            }
            HStack(spacing: 12) {
                Button("Clear") { vm.clear() }
                    .disabled(vm.state != .entering)
                digitButton("0")
            }
        }
        .padding()
    }

    private var maskedDisplay: String {
        let bullets = String(repeating: "*", count: vm.entered.count)
        let blanks  = String(repeating: "_", count: 4 - vm.entered.count)
        return (bullets + blanks).map(String.init).joined(separator: " ")
    }

    private var statusText: String {
        switch vm.state {
        case .entering: return "Attempts left: \(vm.attemptsLeft)"
        case .unlocked: return "Unlocked"
        case .locked:   return "Locked"
        }
    }

    private func digitButton(_ d: String) -> some View {
        Button(d) { vm.tap(d) }
            .buttonStyle(.borderedProminent)
            .disabled(vm.state != .entering)
            .frame(minWidth: 60)
    }
}
```

Why: the VM is the single source of truth and the tests poke it directly --
mirroring the practical-exam grading model. Guards inside `tap` and `clear`
keep the state machine valid, so the view never has to know which buttons to
disable beyond reading `vm.state`.
</details>

---

## Ex 6 -- Mini-project: signup sheet flow with validation, focus, and confirm dialog (~30 min)

Spec:
- App root view `RootView` shows a `Sign up` button. Tapping it presents a
  modal sheet containing `SignupForm`.
- `SignupForm` is driven by an `@Observable` `SignupVM`:
  - `name: String`, `email: String`, `password: String`.
  - Computed `nameError`, `emailError`, `passwordError` returning optional
    `String` (nil = valid):
    - `name` must be non-empty after trimming whitespace.
    - `email` must contain `@` and at least one `.` after the `@`.
    - `password` must be at least 8 characters and contain at least one
      digit.
  - Computed `isValid: Bool` true iff all three errors are nil.
  - `submitted: Bool` flag, initially false. Method `submit()` sets it to
    true only when `isValid`.
- The form has three text fields with focus state moving from name -> email
  -> password on `onSubmit`. The `Submit` button is disabled until
  `isValid`. Tapping it shows a `confirmationDialog` asking
  `Submit as <name>?` with `Confirm` and `Cancel`. `Confirm` calls
  `vm.submit()` and dismisses the sheet.
- After the sheet is dismissed and `submitted` is true, the root view shows
  `Welcome, <name>!` instead of the `Sign up` button.

Starter (`ContentView.swift`):

```swift
import SwiftUI
import Observation

@Observable
final class SignupVM {
    var name: String = ""
    var email: String = ""
    var password: String = ""
    var submitted: Bool = false

    var nameError: String? { nil /* TODO */ }
    var emailError: String? { nil /* TODO */ }
    var passwordError: String? { nil /* TODO */ }
    var isValid: Bool { false /* TODO */ }

    func submit() { /* TODO */ }
}

struct RootView: View {
    var body: some View { Text("TODO") }
}
```

Oracle (`Tests.swift`):

```swift
import XCTest
@testable import App

final class SignupVMTests: XCTestCase {
    func test_initial_state_is_invalid() {
        let vm = SignupVM()
        XCTAssertFalse(vm.isValid)
        XCTAssertNotNil(vm.nameError)
        XCTAssertNotNil(vm.emailError)
        XCTAssertNotNil(vm.passwordError)
        XCTAssertFalse(vm.submitted)
    }

    func test_name_must_not_be_blank() {
        let vm = SignupVM()
        vm.name = "   "
        XCTAssertNotNil(vm.nameError)
        vm.name = "Tae"
        XCTAssertNil(vm.nameError)
    }

    func test_email_must_have_at_and_dot_after() {
        let vm = SignupVM()
        vm.email = "no-at-sign"
        XCTAssertNotNil(vm.emailError)
        vm.email = "user@nodot"
        XCTAssertNotNil(vm.emailError)
        vm.email = "user@host.com"
        XCTAssertNil(vm.emailError)
    }

    func test_password_min_length_and_digit() {
        let vm = SignupVM()
        vm.password = "short1"
        XCTAssertNotNil(vm.passwordError)
        vm.password = "longenoughnodigit"
        XCTAssertNotNil(vm.passwordError)
        vm.password = "longenough1"
        XCTAssertNil(vm.passwordError)
    }

    func test_isValid_requires_all_three() {
        let vm = SignupVM()
        vm.name = "Tae"
        vm.email = "tae@x.io"
        vm.password = "abcdefg9"
        XCTAssertTrue(vm.isValid)
    }

    func test_submit_only_when_valid() {
        let vm = SignupVM()
        vm.submit()
        XCTAssertFalse(vm.submitted)

        vm.name = "Tae"
        vm.email = "tae@x.io"
        vm.password = "abcdefg9"
        vm.submit()
        XCTAssertTrue(vm.submitted)
    }

    func test_invalid_after_clearing_one_field() {
        let vm = SignupVM()
        vm.name = "Tae"
        vm.email = "tae@x.io"
        vm.password = "abcdefg9"
        XCTAssertTrue(vm.isValid)
        vm.email = ""
        XCTAssertFalse(vm.isValid)
    }
}
```

<details><summary>Solution</summary>

```swift
import SwiftUI
import Observation

@Observable
final class SignupVM {
    var name: String = ""
    var email: String = ""
    var password: String = ""
    var submitted: Bool = false

    var nameError: String? {
        name.trimmingCharacters(in: .whitespaces).isEmpty
            ? "Name is required" : nil
    }

    var emailError: String? {
        guard let at = email.firstIndex(of: "@") else { return "Missing @" }
        let afterAt = email.index(after: at)
        return email[afterAt...].contains(".") ? nil : "Missing domain"
    }

    var passwordError: String? {
        if password.count < 8 { return "At least 8 characters" }
        if !password.contains(where: \.isNumber) { return "Need a digit" }
        return nil
    }

    var isValid: Bool {
        nameError == nil && emailError == nil && passwordError == nil
    }

    func submit() {
        guard isValid else { return }
        submitted = true
    }
}

private enum Field: Hashable { case name, email, password }

struct RootView: View {
    @State private var vm = SignupVM()
    @State private var showSheet = false

    var body: some View {
        VStack(spacing: 20) {
            if vm.submitted {
                Text("Welcome, \(vm.name)!").font(.title)
            } else {
                Button("Sign up") { showSheet = true }
                    .buttonStyle(.borderedProminent)
            }
        }
        .sheet(isPresented: $showSheet) {
            SignupForm(vm: vm, isPresented: $showSheet)
        }
    }
}

struct SignupForm: View {
    @Bindable var vm: SignupVM
    @Binding var isPresented: Bool

    @FocusState private var focus: Field?
    @State private var showConfirm = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("Full name", text: $vm.name)
                        .focused($focus, equals: .name)
                        .submitLabel(.next)
                        .onSubmit { focus = .email }
                    if let e = vm.nameError, !vm.name.isEmpty {
                        Text(e).foregroundStyle(.red).font(.caption)
                    }
                }
                Section("Email") {
                    TextField("you@example.com", text: $vm.email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .focused($focus, equals: .email)
                        .submitLabel(.next)
                        .onSubmit { focus = .password }
                    if let e = vm.emailError, !vm.email.isEmpty {
                        Text(e).foregroundStyle(.red).font(.caption)
                    }
                }
                Section("Password") {
                    SecureField("Password", text: $vm.password)
                        .focused($focus, equals: .password)
                        .submitLabel(.done)
                        .onSubmit { if vm.isValid { showConfirm = true } }
                    if let e = vm.passwordError, !vm.password.isEmpty {
                        Text(e).foregroundStyle(.red).font(.caption)
                    }
                }
                Button("Submit") { showConfirm = true }
                    .disabled(!vm.isValid)
            }
            .navigationTitle("Sign up")
            .onAppear { focus = .name }
            .confirmationDialog(
                "Submit as \(vm.name)?",
                isPresented: $showConfirm,
                titleVisibility: .visible
            ) {
                Button("Confirm") {
                    vm.submit()
                    isPresented = false
                }
                Button("Cancel", role: .cancel) {}
            }
        }
    }
}
```

Why: a single `@Observable` model owns all three fields plus the
`submitted` flag, so the parent can flip its UI based on that flag once the
sheet dismisses. `@Bindable` lets `SignupForm` produce two-way bindings into
the model without re-instantiating it. `FocusState` is local to the form,
and `confirmationDialog` reads `vm.name` at present-time so it always shows
the current value. Tests target the VM directly -- exactly how the practical
exam grades.
</details>
