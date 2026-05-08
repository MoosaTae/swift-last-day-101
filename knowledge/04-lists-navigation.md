# 04 - Lists & Navigation (SwiftUI)

Final-exam cheat sheet. iOS 16+ assumed (NavigationStack, value-based nav).

## 1. ScrollView vs List

| | ScrollView + VStack/ForEach | List |
|---|---|---|
| Style | Plain content, you control look | Built-in row chrome, separators, swipe actions |
| Lazy? | No (eager unless LazyVStack) | Yes (rows recycled) |
| Use when | Custom layouts, mixed widgets | Homogeneous data rows, edit/delete/move |

```swift
// ScrollView path (what the slides actually teach)
ScrollView(.vertical) {
    VStack {
        ForEach(countries, id: \.self) { item in
            Text(item).font(.title)
        }
    }
}
ScrollView { LazyVStack { ForEach(items) { ItemRow($0) } } }
ScrollView(.horizontal) { HStack { ... } }
```

## 2. List basics

```swift
List { Text("A"); Text("B"); Text("C") }                   // static
List(countries, id: \.self) { item in Text(item) }         // explicit id
struct Item: Identifiable { let id = UUID(); let name: String }
List(items) { item in Text(item.name) }                    // Identifiable
```

### ForEach in List (required for .onDelete / .onMove)
```swift
List {
    ForEach(items) { item in Text(item.name) }
        .onDelete  { offsets in items.remove(atOffsets: offsets) }
        .onMove    { src, dst in items.move(fromOffsets: src, toOffset: dst) }
}
.toolbar { EditButton() }
```

### Sections
```swift
List {
    Section("Fruit") { Text("Apple"); Text("Pear") }
    Section(header: Text("Veg"), footer: Text("Fresh")) { Text("Kale") }
}
```

## 3. Identifiable / Hashable
```swift
struct Message: Identifiable, Hashable {
    var id = UUID()
    var value: String
}
```
- `Identifiable` -> `List(items) { ... }` with no `id:`.
- `Hashable` -> `NavigationLink(value:)` + `.navigationDestination(for:)`.

## 4. NavigationStack (iOS 16+, replaces NavigationView)

### a) Closure-based push
```swift
NavigationStack {
    List(items) { item in
        NavigationLink("See \(item.name)") { DetailView(item: item) }
    }
    .navigationTitle("Items")
}
```

### b) Value-based (preferred)
```swift
NavigationStack {
    List(items) { item in NavigationLink(item.name, value: item) }
        .navigationDestination(for: Item.self)   { DetailView(item: $0) }
        .navigationDestination(for: String.self) { StringScreen(name: $0) }
        .navigationDestination(for: Int.self)    { IntScreen(number: $0) }
}
```
`.navigationDestination` MUST live inside the NavigationStack root — not inside a pushed child.

### c) Programmatic via Bool
```swift
@State var showPageTwo = false
NavigationStack {
    Button("Show details") { showPageTwo = true }
        .navigationDestination(isPresented: $showPageTwo) { SecondScreen() }
}
```

### d) Programmatic via NavigationPath
```swift
@State var path = NavigationPath()
NavigationStack(path: $path) {
    Button("Go")  { path.append(item) }
    Button("Pop") { path.removeLast() }
        .navigationDestination(for: Item.self) { DetailView(item: $0) }
}
```

### e) Title / toolbar
```swift
.navigationTitle("Homepage")
.navigationBarTitleDisplayMode(.inline)
.toolbar {
    ToolbarItem(placement: .topBarTrailing) {
        Button("Add") { items.append(Item(name: "New")) }
    }
}
```

## 5. Modal presentation

```swift
@State var showSheet = false
@State var userMessage: Message?

Button("Open") { showSheet = true }
    .sheet(isPresented: $showSheet) { SecondScreen() }

.sheet(item: $userMessage) { msg in SecondScreen(message: msg) }   // opens iff non-nil

.fullScreenCover(isPresented: $showSheet) { SecondScreen() }

.sheet(item: $userMessage) { msg in
    SecondScreen(message: msg)
        .presentationDetents([.medium, .large, .fraction(0.3)])
}
```

### Dismiss from inside
```swift
struct SecondScreen: View {
    @Environment(\.dismiss) var dismiss
    var body: some View { Button("Close") { dismiss() } }
}
```

## 6. Three Worked Examples

### Example 1 — List of strings + push detail
```swift
struct ContentView: View {
    let fruits = ["Apple", "Banana", "Cherry"]
    var body: some View {
        NavigationStack {
            List(fruits, id: \.self) { fruit in
                NavigationLink(fruit) { Text("Detail: \(fruit)").font(.title) }
            }
            .navigationTitle("Fruits")
        }
    }
}
```

### Example 2 — Identifiable struct + value-based navigationDestination
```swift
struct Country: Identifiable, Hashable {
    let id = UUID(); let flag: String; let name: String
}

struct CountryList: View {
    let countries = [
        Country(flag: "TH", name: "Thai"),
        Country(flag: "JP", name: "Japan"),
    ]
    var body: some View {
        NavigationStack {
            List(countries) { c in
                NavigationLink(value: c) {
                    HStack { Text(c.flag); Text(c.name) }
                }
            }
            .navigationTitle("Countries")
            .navigationDestination(for: Country.self) { c in
                VStack {
                    Text(c.flag).font(.system(size: 80))
                    Text(c.name).font(.largeTitle)
                }
                .navigationTitle(c.name)
            }
        }
    }
}
```

### Example 3 — Editable list with onDelete + Add toolbar
```swift
struct Task: Identifiable { let id = UUID(); var title: String }

struct TaskList: View {
    @State var tasks: [Task] = [Task(title: "Buy milk"), Task(title: "Run")]
    @State var showAdd = false
    @State var draft = ""

    var body: some View {
        NavigationStack {
            List {
                ForEach(tasks) { t in Text(t.title) }
                    .onDelete { tasks.remove(atOffsets: $0) }
                    .onMove   { tasks.move(fromOffsets: $0, toOffset: $1) }
            }
            .navigationTitle("Tasks")
            .toolbar {
                ToolbarItem(placement: .topBarLeading)  { EditButton() }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showAdd = true } label: { Image(systemName: "plus") }
                }
            }
            .sheet(isPresented: $showAdd) {
                NavigationStack {
                    Form { TextField("Title", text: $draft) }
                        .navigationTitle("New Task")
                        .toolbar {
                            ToolbarItem(placement: .confirmationAction) {
                                Button("Save") {
                                    tasks.append(Task(title: draft))
                                    draft = ""; showAdd = false
                                }
                            }
                            ToolbarItem(placement: .cancellationAction) {
                                Button("Cancel") { showAdd = false }
                            }
                        }
                }
            }
        }
    }
}
```

## 7. NavigationStack vs TabView

- `NavigationStack` — drill-down (push/pop), one active screen, back stack.
- `TabView` — peer screens, each tab usually owns its own `NavigationStack`.

```swift
// iOS 16/17 form (matches "iOS 16+ assumed" baseline)
TabView(selection: $currentTab) {
    NavigationStack { HomeScreen() }
        .tabItem { Label("Home", systemImage: "house") }
        .tag(0)
        .badge(12)
    NavigationStack { ProfileScreen() }
        .tabItem { Label("Profile", systemImage: "person") }
        .tag(1)
}
.tabViewStyle(.automatic)

// iOS 18+ alternative (newer Tab(_:systemImage:value:) builder):
// Tab("Home", systemImage: "house", value: 0) { NavigationStack { HomeScreen() } }.badge(12)
```

## 8. Common Pitfalls (likely exam traps)

1. Using `NavigationView` — deprecated; exam expects `NavigationStack`.
2. `.navigationDestination(for:)` on the destination instead of inside the NavigationStack root — silently fails.
3. Missing `Hashable` for `NavigationLink(value:)` -> compile error.
4. Missing `Identifiable` (or `id:`) on `List(items)` / `ForEach(items)` -> compile error.
5. `.onDelete` on `List` directly — must be on `ForEach` inside `List`.
6. Nesting `ScrollView` inside `List` — `List` already scrolls.
7. `.sheet(isPresented:)` when you need to pass data — use `.sheet(item: $optional)` instead.
8. `.fullScreenCover` has no swipe-to-dismiss — must call `dismiss()` manually.
9. `id: \.self` on non-`Hashable` type — won't compile.
10. `NavigationPath`: pushing a type with no matching `.navigationDestination(for:)` -> blank screen.
11. Naming a model `Task` shadows Swift Concurrency's `Task` — `Task { await ... }` becomes `Task.init(...)` for your model and won't compile. Rename your model (`TaskItem`, `Todo`).

## 9. Syntax recall card

```
List { ... }
List(items) { item in ... }                  // Identifiable
List(items, id: \.self) { ... }              // Hashable
ForEach(items) { ... }.onDelete { ... }
NavigationStack { ... }
NavigationLink("Title") { DestView() }       // closure
NavigationLink("Title", value: x)            // value-based
.navigationDestination(for: T.self)        { v in ... }
.navigationDestination(isPresented: $bool) { ... }
.navigationTitle("X"); .navigationBarTitleDisplayMode(.inline)
.toolbar { ToolbarItem(placement: .topBarTrailing) { ... } }
.sheet(isPresented: $b) { ... }
.sheet(item: $optItem) { item in ... }
.fullScreenCover(isPresented: $b) { ... }
.presentationDetents([.medium, .large, .fraction(0.3)])
@Environment(\.dismiss) var dismiss
@State var path = NavigationPath()
```
