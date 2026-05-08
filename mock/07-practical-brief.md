# Mock 2 — Practical Exam (Open Book)
**Time: 120 minutes | Total: 20 points**

You will build and refactor a small "Recipe Tracker" iOS app. The starter project compiles partially but is broken in deliberate ways and missing several features. Work through the tasks in order. Your grade is determined by both completeness and the unit tests at the bottom of this brief.

---

## Setup — Starter Code (provided)

Files provided in the Xcode project:

- `Models.swift` — the `Recipe` model and a `FavoritesStore` `@Observable` class.
- `ContentView.swift` — the root `NavigationStack` and recipe list. Has bugs.
- `RecipeDetailView.swift` — recipe detail screen with ingredients and a favorite toggle. Has a state-management bug.
- `FilterBar.swift` — a small filter row that lives above the list. Has a binding bug.
- `RecipeAppTests.swift` — unit tests you must make pass.

### `Models.swift`

```swift
import Foundation
import Observation

// One recipe, decoded from the test JSON URL (see Task 5).
struct Recipe: Codable {
    // TODO (Task 2): make this type Identifiable AND Hashable.
    // The unique id should be the `slug` field (a stable, URL-friendly string
    // like "spaghetti-carbonara"). Two recipes with the same slug count as
    // the same row.

    let slug: String
    let title: String
    let cuisine: String
    let minutes: Int
    let ingredients: [String]
    let imageURL: String

    // JSON uses snake_case. Bridge to camelCase here.
    enum CodingKeys: String, CodingKey {
        case slug
        case title
        case cuisine
        case minutes
        case ingredients
        case imageURL = "image_url"
    }
}

@Observable
final class FavoritesStore {
    // The slugs of the recipes the user has favorited.
    // Persisted across launches via UserDefaults in Task 4.
    var favoriteSlugs: Set<String> = []

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

    // TODO (Task 4): load() reads the JSON-encoded Set<String> from
    //                UserDefaults under the key "favoriteSlugs" and assigns
    //                it to favoriteSlugs.
    // TODO (Task 4): save() encodes favoriteSlugs to JSON and writes it to
    //                UserDefaults under the same key.
    // TODO (Task 4): make load() run automatically in init(), and make save()
    //                run automatically every time favoriteSlugs changes.
}
```

### `ContentView.swift`

```swift
import SwiftUI

struct ContentView: View {
    @State private var store = FavoritesStore()
    @State private var recipes: [Recipe] = []
    @State private var errorMessage: String?

    // BUG (Task 3): this is declared as `let`, but FilterBar needs to write
    //               to it through a @Binding. The compiler will complain;
    //               fix it without removing FilterBar's @Binding.
    let cuisineFilter: String = "All"

    var visibleRecipes: [Recipe] {
        cuisineFilter == "All"
            ? recipes
            : recipes.filter { $0.cuisine == cuisineFilter }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // BUG (Task 3): see FilterBar.swift — the @Binding wiring is broken.
                FilterBar(selected: cuisineFilter, options: ["All", "Italian", "Thai", "Japanese"])

                // BUG (Task 2): the project does not even compile because Recipe
                //               is not Identifiable. Once you fix that, the rows
                //               should also be tappable, pushing RecipeDetailView.
                List(visibleRecipes) { recipe in
                    NavigationLink(value: recipe) {
                        RecipeRow(recipe: recipe, store: store)
                    }
                }
                .navigationDestination(for: Recipe.self) { recipe in
                    RecipeDetailView(recipe: recipe, store: store)
                }
            }
            .navigationTitle("Recipes")
            .overlay {
                if let msg = errorMessage {
                    Text(msg).foregroundStyle(.red).padding()
                }
            }
            // TODO (Task 5): add .task { await load() } so recipes are fetched
            //                on first appear.
        }
    }

    func load() async {
        // TODO (Task 5): fetch from
        // https://example.com/recipes.json   (treat the URL as given; the
        // grader stubs it during testing — see RecipeAppTests.swift)
        // decode into [Recipe], assign to `recipes`.
        // On any failure, set errorMessage. Do not crash.
    }
}

struct RecipeRow: View {
    let recipe: Recipe
    var store: FavoritesStore

    var body: some View {
        HStack(spacing: 12) {
            // The brief uses an SF Symbol as a stand-in for the network image
            // so you don't need an image loader. Do not change this.
            Image(systemName: "fork.knife.circle.fill")
                .font(.system(size: 36))
                .foregroundStyle(.orange)
            VStack(alignment: .leading, spacing: 2) {
                Text(recipe.title).font(.headline)
                Text(recipe.cuisine).font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text("\(recipe.minutes) min").font(.subheadline).foregroundStyle(.secondary)
            if store.isFavorite(recipe) {
                Image(systemName: "heart.fill").foregroundStyle(.pink)
            }
        }
    }
}
```

### `FilterBar.swift`

```swift
import SwiftUI

struct FilterBar: View {
    // BUG (Task 3): this should be a @Binding so taps update the parent's
    //               cuisineFilter. As written, it's a plain `let` — the
    //               buttons have nothing to write to.
    let selected: String
    let options: [String]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(options, id: \.self) { option in
                Button(option) {
                    // BUG (Task 3): this assignment cannot work because
                    // `selected` is a `let`. Once you convert it to a
                    // @Binding, this line should compile.
                    // selected = option
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

### `RecipeDetailView.swift`

```swift
import SwiftUI

struct RecipeDetailView: View {
    let recipe: Recipe

    // BUG (Task 6): this should not be @State — RecipeDetailView is a
    //               receiver, not the creator. Tapping "Favorite" updates
    //               the local copy but the parent's row star never changes
    //               because this is a separate independent FavoritesStore
    //               from the one ContentView created.
    @State var store: FavoritesStore

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(recipe.title)
                .font(.largeTitle)
                .bold()

            Text(recipe.cuisine + " - \(recipe.minutes) min")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("Ingredients").font(.headline).padding(.top, 8)

            // TODO (Task 6): replace this empty VStack with a ForEach that
            //                renders one Text per ingredient, prefixed with
            //                "- " (e.g. "- 200g spaghetti"). Use \.self as id.
            VStack(alignment: .leading, spacing: 4) {

            }

            Spacer()

            Button(store.isFavorite(recipe) ? "Unfavorite" : "Favorite") {
                store.toggle(recipe)
            }
            .buttonStyle(.borderedProminent)
            .tint(.pink)
            .frame(maxWidth: .infinity)
        }
        .padding()
        .navigationTitle(recipe.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}
```

### `RecipeAppTests.swift` (read-only — do not edit)

```swift
import XCTest
@testable import RecipeTracker

final class RecipeAppTests: XCTestCase {
    func testRecipeIsIdentifiableBySlug() { /* ... */ }
    func testFilterBarUpdatesParentSelection() { /* ... */ }
    func testFavoriteToggleSurvivesRelaunch() { /* ... */ }
    func testFavoriteSharedAcrossViews() { /* ... */ }
    func testFetchDecodesRecipes() { /* ... */ }
    func testIngredientsRenderedInDetail() { /* ... */ }
}
```

---

## Tasks (work through in order)

### Task 1 — Read the starter and identify the bugs (1 pt)

Open `ContentView.swift`, `FilterBar.swift`, and `RecipeDetailView.swift`. In a comment at the top of each file (or a single comment block at the top of `ContentView.swift`), list the three classes of bug present:

1. `Recipe` is missing `Identifiable` / `Hashable` (Task 2).
2. `FilterBar.selected` is a `let` instead of a `@Binding`, and `ContentView.cuisineFilter` is a `let` instead of `@State` (Task 3).
3. `RecipeDetailView.store` is `@State` instead of being received as a plain `var` or `@Bindable` (Task 6).

(This is worth 1 pt because being able to read the codebase and *name* the bug is half the battle. The fixes are scored separately.)

### Task 2 — Make Recipe Identifiable + Hashable (3 pt)

`List(visibleRecipes) { ... }` and `NavigationLink(value: recipe)` both require conformance:

- `List(items)` needs `Identifiable` (so it can diff rows across re-renders).
- `NavigationLink(value:)` and `.navigationDestination(for: Recipe.self)` need `Hashable` (so the value can be used as a routing key).

Make `Recipe` conform to both. The `id` should be the `slug` string. `Hashable` should be auto-synthesized — you should not need to write `==` or `hash(into:)` by hand.

Hint: every stored property of `Recipe` is already `Hashable` (`String`, `Int`, `[String]`), so adding `: Hashable` to the type is enough.

### Task 3 — Wire FilterBar with @Binding (3 pt)

Two changes, both required:

1. In `ContentView.swift`, change `let cuisineFilter: String = "All"` to `@State private var cuisineFilter: String = "All"`. Without `@State`, the parent has no mutable storage to bind into.
2. In `FilterBar.swift`, change `let selected: String` to `@Binding var selected: String`, and uncomment the `selected = option` assignment so taps actually update the parent.
3. At the call site in `ContentView`, change `FilterBar(selected: cuisineFilter, ...)` to `FilterBar(selected: $cuisineFilter, ...)` — the `$` is required to pass a binding rather than a value.

After this fix, tapping a filter button must change which recipes appear in the list (driven through `visibleRecipes`).

### Task 4 — Persist favorites with UserDefaults (4 pt)

Implement `FavoritesStore.load()` and `FavoritesStore.save()` so that `favoriteSlugs` survives across launches.

Requirements:
- Use `UserDefaults.standard` with the key `"favoriteSlugs"`.
- `save()` encodes `favoriteSlugs` to JSON `Data` (with `JSONEncoder`) and writes it via `set(_:forKey:)`.
- `load()` reads the `Data` via `data(forKey:)`, decodes into `Set<String>`, and assigns it to `favoriteSlugs`. If the key is missing or decoding fails, leave `favoriteSlugs` empty — do not crash.
- `init()` calls `load()`.
- `save()` runs *every* time `favoriteSlugs` mutates (via a `didSet` observer is the cleanest way; calling it from `toggle()` is also acceptable).

A correct implementation passes `testFavoriteToggleSurvivesRelaunch`.

### Task 5 — Fetch data from a remote URL (5 pt)

Implement `ContentView.load()` and wire it up with `.task { await load() }`.

The URL is:

```
https://example.com/recipes.json
```

The grader stubs the response in tests. The shape is a JSON array:

```json
[
  {
    "slug": "spaghetti-carbonara",
    "title": "Spaghetti Carbonara",
    "cuisine": "Italian",
    "minutes": 25,
    "ingredients": ["200g spaghetti", "100g pancetta", "2 eggs", "pecorino"],
    "image_url": "https://example.com/img/carbonara.jpg"
  },
  {
    "slug": "pad-krapow",
    "title": "Pad Krapow",
    "cuisine": "Thai",
    "minutes": 15,
    "ingredients": ["minced pork", "holy basil", "chili", "garlic", "rice"],
    "image_url": "https://example.com/img/krapow.jpg"
  }
]
```

Note: the JSON key is `image_url` (snake_case) but the Swift field is `imageURL` (camelCase). The starter `CodingKeys` already maps this. You do NOT need a `keyDecodingStrategy`.

Requirements:
- Use `URLSession.shared.data(from:)` with `try await`.
- Decode with `JSONDecoder().decode([Recipe].self, from: data)`.
- On *any* failure (bad URL, network error, decoding error) set `errorMessage = error.localizedDescription`. Do not crash.
- Use `guard let url = URL(string: ...)` — no force-unwrap.
- Wire up `.task { await load() }` so the fetch runs when `ContentView` appears.

### Task 6 — Detail view: fix the @State bug and render ingredients (4 pt)

Two sub-tasks, 2 pt each:

**6a. Fix the @State -> @Bindable / plain var bug (2 pt).**
`RecipeDetailView` was declared with `@State var store: FavoritesStore`. That is wrong on two counts:

- `@State` is for storage *owned and created by this view*, but `FavoritesStore` is created by `ContentView` and passed in. Receiving it with `@State` makes SwiftUI build a separate, independent store — taps here don't update the parent.
- Even worse, `@State` on a plain class (without `@Observable`) wouldn't trigger re-renders at all. (`FavoritesStore` is `@Observable`, so it would, but the disconnected-instance bug is still the dominant issue.)

Change the declaration to one of:

- `var store: FavoritesStore` — plain `var`. Sufficient because `FavoritesStore` is `@Observable` and any access in `body` automatically subscribes.
- `@Bindable var store: FavoritesStore` — also correct; required only if you want `$store.someField` syntax in this view (which we don't here).

Either is acceptable for full credit on this sub-task.

**6b. Render the ingredients list (2 pt).**
Replace the empty `VStack` in `RecipeDetailView` with a `ForEach(recipe.ingredients, id: \.self)` that renders one `Text` per ingredient, prefixed with `"- "`. Example:

```
- 200g spaghetti
- 100g pancetta
- 2 eggs
- pecorino
```

The body alignment is already `.leading`, so the bullets will line up automatically.

---

## Unit Tests (must pass)

These are the names the grader runs. Each maps to one or more tasks.

| Test | What it asserts | Tasks |
|---|---|---|
| `testRecipeIsIdentifiableBySlug` | Two `Recipe` values with the same `slug` are equal and hash to the same bucket; `recipe.id == recipe.slug`. | 2 |
| `testFilterBarUpdatesParentSelection` | After simulating a tap on a filter button, `cuisineFilter` in `ContentView` reflects the new value (binding flows back). | 3 |
| `testFavoriteToggleSurvivesRelaunch` | After `store.toggle(recipe)`, creating a fresh `FavoritesStore()` reads the same `favoriteSlugs` back from `UserDefaults`. | 4 |
| `testFavoriteSharedAcrossViews` | Toggling favorite from inside `RecipeDetailView` is observable on the same `FavoritesStore` instance held by `ContentView` (i.e. the detail view did NOT create its own). | 6a |
| `testFetchDecodesRecipes` | Decoding the provided sample JSON via `JSONDecoder().decode([Recipe].self, ...)` yields the expected count, and the first element's `slug` is `"spaghetti-carbonara"`. | 5 |
| `testIngredientsRenderedInDetail` | A snapshot of `RecipeDetailView`'s body for a given recipe contains one `Text` per ingredient, each prefixed with `"- "`. | 6b |

---

## Grading Notes

- Partial credit is awarded per task — see `08-practical-rubric.md`.
- The unit tests give a pass/fail signal but the rubric determines points.
- Do not change test files. Do not change the `Recipe` field names or `CodingKeys` (you may add computed properties).
- You may use `if let`, `guard let`, `??` freely. Force-unwrap (`!`) on `URL(string:)`, `Int(_:)`, `Double(_:)`, dictionary lookups, or `as!` will lose 1 pt regardless of whether tests pass.
- Total points: 1 + 3 + 3 + 4 + 5 + 4 = **20**.
