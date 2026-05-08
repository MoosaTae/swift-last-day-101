# 04 - Lists and Navigation (SwiftUI) - Tutorial

A tutorial-style walkthrough of the cheat sheet. Targets iOS 16+ (NavigationStack, value-based navigation). Read this if value-based navigation, the `Hashable` requirement, and `.navigationDestination(for:)` placement still feel fuzzy.

---

## 1. Mental Model: Navigation Is Data

> **Priority:** SKIM — useful framing, not asked directly.

Most beginners imagine navigation imperatively: "click button, push screen." SwiftUI flips this. **Navigation state is data you mutate; the view tree re-renders to reflect it.** You don't push screens. You change a `Bool`, an array, or a `NavigationPath`, and SwiftUI figures out which screens should be visible.

Three primitives cover ~100% of the exam:

```
                       SwiftUI Navigation Primitives
   +-----------------------+ +-----------------------+ +----------------+
   |   NavigationStack     | |  .sheet / .fullScreen | |    TabView     |
   |   (drill-down)        | |    Cover (modal)      | |   (peer)       |
   +-----------------------+ +-----------------------+ +----------------+
   | A -> B -> C -> ...    | |   A pops up over B    | | Home | Profile |
   | back button on top    | |   covers the screen   | |  (each owns    |
   | hierarchical          | |   not in stack        | |   its own      |
   | "deeper into a topic" | |   "side task / form"  | |   NavStack)    |
   +-----------------------+ +-----------------------+ +----------------+
```

Decision rule for any screen transition:

| Question | Answer |
|---|---|
| Same topic, going deeper (list -> detail)? | NavigationStack push |
| Side task that interrupts (compose, settings, picker)? | `.sheet` (or `.fullScreenCover` if you don't want swipe-down) |
| Top-level peer features (Home / Search / Profile)? | TabView |

Everything else in this document is implementation detail of these three.

The **declarative principle**: rather than calling `pushViewController(...)`, you bind state. `@State var path = NavigationPath()` IS your navigation stack. Mutating `path` mutates the screen.

---

## 2. ScrollView vs List

> **Priority:** DRILL — knowing when to pick which is a common practical question.

Both scroll. They are not interchangeable.

**Why both exist**: `ScrollView` is a dumb scrolling box - you put anything in it, you control the look. `List` is a smart scrolling table - it gives you free row chrome (separators, insets, swipe-to-delete, EditButton) and **lazily** recycles rows so a 10,000-row list doesn't melt your phone.

| | ScrollView + VStack/ForEach | List |
|---|---|---|
| Style | Plain content; you control look | Built-in row chrome, separators, swipe actions |
| Lazy? | No (eager unless you wrap in `LazyVStack`) | Yes (rows recycled offscreen) |
| Use when | Custom layouts, mixed widgets, hero sections | Homogeneous data rows; edit/delete/move |

```swift
// ScrollView path - what the slides actually teach.
ScrollView(.vertical) {                  // explicit axis (default is .vertical)
    VStack {                             // eager: builds every child up front
        ForEach(countries, id: \.self) { item in
            Text(item).font(.title)
        }
    }
}

// LazyVStack: only build rows as they scroll into view.
ScrollView { LazyVStack { ForEach(items) { ItemRow($0) } } }

// Horizontal scroll - same idea, different axis.
ScrollView(.horizontal) { HStack { /* ... */ } }
```

Rule of thumb: if your rows look uniform and you might want delete/move, reach for `List`. If you have a magazine-style feed with images, headers, and varied components, `ScrollView` + `LazyVStack` gives you full control.

---

## 3. List Basics

> **Priority:** DRILL — `List`/`ForEach` + `id:` patterns are practical-exam staples.

`List` has three forms. Pick based on what your data looks like.

```swift
// Form 1: static rows. Hardcoded, no data array.
List { Text("A"); Text("B"); Text("C") }

// Form 2: explicit id - data isn't Identifiable, you tell SwiftUI what to use as id.
//         \.self means "use the value itself as the identity."
//         Requires the value be Hashable (String, Int, etc. are).
List(countries, id: \.self) { item in Text(item) }

// Form 3: Identifiable - the cleanest. SwiftUI reads `id` from your model.
struct Item: Identifiable { let id = UUID(); let name: String }
List(items) { item in Text(item.name) }
```

### Why does SwiftUI demand an "id"?

Because the rows are diffed across re-renders. SwiftUI needs to answer: "is row 3 in the new render the same row 3 as before, or a brand new one?" If identity is wrong, animations break, selection breaks, and TextFields lose focus.

### ForEach inside List - required for `.onDelete` and `.onMove`

This trips students up. `.onDelete` and `.onMove` are modifiers on `ForEach`, not on `List`. So if you used `List(items) { ... }` directly, you have no `ForEach` to attach them to - you have to switch shapes:

```swift
List {                                    // List body in trailing closure form
    ForEach(items) { item in              // explicit ForEach so we can hang modifiers on it
        Text(item.name)
    }
    .onDelete { offsets in                // offsets: IndexSet of rows the user swiped
        items.remove(atOffsets: offsets)
    }
    .onMove { src, dst in                 // src: IndexSet, dst: Int target
        items.move(fromOffsets: src, toOffset: dst)
    }
}
.toolbar { EditButton() }                 // toggles List into edit mode (shows reorder handles)
```

Mental model: `List(items) { ... }` is shorthand sugar; behind the scenes it's already a ForEach. But Swift's type system doesn't expose that ForEach to you, so you can't attach `.onDelete`. The fix is to write the ForEach yourself.

### Sections

```swift
List {
    Section("Fruit") {                                   // shorthand: title only
        Text("Apple"); Text("Pear")
    }
    Section(header: Text("Veg"), footer: Text("Fresh")) {   // header + footer
        Text("Kale")
    }
}
```

---

## 4. Identifiable vs Hashable - the Most Confused Pair

> **Priority:** DRILL — section name says it; classic exam confusion.

Students conflate these. They look similar, both involve "uniqueness," and types often conform to both. Here's the actual split:

| Protocol | Question it answers | Used by |
|---|---|---|
| `Identifiable` | "Which row is this in a list?" (stable identity across renders) | `List(items)`, `ForEach(items)` |
| `Hashable` | "Are these two values equal? Hash them into a dictionary key." | `NavigationLink(value:)` + `.navigationDestination(for:)`, `Set`, `Dictionary` |

`Identifiable` is about UI diffing. `Hashable` is about value-based navigation routing.

```swift
struct Message: Identifiable, Hashable {
    var id = UUID()              // Identifiable requires `id`
    var value: String
}
//          ^^^^^^^^ Identifiable provided automatically as soon as `id` exists.
//          ^^^^^^^^ Hashable: Swift auto-synthesizes it because every stored
//                   property (UUID, String) is itself Hashable.
```

### Why both often appear together

A `Message` shown in a `List` needs `Identifiable`. The same `Message` you push via `NavigationLink(value: msg)` needs `Hashable` - SwiftUI hashes the value to look up the matching `.navigationDestination(for: Message.self)`. Models in lists that you also navigate to therefore conform to both. This is the normal case.

### Auto-synthesis rules (memorize)

- **`Hashable`**: Swift auto-synthesizes `==` and `hash(into:)` for a struct **as long as every stored property is Hashable**. Just write `struct X: Hashable {}` - done.
- **`Identifiable`**: there's nothing to synthesize. You just give the type an `id` property. Any type works.
- **`Equatable`**: similarly auto-synthesized when all properties are Equatable. (Hashable implies Equatable.)

### Why `id: \.self` requires Hashable

```swift
List(strings, id: \.self) { ... }     // \.self uses the value itself as identity
```

To use a value as an `id`, SwiftUI needs to hash and compare it - that means `Hashable`. `String`, `Int`, `UUID` are all Hashable. A custom struct with no conformance is not.

---

## 5. NavigationStack - the Heart of This Topic

> **Priority:** DRILL — value-based navigation pattern is heart of practical.

### Why it replaced NavigationView

`NavigationView` (iOS 13-15) had two problems: (1) on iPad it secretly turned into a sidebar/detail split view, surprising you on phone-only mental model; and (2) it had no first-class way to drive navigation programmatically from data. `NavigationStack` (iOS 16+) is phone-style by default, and it accepts a `path` binding so you can push/pop programmatically.

If you write `NavigationView` in this exam, expect points off. The course is iOS 16+.

### The four ways to push a screen

#### a) Closure-based push (eager)

```swift
NavigationStack {
    List(items) { item in
        // The destination is built RIGHT NOW, even though the user hasn't tapped.
        NavigationLink("See \(item.name)") { DetailView(item: item) }
    }
    .navigationTitle("Items")
}
```

This works, but read the comment carefully: **the destination view is constructed eagerly for every visible row**. With 1000 rows, that's 1000 `DetailView`s built up front. Wasteful. The cure is value-based.

#### b) Value-based push (preferred, lazy)

```swift
NavigationStack {
    List(items) { item in
        NavigationLink(item.name, value: item)              // hand SwiftUI a VALUE, not a view
    }
    .navigationDestination(for: Item.self)   { DetailView(item: $0) }   // declared once
    .navigationDestination(for: String.self) { StringScreen(name: $0) } // multiple types ok
    .navigationDestination(for: Int.self)    { IntScreen(number: $0) }
}
```

Mental model: the link says "I want to navigate to THIS value." The stack maintains a registry mapping types to view builders. When the user taps, SwiftUI looks up the type, builds the destination on demand. **Lazy.** Works for 1 row or 10,000 rows identically.

This is also why the value must be `Hashable`: SwiftUI uses it as a lookup key.

#### The `.navigationDestination(for:)` placement rule

THIS is the rule the slides bury. **`.navigationDestination(for:)` must be attached to a view inside the `NavigationStack` root** - typically the List or root content. Putting it on the destination, or outside the stack, silently does nothing or crashes at runtime.

```
NavigationStack {                  <-- the stack
    List { ... }                   <-- root content
        .navigationDestination(for: Item.self) { ... }   <-- HERE. correct.
}
.navigationDestination(for: Item.self) { ... }           <-- wrong. outside stack.

NavigationStack {
    List { ... }
}
.navigationDestination(for: Item.self) { ... }           <-- still outside. wrong.
```

Visual model:

```
+--- NavigationStack (root) ----------------------+
|                                                 |
|  Root content (List, VStack, ...)               |
|     |                                           |
|     +-- .navigationDestination(for: T.self)     |  <-- attach here
|     +-- .navigationDestination(for: U.self)     |
|                                                 |
|  Pushed children appear above this layer.       |
|  They DON'T need their own navigationDestination|
|  unless they push further values.               |
+-------------------------------------------------+
```

Rule of thumb: declare all type -> view mappings once, near the root. Pushed children just call `NavigationLink(value:)` and the registry handles the rest.

#### c) Programmatic via Bool

When you need to push from a non-button context (after a network call, on appear, etc.):

```swift
@State var showPageTwo = false                          // your "is pushed?" flag

NavigationStack {
    Button("Show details") { showPageTwo = true }       // mutate state -> push
        .navigationDestination(isPresented: $showPageTwo) {
            SecondScreen()
        }
}
```

#### d) Programmatic via NavigationPath (full power)

```swift
@State var path = NavigationPath()                      // an array-like stack of pushed values

NavigationStack(path: $path) {                          // bind the path
    Button("Go")  { path.append(item) }                 // push
    Button("Pop") { path.removeLast() }                 // pop one
        .navigationDestination(for: Item.self) { DetailView(item: $0) }
}
```

More on `NavigationPath` in section 7.

### Title and toolbar

```swift
.navigationTitle("Homepage")                            // shown in nav bar
.navigationBarTitleDisplayMode(.inline)                 // small title (vs .large)
.toolbar {
    ToolbarItem(placement: .topBarTrailing) {           // top-right
        Button("Add") { items.append(Item(name: "New")) }
    }
}
```

Note: `.navigationTitle` is attached to **the screen content**, not to the `NavigationStack` itself. Put it on the root view inside the stack, or on a pushed child to set its title.

---

## 6. Going Back

> **Priority:** DRILL — `dismiss` and back-button behavior tested often.

Three ways to leave a screen, and one universal principle that ties them together.

### `@Environment(\.dismiss)` - works for both push and modal

```swift
struct SecondScreen: View {
    @Environment(\.dismiss) var dismiss            // SwiftUI hands you a closure
    var body: some View {
        Button("Close") { dismiss() }              // pops if pushed, dismisses if modal
    }
}
```

This is the easy default. SwiftUI inspects context: if you're in a `NavigationStack`, it pops; if you're in a sheet, it dismisses. You don't have to know which.

### Path manipulation - explicit pop

```swift
@State var path = NavigationPath()

Button("Pop")          { path.removeLast() }
Button("Pop two")      { path.removeLast(2) }
Button("Pop to root")  { path = NavigationPath() }    // reassign empty - cleanest reset
```

### The universal principle

> The state that opened the screen also closes it. Mutate it back.

| You opened via... | You close by... |
|---|---|
| `path.append(x)` | `path.removeLast()` or `path = NavigationPath()` |
| `showSheet = true` | `showSheet = false` (or `dismiss()` from inside) |
| `userMessage = msg` | `userMessage = nil` (or `dismiss()` from inside) |
| `NavigationLink(value:)` | back button (auto) or `dismiss()` from inside |

This principle is why "navigation is data" matters: closing isn't a separate API, it's just undoing the state mutation.

---

## 7. NavigationPath - Programmatic Stack Manipulation

> **Priority:** SKIM — useful but exam usually tests basic `[Hashable]` path.

`NavigationPath` is a **type-erased** stack of pushed values. Type-erased because a single navigation stack might contain a `User`, then a `Post`, then a `Comment` - heterogeneous types. A `[Any]` would lose `Hashable`. `NavigationPath` keeps the hash machinery while accepting any `Hashable`.

```swift
@State var path = NavigationPath()

NavigationStack(path: $path) {
    RootView()
        .navigationDestination(for: User.self)    { UserView(user: $0) }
        .navigationDestination(for: Post.self)    { PostView(post: $0) }
        .navigationDestination(for: Comment.self) { CommentView(comment: $0) }
}
```

Push, pop, reset:

```swift
path.append(someUser)            // push: now [User]
path.append(somePost)            // push: now [User, Post]
path.append(someComment)         // push: now [User, Post, Comment]

path.removeLast()                // pop one: [User, Post]
path.removeLast(2)               // pop two: []

path = NavigationPath()          // pop everything (pop-to-root)
print(path.count)                // path.count works; iteration does not (type-erased)
print(path.isEmpty)
```

Visualization of a path-driven stack:

```
   path = [User(id:1), Post(id:42)]

                        |  CommentView           <-- not on stack
                        |  PostView(post:42)     <-- top, visible
                        |  UserView(user:1)
                        |  RootView              <-- bottom
                        +----- NavigationStack
```

Common patterns:

| Goal | Code |
|---|---|
| Push a value | `path.append(value)` |
| Pop one | `path.removeLast()` |
| Pop N | `path.removeLast(N)` |
| Pop to root | `path = NavigationPath()` |
| Deep link to A -> B -> C | append three values in a row |

---

## 8. Modal Presentation - Sheet and FullScreenCover

> **Priority:** DRILL — `.sheet(isPresented:)` and `item:` patterns very common.

Modal = a screen that appears **over** the current one, not inside the navigation stack. Use it for side tasks: composing a message, picking a date, settings, "Add new" forms.

```
   Push (NavigationStack)              Modal (.sheet / .fullScreenCover)
   +------------------+               +------------------+
   |                  |               |   Sheet content  |
   |    Detail        |               |  (slides up      |
   |                  |               |   from bottom)   |
   |  < Back          |               |   ----- drag --- |   <- swipe to dismiss
   +------------------+               +------------------+
                                      |  Underlying      |
                                      |  screen (still   |
                                      |  there, dimmed)  |
                                      +------------------+
```

### Sheet via Bool

```swift
@State var showSheet = false

Button("Open") { showSheet = true }
    .sheet(isPresented: $showSheet) { SecondScreen() }
```

### Sheet via Optional item - when you need to pass data

```swift
@State var userMessage: Message?                    // nil = closed, non-nil = open

Button("Open") { userMessage = Message(value: "Hi") }
    .sheet(item: $userMessage) { msg in             // msg is non-optional inside
        SecondScreen(message: msg)
    }
```

The `item:` form shines when the data and the "is open?" state are the same thing. No separate Bool to keep in sync. Setting `userMessage = nil` dismisses.

### FullScreenCover - no swipe-down

```swift
.fullScreenCover(isPresented: $showSheet) { SecondScreen() }
```

Same API as `.sheet`, but takes the entire screen and **does not** allow swipe-to-dismiss. You MUST provide your own dismiss button (`@Environment(\.dismiss)`) or the user is stuck. Use for video players, onboarding, full-screen tasks.

### Detents - partial sheets (iOS 16+)

```swift
.sheet(item: $userMessage) { msg in
    SecondScreen(message: msg)
        .presentationDetents([.medium,            // ~half screen
                              .large,             // full
                              .fraction(0.3)])    // custom: 30% of screen
}
```

Multiple detents lets the user drag between heights.

### Dismiss from inside

```swift
struct SecondScreen: View {
    @Environment(\.dismiss) var dismiss
    var body: some View {
        Button("Close") { dismiss() }
    }
}
```

### Push vs Sheet vs FullScreenCover - decision table

| Situation | Use |
|---|---|
| Detail of a list item, drilldown, hierarchical | Push (NavigationStack) |
| Compose / edit / pick / settings - side task, can cancel | `.sheet` |
| Onboarding, video, must complete or cancel deliberately | `.fullScreenCover` |
| Half-height action panel | `.sheet` + `.presentationDetents([.medium])` |
| Need to pass an object | `.sheet(item:)` over `.sheet(isPresented:)` |

---

## 9. NavigationStack vs TabView

> **Priority:** SKIM — composition rule is short, easy once seen.

These compose. They don't compete.

```
   TabView (peer screens, switch by tab bar)
   +--------------------------------------------------+
   |  Home tab          Profile tab        Search tab |
   |  +----------+      +----------+       +--------+ |
   |  | NavStack |      | NavStack |       | NavStk | |
   |  |  Home -> |      |  Me -> ... |     |        | |
   |  |  Detail->|      |          |       |        | |
   |  +----------+      +----------+       +--------+ |
   |  [ Home ] [ Profile ] [ Search ]    <- tab bar   |
   +--------------------------------------------------+
```

- `NavigationStack` = drill-down. One active screen. Back stack. Hierarchical.
- `TabView` = peer. Three or four sibling areas. No "back" between tabs.
- **Common pattern**: each tab owns its own `NavigationStack`. State and back stacks are independent per tab - exactly what users expect.

```swift
@State var currentTab = 0

TabView(selection: $currentTab) {
    Tab("Home",    systemImage: "house",  value: 0) {
        NavigationStack { HomeScreen() }              // each tab: its own stack
    }.badge(12)                                       // red badge with count
    Tab("Profile", systemImage: "person", value: 1) {
        NavigationStack { ProfileScreen() }
    }
}
.tabViewStyle(.automatic)
```

(Older API: `TabView { Screen().tabItem { Label("Home", systemImage: "house") }.tag(0) }`. The newer `Tab(...)` builder is iOS 18+.)

---

## 10. Three Worked Examples

> **Priority:** DRILL — these mirror practical-exam refactoring tasks.

### Example 1 - List of strings + closure-based push

The simplest possible navigation app.

```swift
struct ContentView: View {
    let fruits = ["Apple", "Banana", "Cherry"]      // String is Hashable -> id: \.self works
    var body: some View {
        NavigationStack {                           // root: declares the stack
            List(fruits, id: \.self) { fruit in     // String has no `id`, so use \.self
                NavigationLink(fruit) {             // closure-based: destination built eagerly
                    Text("Detail: \(fruit)").font(.title)
                }
            }
            .navigationTitle("Fruits")              // attached to root content, sets bar title
        }
    }
}
```

When to write it this way: tiny lists, prototypes, or when the destination is so trivial that lazy construction doesn't matter.

### Example 2 - Identifiable struct + value-based navigationDestination

The pattern you should use by default.

```swift
struct Country: Identifiable, Hashable {            // both: List uses Identifiable, nav uses Hashable
    let id = UUID()
    let flag: String
    let name: String
}

struct CountryList: View {
    let countries = [
        Country(flag: "TH", name: "Thai"),
        Country(flag: "JP", name: "Japan"),
    ]
    var body: some View {
        NavigationStack {
            List(countries) { c in                  // Identifiable: no id: needed
                NavigationLink(value: c) {          // value-based push
                    HStack { Text(c.flag); Text(c.name) }
                }
            }
            .navigationTitle("Countries")
            // Destination registered ONCE on the root content. NOT on the destination.
            .navigationDestination(for: Country.self) { c in
                VStack {
                    Text(c.flag).font(.system(size: 80))
                    Text(c.name).font(.largeTitle)
                }
                .navigationTitle(c.name)            // pushed screen's own title
            }
        }
    }
}
```

Trace through it: user taps a row -> `NavigationLink(value: c)` fires -> SwiftUI looks up `Country.self` in the destination registry -> builds the destination view lazily with `c` -> pushes it.

### Example 3 - Editable list with onDelete + Add via sheet

A real exam-shaped problem: list, swipe-to-delete, reorder, plus button opens a sheet to add new.

```swift
struct Task: Identifiable {                         // Task in a List -> Identifiable
    let id = UUID()
    var title: String
}

struct TaskList: View {
    @State var tasks: [Task] = [Task(title: "Buy milk"), Task(title: "Run")]
    @State var showAdd = false                      // sheet open?
    @State var draft = ""                           // text field buffer

    var body: some View {
        NavigationStack {
            List {
                ForEach(tasks) { t in               // explicit ForEach: required for onDelete/onMove
                    Text(t.title)
                }
                .onDelete { tasks.remove(atOffsets: $0) }              // swipe-to-delete
                .onMove   { tasks.move(fromOffsets: $0, toOffset: $1) }// drag-to-reorder
            }
            .navigationTitle("Tasks")
            .toolbar {
                ToolbarItem(placement: .topBarLeading)  { EditButton() }   // toggles edit mode
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            // The Add sheet has its OWN NavigationStack so its toolbar shows.
            .sheet(isPresented: $showAdd) {
                NavigationStack {
                    Form {
                        TextField("Title", text: $draft)
                    }
                    .navigationTitle("New Task")
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {     // typically right side
                            Button("Save") {
                                tasks.append(Task(title: draft))
                                draft = ""
                                showAdd = false                            // close the sheet
                            }
                        }
                        ToolbarItem(placement: .cancellationAction) {     // typically left side
                            Button("Cancel") { showAdd = false }
                        }
                    }
                }
            }
        }
    }
}
```

Why a `NavigationStack` inside the sheet? The sheet is its own screen world. To get a title bar with Save/Cancel buttons, you need a navigation chrome - that's a `NavigationStack`. Without it, `.toolbar` and `.navigationTitle` are silently ignored inside the sheet.

---

## 11. Common Pitfalls (likely exam traps)

> **Priority:** DRILL — title literally says "likely exam traps".

Each of these has tripped real students. Read them before the exam.

1. **Using `NavigationView`.** Deprecated since iOS 16. The course is iOS 16+; the exam expects `NavigationStack`. Trips students who copy old tutorials.

2. **`.navigationDestination(for:)` on the destination instead of inside the NavigationStack root.** Silently does nothing - the runtime can't find the registration. Trips students who think modifiers go "next to" the thing they affect; in SwiftUI, navigation destinations are registered on the root, not the target.

3. **Missing `Hashable` on the value type for `NavigationLink(value:)`.** Compile error: "type does not conform to Hashable." Fix: add `: Hashable` and let auto-synthesis do the work.

4. **Missing `Identifiable` (or `id:`) on `List(items)` / `ForEach(items)`.** Compile error. Trips students who forget to either conform or supply `id: \.something`.

5. **Putting `.onDelete` on `List` directly.** Compile error - it's a `ForEach` modifier, not a `List` modifier. The fix is to write the explicit `ForEach` form.

6. **Nesting `ScrollView` inside `List`.** `List` already scrolls. Nested scroll views cause layout chaos and gesture conflicts. Pick one container.

7. **`.sheet(isPresented:)` when you need to pass data.** Race condition: you set the data, then set the Bool, but the sheet might present before data lands. Use `.sheet(item: $optional)` - the data and the "open?" state are atomic.

8. **`.fullScreenCover` has no swipe-to-dismiss.** Students forget to add a dismiss button and trap the user. Always provide an explicit close.

9. **`id: \.self` on a non-Hashable type.** Compile error. `\.self` requires Hashable. Either conform or use a real `id` property.

10. **`NavigationPath`: pushing a type with no matching `.navigationDestination(for:)`.** Blank screen at runtime, no crash. The path appended fine; SwiftUI just has nothing to render. Always pair every pushable type with a destination registration.

---

## 12. Quick Recall Card

Last-minute syntax dump. Memorize the shapes.

```swift
// Lists
List { ... }                                     // static
List(items) { item in ... }                      // Identifiable
List(items, id: \.self) { ... }                  // Hashable element
List { ForEach(items) { ... }
    .onDelete { offsets in ... }
    .onMove { src, dst in ... }
}

// Sections
List {
    Section("Header") { ... }
    Section(header: Text("H"), footer: Text("F")) { ... }
}

// Navigation
NavigationStack { ... }
NavigationStack(path: $path) { ... }
NavigationLink("Title") { DestView() }            // closure (eager)
NavigationLink("Title", value: x)                 // value (lazy)

// Destinations - register on root content, INSIDE NavigationStack
.navigationDestination(for: T.self)        { v in ... }
.navigationDestination(isPresented: $bool) { ... }

// Title and toolbar
.navigationTitle("X")
.navigationBarTitleDisplayMode(.inline)            // or .large, .automatic
.toolbar {
    ToolbarItem(placement: .topBarTrailing)    { ... }
    ToolbarItem(placement: .topBarLeading)     { ... }
    ToolbarItem(placement: .confirmationAction){ ... }
    ToolbarItem(placement: .cancellationAction){ ... }
}

// Modal
.sheet(isPresented: $b) { ... }
.sheet(item: $optItem)   { item in ... }
.fullScreenCover(isPresented: $b) { ... }
.presentationDetents([.medium, .large, .fraction(0.3)])

// Dismiss
@Environment(\.dismiss) var dismiss
dismiss()

// Path
@State var path = NavigationPath()
path.append(value)
path.removeLast()
path.removeLast(2)
path = NavigationPath()                           // pop to root

// Tab + Stack composition
TabView(selection: $tab) {
    Tab("Home",    systemImage: "house",  value: 0) { NavigationStack { ... } }
    Tab("Profile", systemImage: "person", value: 1) { NavigationStack { ... } }
}

// Identifiable + Hashable model
struct Item: Identifiable, Hashable {
    var id = UUID()
    var name: String
}
```

If any of these shapes look unfamiliar tomorrow morning, re-read the section that owns it. Good luck.
