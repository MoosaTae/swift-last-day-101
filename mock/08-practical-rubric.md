# Mock 2 — Practical Exam Solution + Rubric

This file pairs with `07-practical-brief.md`. It shows a reference solution for each task and the rubric the grader applies.

---

## Solution Sketch (per task)

### Task 1 — Read the starter and identify the bugs

A correct top-of-file comment (or a single block in `ContentView.swift`) names the three bug families:

```swift
// Bugs found while reading the starter:
//
// 1. Recipe is not Identifiable / Hashable, so List(visibleRecipes) and
//    NavigationLink(value:) cannot compile. (Task 2)
//
// 2. cuisineFilter is `let` in ContentView and FilterBar.selected is `let`,
//    so the filter buttons have nothing to write to. Needs @State in
//    ContentView, @Binding in FilterBar, and `$cuisineFilter` at the
//    call site. (Task 3)
//
// 3. RecipeDetailView declares `@State var store: FavoritesStore`, so it
//    creates a SEPARATE store from ContentView's. Toggling favorite in
//    detail does not update the parent. Should be `var store` (plain) or
//    `@Bindable var store` since FavoritesStore is @Observable. (Task 6a)
```

Even one or two sentences per bug is enough as long as all three classes of bug are named. The point is to demonstrate code-reading and not just shotgun-fix.

---

### Task 2 — Recipe Identifiable + Hashable

**What was broken.** `List(items)` requires `Identifiable` (so SwiftUI can diff rows). `NavigationLink(value:)` plus `.navigationDestination(for: Recipe.self)` requires `Hashable` (so SwiftUI can use the value as a routing key). `Recipe` had neither, so the file did not compile.

**Fix.** Add conformance and a computed `id`. `Hashable` auto-synthesizes because every stored property (`String`, `Int`, `[String]`) is itself `Hashable`.

```swift
struct Recipe: Codable, Identifiable, Hashable {
    var id: String { slug }                 // slug is the natural unique key

    let slug: String
    let title: String
    let cuisine: String
    let minutes: Int
    let ingredients: [String]
    let imageURL: String

    enum CodingKeys: String, CodingKey {
        case slug, title, cuisine, minutes, ingredients
        case imageURL = "image_url"
    }
}
```

You do NOT need to declare `static func ==` or `func hash(into:)`. The compiler synthesizes both.

---

### Task 3 — Wire FilterBar with @Binding

**What was broken.** Three places, all interlocking:
- Parent declared `cuisineFilter` as `let` -> nothing to mutate.
- Child declared `selected` as `let` -> can't write to a parent's `@State` even if it had one.
- Call site passed `cuisineFilter` (the value), not `$cuisineFilter` (the binding).

**Fix.**

In `ContentView.swift`:

```swift
@State private var cuisineFilter: String = "All"   // was: let

// ...

FilterBar(selected: $cuisineFilter,                // was: cuisineFilter
          options: ["All", "Italian", "Thai", "Japanese"])
```

In `FilterBar.swift`:

```swift
struct FilterBar: View {
    @Binding var selected: String                   // was: let selected: String
    let options: [String]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(options, id: \.self) { option in
                Button(option) {
                    selected = option               // was: commented out
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(option == selected ? Color.orange : Color.clear)
                .foregroundStyle(option == selected ? .white : .orange)
                .cornerRadius(8)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }
}
```

Tapping a button now writes through the binding to the parent's `@State`, which triggers `body` to recompute, which filters `visibleRecipes`.

---

### Task 4 — Persist favorites with UserDefaults

**Why a class can't use `@AppStorage` directly.** `@AppStorage` is a SwiftUI property wrapper that only works inside a `View` (it subscribes the view to changes). In a plain `@Observable` class, drop down to `UserDefaults.standard`. The brief allows that.

```swift
@Observable
final class FavoritesStore {
    private let key = "favoriteSlugs"

    var favoriteSlugs: Set<String> = [] {
        didSet { save() }
    }

    init() {
        load()
    }

    func isFavorite(_ recipe: Recipe) -> Bool {
        favoriteSlugs.contains(recipe.slug)
    }

    func toggle(_ recipe: Recipe) {
        if favoriteSlugs.contains(recipe.slug) {
            favoriteSlugs.remove(recipe.slug)
        } else {
            favoriteSlugs.insert(recipe.slug)
        }
    }

    private func load() {
        guard
            let data = UserDefaults.standard.data(forKey: key),
            let decoded = try? JSONDecoder().decode(Set<String>.self, from: data)
        else { return }
        favoriteSlugs = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(favoriteSlugs) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }
}
```

Notes:
- `didSet { save() }` runs on every mutation including `insert`/`remove`. This is the cleanest pattern.
- `try?` is acceptable because the failure path (bad bytes / corrupt JSON) just falls back to an empty set; we don't surface it to the UI.
- No force unwraps anywhere.

---

### Task 5 — Fetch data from a remote URL

```swift
func load() async {
    guard let url = URL(string: "https://example.com/recipes.json") else {
        errorMessage = "Invalid URL"
        return
    }
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        recipes = try JSONDecoder().decode([Recipe].self, from: data)
    } catch {
        errorMessage = error.localizedDescription
    }
}
```

And on the `VStack` (or `List`) inside `NavigationStack`:

```swift
.task { await load() }
```

Key correctness points:
- `guard let url` (NOT `URL(string:)!`).
- `try await URLSession.shared.data(from:)` (the async variant).
- `[Recipe].self` because the response is a JSON array.
- All errors caught and surfaced via `errorMessage`, never crashed.
- `.task` rather than `.onAppear { Task { ... } }` (both work, but `.task` is the idiomatic choice and auto-cancels).

---

### Task 6 — Detail view: fix `@State` + render ingredients

**6a. The `@State` -> plain `var` (or `@Bindable`) fix.**

```swift
struct RecipeDetailView: View {
    let recipe: Recipe
    var store: FavoritesStore                       // was: @State var store

    var body: some View {
        // ... unchanged
    }
}
```

Why `var store: FavoritesStore` (plain) is enough: `FavoritesStore` is `@Observable`. Any property of an `@Observable` class read inside `body` automatically subscribes that view to changes on that property. You don't need any wrapper to *receive* an observable — only the *creator* needs `@State`.

`@Bindable var store: FavoritesStore` is also accepted. The only practical difference is that `@Bindable` unlocks the `$store.field` syntax for two-way bindings into the model, which we don't need in this particular view.

What was broken: `@State var store` told SwiftUI "this view CREATES this storage." On first appear, SwiftUI ignored the value passed in and instead instantiated a fresh `FavoritesStore()` for the detail view's private use. Toggles in detail view mutated that private instance; the parent's instance never saw the change. The `testFavoriteSharedAcrossViews` test exists exactly to catch this.

**6b. Ingredients list.**

```swift
VStack(alignment: .leading, spacing: 4) {
    ForEach(recipe.ingredients, id: \.self) { ingredient in
        Text("- \(ingredient)")
    }
}
```

Why `id: \.self`: `String` is `Hashable`, and `recipe.ingredients` is `[String]`. SwiftUI needs an identity for each row in the `ForEach`; using the string itself is fine here as long as ingredients are unique within a single recipe.

---

## Grading Rubric

| Task | Points | What earns full credit | Common partial credit |
|---|---|---|---|
| 1 — Identify bugs | 1 | All three bug classes named in a comment (Identifiable, FilterBar @Binding, detail @State). | 0.5 pt for naming any one or two. |
| 2 — Identifiable + Hashable | 3 | `Recipe` conforms to both, `id == slug`, list compiles and renders. No hand-written `==` or `hash(into:)`. | 2 pt if only `Identifiable` (with explicit `id: \.slug` on the List instead) but `NavigationLink(value:)` then fails to compile, costing 1 pt. |
| 3 — FilterBar binding | 3 | All three changes made: `@State` in parent, `@Binding` in child, `$cuisineFilter` at call site, and tap visibly filters the list. | 1 pt for any one of the three; 2 pt for two-of-three (e.g. forgot the `$` so it doesn't compile). |
| 4 — UserDefaults persistence | 4 | `favoriteSlugs` survives a relaunch (test passes), `save()` runs on every mutation, `load()` runs in init, no force unwraps. | 2 pt if it persists but uses `[String]` instead of `Set<String>`; 1 pt if you encode but never decode on launch; 1 pt if you save manually only from `toggle()` but forget the `didSet` and a future mutation path skips persistence. |
| 5 — API fetch | 5 | Correct URL, `try await URLSession.shared.data(from:)`, decode `[Recipe]`, error caught and surfaced, `.task { await load() }` wired up. | 3 pt if it fetches but force-unwraps `URL(string:)!`; 2 pt if you used `.onAppear` without wrapping in `Task { }`; 4 pt if errors crash instead of setting `errorMessage`. |
| 6a — Fix @State on store | 2 | Declaration changed to `var store` or `@Bindable var store`; `testFavoriteSharedAcrossViews` passes. | 1 pt if you correctly diagnosed the bug in a comment but wrote `@State` again or used a wrapper that doesn't compile. |
| 6b — Ingredients ForEach | 2 | `ForEach(recipe.ingredients, id: \.self)` rendering one `Text("- \(ingredient)")` per row inside the leading-aligned VStack. | 1 pt if you rendered the ingredients but used `Text(recipe.ingredients.joined(separator: "\n"))` or left out the `"- "` prefix. |
| **Total** | **20** | | |

### Penalties (apply once across the whole submission)

- Any `!` force-unwrap on `URL(string:)`, `Int(_:)`, `Double(_:)`, dictionary subscript, or `as!`: **-1 pt**.
- Project does not compile: cap at 10 pt regardless of partial work (graders run tests).
- Using `NavigationView` instead of `NavigationStack`: **-1 pt**.
- Hand-written `==` / `hash(into:)` on `Recipe` when auto-synthesis would have worked: -0.5 pt (style penalty, applied once).

---

## Self-grading checklist

- [ ] All six tests pass: `testRecipeIsIdentifiableBySlug`, `testFilterBarUpdatesParentSelection`, `testFavoriteToggleSurvivesRelaunch`, `testFavoriteSharedAcrossViews`, `testFetchDecodesRecipes`, `testIngredientsRenderedInDetail`.
- [ ] No force unwraps anywhere in submitted code.
- [ ] `Recipe` conforms to `Identifiable` and `Hashable`, and `id == slug`.
- [ ] `cuisineFilter` is `@State private var` in `ContentView`; `FilterBar.selected` is `@Binding`; the call site uses `$cuisineFilter`.
- [ ] Tapping a filter button visibly changes which recipes appear in the list.
- [ ] `FavoritesStore` saves on every mutation (via `didSet`) and loads in `init`.
- [ ] `.task { await load() }` is attached to a view inside `NavigationStack` (not the stack itself).
- [ ] `load()` catches all errors and writes them to `errorMessage`; never crashes on a bad URL or bad JSON.
- [ ] `RecipeDetailView.store` is declared as `var store: FavoritesStore` (or `@Bindable var store`), NOT `@State`.
- [ ] Toggling favorite from inside the detail view causes the row's heart icon in the parent list to update on pop.
- [ ] Ingredients render as a `ForEach` with `"- "` prefix, one `Text` per ingredient.
- [ ] No `NavigationView` anywhere — only `NavigationStack`.
- [ ] You wrote a top-of-file bug-spotting comment for Task 1.
