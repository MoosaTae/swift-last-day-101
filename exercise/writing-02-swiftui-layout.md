# Topic 2 -- SwiftUI Layout: Writing Drills

Hands-on counterpart to `exercises-02-swiftui-layout.md`. You write the code;
the solution block is for grading yourself afterwards. Every snippet uses
modifiers from the closed-book toolkit: `VStack`/`HStack`/`ZStack`,
`Spacer`, `Divider`, `frame`, `padding`, `background`, `foregroundStyle`,
`cornerRadius`/`clipShape`, `overlay`, `Image` with `resizable`/`scaledToFit`/
`scaledToFill`, `Text` modifiers (`font`, `fontWeight`, `lineLimit`,
`multilineTextAlignment`), `ScrollView`, `LazyVStack`/`LazyVGrid`, `GridItem`.

Six exercises, easy -> exam-level. Budget per exercise is in the heading.
Modifier ORDER is graded, so re-read the wireframe and the behavior bullets
before you peek.

---

## Ex 1 -- Wireframe: vertical title card (~5-8 min)

Target wireframe (ASCII, monospace):

```
+----------------------------+
|                            |
|         Welcome            |
|                            |
|       to SwiftUI           |
|                            |
|     - - - - - - - - -      |
|                            |
|       Get Started          |
|                            |
+----------------------------+
```

Behavior / layout:
- A single `VStack` centred horizontally, three text lines plus a `Divider`.
- `Welcome` uses `.largeTitle` + bold; `to SwiftUI` uses `.title3` and
  secondary foreground style.
- A `Divider()` sits between the subtitle and the call-to-action line.
- `Get Started` uses `.headline` weight and the system blue colour.
- Spacing between siblings is 16pt; the whole card has 24pt padding.

Write this view from a blank `body`. No external state; this is pure layout.

<details><summary>Solution</summary>

```swift
import SwiftUI

struct WelcomeCard: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Welcome")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("to SwiftUI")
                .font(.title3)
                .foregroundStyle(.secondary)

            Divider()

            Text("Get Started")
                .font(.headline)
                .foregroundStyle(.blue)
        }
        .padding(24)
    }
}
```

Trap to notice: the default `VStack` alignment is `.center`, which is exactly
what the wireframe asks for. If a future variant needed left-aligned text,
you would swap to `VStack(alignment: .leading, spacing: 16)`. Also note
`Divider()` only draws a thin horizontal line; do not waste effort wrapping
it in a `Rectangle`.
</details>

---

## Ex 2 -- Wireframe: nested stacks with badge (~10 min)

Target wireframe (ASCII, monospace):

```
+----------------------------------------+
|                                        |
|  Inbox                          [ 12 ] |
|                                        |
|  - - - - - - - - - - - - - - - - - -   |
|                                        |
|  Messages          Updated just now    |
|                                        |
+----------------------------------------+
```

Behavior / layout:
- Outer container is a `VStack(alignment: .leading, spacing: 12)` with 16pt
  padding all around.
- The first row is an `HStack` whose left side shows `Inbox` in `.title2` +
  bold, and whose right side shows a small pill `12` (white text on blue,
  6pt horizontal / 2pt vertical padding, rounded 10).
- The middle is a full-width `Divider`.
- The third row is an `HStack` with `Messages` on the left in `.headline` and
  `Updated just now` trailing-aligned in `.caption` + secondary foreground.
- The card itself fills the parent width (use `.frame(maxWidth: .infinity)`)
  and has `Color(.secondarySystemBackground)` behind it with corner radius 12.

<details><summary>Solution</summary>

```swift
import SwiftUI

struct InboxHeader: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Inbox")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                Text("12")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.blue)
                    .cornerRadius(10)
            }

            Divider()

            HStack {
                Text("Messages")
                    .font(.headline)

                Spacer()

                Text("Updated just now")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}
```

Trap to notice: the badge MUST apply `.padding` BEFORE `.background` so the
blue colour wraps the inner padding. Reverse that order and the blue pill
shrinks to hug the digits with a transparent gap around it. Also note
`.frame(maxWidth: .infinity, alignment: .leading)` -- without the alignment
argument, `VStack(alignment: .leading)` would still centre its children
inside an over-wide frame.
</details>

---

## Ex 3 -- Refactor: profile header that renders wrong (~10 min)

This compiles, but the avatar is the wrong size, the badge looks broken, the
card does not fill the device width, and the text is centred when it should
be leading. List every smell you see (>=4), then rewrite it.

```swift
import SwiftUI

struct BrokenProfile: View {
    var body: some View {
        VStack {
            HStack {
                VStack {
                    Image("avatar")
                        .frame(width: 64, height: 64)
                        .resizable()
                        .clipShape(Circle())
                }

                VStack {
                    Text("Jane Doe")
                        .font(.title2)
                    Text("iOS Developer")
                        .font(.subheadline)
                }

                Text("PRO")
                    .foregroundColor(.white)
                    .background(Color.purple)
                    .cornerRadius(8)
                    .padding(6)
            }
            .frame(width: 320)
        }
        .padding()
    }
}
```

<details><summary>Solution</summary>

Smells:
- `.frame` is applied BEFORE `.resizable()` on the avatar. `.resizable()`
  must wrap the original `Image`, otherwise the bitmap renders at intrinsic
  size inside a 64x64 box. Correct order: `.resizable() -> .scaledToFill()
  -> .frame -> .clipShape`.
- The avatar is wrapped in a redundant single-child `VStack` -- the outer
  `HStack` can hold the `Image` directly.
- The text column uses `VStack` with default `.center` alignment, so the two
  lines are centred relative to each other instead of sharing a leading
  edge. It must be `VStack(alignment: .leading, spacing: 2)`.
- There is no `Spacer()` between the text column and the `PRO` badge, so the
  HStack centres its children and the badge is not pinned to the trailing
  edge.
- The badge applies `.padding(6)` AFTER `.background(...).cornerRadius(8)`,
  so the purple pill hugs the glyphs and the padding is OUTSIDE the colour.
  The intended pill needs `.padding(...)` BEFORE `.background -> .cornerRadius`.
- `.frame(width: 320)` is hard-coded -- breaks on iPhone SE and looks
  awkward on iPhone Pro Max. Use `.frame(maxWidth: .infinity)` so the card
  fills the available width.
- `foregroundColor` still works but the modern API is `foregroundStyle`;
  acceptable to flag (style preference, not strictly a bug).

Rewritten:

```swift
import SwiftUI

struct FixedProfile: View {
    var body: some View {
        HStack(spacing: 12) {
            Image("avatar")
                .resizable()
                .scaledToFill()
                .frame(width: 64, height: 64)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text("Jane Doe")
                    .font(.title2)
                    .fontWeight(.bold)
                Text("iOS Developer")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text("PRO")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.purple)
                .cornerRadius(8)
        }
        .padding()
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(12)
    }
}
```

The headline trap here is modifier ORDER on the badge: `padding -> background
-> cornerRadius` is the only ordering that paints a coloured pill that
includes the padding. Memorize that recipe.
</details>

---

## Ex 4 -- Wireframe: product card row (~12 min)

Target wireframe (ASCII, monospace):

```
+--------------------------------------------------------+
|                                                        |
|  +--------+   AirPods Pro                    $249.00   |
|  |        |   Wireless ANC earbuds                     |
|  |  IMG   |                                            |
|  |        |                          [   Add   ]       |
|  +--------+                                            |
|                                                        |
+--------------------------------------------------------+
```

Behavior / layout:
- Image is 80x80 with rounded corners (radius 12). Asset name `airpods`. It
  must scale to fill its frame and clip overflow.
- The middle column is a `VStack(alignment: .leading)` with the product name
  in `.headline` and the subtitle in `.subheadline` + secondary style.
- The right column has the price `$249.00` on the FIRST line aligned to the
  trailing edge in `.headline` weight, and an `Add` button below it (also
  trailing-aligned). The button looks like a blue pill: white text,
  horizontal 16pt / vertical 8pt padding, corner radius 16.
- The price and the button must align to the trailing edge regardless of how
  long the title becomes -- use `Spacer()` not hard-coded widths.
- The whole row has 12pt padding, fills the parent width, and has
  `Color(.secondarySystemBackground)` behind it with corner radius 16.

<details><summary>Solution</summary>

```swift
import SwiftUI

struct ProductRow: View {
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image("airpods")
                .resizable()
                .scaledToFill()
                .frame(width: 80, height: 80)
                .clipped()
                .cornerRadius(12)

            VStack(alignment: .leading, spacing: 4) {
                Text("AirPods Pro")
                    .font(.headline)
                Text("Wireless ANC earbuds")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 12) {
                Text("$249.00")
                    .font(.headline)

                Button(action: {}) {
                    Text("Add")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.blue)
                        .cornerRadius(16)
                }
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
    }
}
```

Two traps:
1. The OUTER `HStack` uses `alignment: .top` so the image and the right-hand
   column stay pinned to the top instead of vertically centring around the
   tallest child. Without it, a one-line title would visually float below
   the image's top edge.
2. `.scaledToFill()` without `.clipped()` lets the image bleed outside the
   80x80 frame -- and the rounded corners would then be invisible because
   they clip the FRAME, not the overflow. Order: `resizable -> scaledToFill
   -> frame -> clipped -> cornerRadius`.
</details>

---

## Ex 5 -- Wireframe: header + scrollable grid + footer (~15 min)

Target wireframe (ASCII, monospace):

```
+----------------------------------------+
| <      Photos                   [ + ]  |  <- fixed header
+----------------------------------------+
|                                        |
|  +-------+  +-------+  +-------+       |
|  |       |  |       |  |       |       |
|  | IMG 1 |  | IMG 2 |  | IMG 3 |       |
|  |       |  |       |  |       |       |
|  +-------+  +-------+  +-------+       |
|                                        |
|  +-------+  +-------+  +-------+       |  <- scrolls
|  |       |  |       |  |       |       |
|  | IMG 4 |  | IMG 5 |  | IMG 6 |       |
|  |       |  |       |  |       |       |
|  +-------+  +-------+  +-------+       |
|                                        |
|  ...                                   |
|                                        |
+----------------------------------------+
| 12 photos                  [Select]    |  <- fixed footer
+----------------------------------------+
```

Behavior / layout:
- Outermost is a `VStack(spacing: 0)` filling the full height.
- The HEADER is an `HStack`: `chevron.left` SF Symbol leading, the title
  `Photos` in `.headline` centred between two `Spacer()`s, and a `plus` SF
  Symbol trailing. 16pt horizontal / 12pt vertical padding. A `Divider()`
  sits below it.
- The MIDDLE is a `ScrollView` containing a `LazyVGrid` with three flexible
  columns (8pt spacing between columns and rows). Each grid cell is a
  120x120 placeholder rendered as `Color.gray` with corner radius 12, with a
  centred `Text("IMG \(n)")` overlay. Use `1...12` for the items via
  `ForEach`.
- The FOOTER is an `HStack`: `12 photos` leading in `.subheadline` +
  secondary, and a `Select` button trailing in `.subheadline` + bold blue.
  16pt horizontal / 12pt vertical padding. A `Divider()` sits above it.
- Header and footer must NEVER scroll. Only the grid scrolls.

<details><summary>Solution</summary>

```swift
import SwiftUI

struct PhotosScreen: View {
    private let columns = Array(
        repeating: GridItem(.flexible(), spacing: 8),
        count: 3
    )

    var body: some View {
        VStack(spacing: 0) {
            // Header
            HStack {
                Image(systemName: "chevron.left")
                    .font(.title3)
                    .foregroundStyle(.blue)

                Spacer()

                Text("Photos")
                    .font(.headline)

                Spacer()

                Image(systemName: "plus")
                    .font(.title3)
                    .foregroundStyle(.blue)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            Divider()

            // Scrollable grid
            ScrollView {
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(1...12, id: \.self) { n in
                        ZStack {
                            Color.gray
                            Text("IMG \(n)")
                                .foregroundStyle(.white)
                                .font(.caption)
                                .fontWeight(.semibold)
                        }
                        .frame(height: 120)
                        .cornerRadius(12)
                    }
                }
                .padding(16)
            }

            Divider()

            // Footer
            HStack {
                Text("12 photos")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                Button("Select") {}
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(.blue)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }
}
```

Traps that catch learners:
- Two `Spacer()`s around the header title is the canonical "centred title
  with leading and trailing icons" pattern. A single `Spacer` would shove
  the title to one side.
- `GridItem(.flexible(), spacing: 8)` at the column level controls the
  HORIZONTAL gap; the `LazyVGrid(spacing: 8)` argument controls the
  VERTICAL gap between rows. They are different axes.
- `Color.gray.frame(height: 120)` works because `Color` is a `View` that
  fills available space. Without `.frame(height: 120)` the colour would
  collapse to zero height inside the grid cell.
- The whole layout uses `VStack(spacing: 0)` so the dividers sit flush
  against the header/footer rows -- a default spacing would visually break
  the iOS-native look.
</details>

---

## Ex 6 -- Mini-project: profile screen with acceptance checklist + tests (~25-30 min)

Spec:
- Build a screen called `ProfileScreen` that shows the following sections in
  one scrollable `VStack`:
  1. Hero header: a 160pt-tall `Color.blue` band with a 96x96 circular
     avatar (`Image("avatar")`) overlapping the bottom edge by 48pt. The
     avatar has a 4pt white ring (use `.overlay { Circle().stroke(.white,
     lineWidth: 4) }`).
  2. Name `Tae S.` in `.title` weight `.bold`, secondary subtitle
     `iOS Developer` -- both centred horizontally, 8pt below the avatar.
  3. A 3-up stat row (`Posts 42 / Followers 1.2k / Following 180`). Each
     cell uses `.frame(maxWidth: .infinity)` so they split the row evenly.
     Number on top in `.title2` bold, label below in `.caption` secondary.
  4. A `Divider()`.
  5. Three `SettingsRow` items with SF Symbols (`bell.fill`,
     `lock.fill`, `questionmark.circle.fill`), each row has icon + title +
     trailing `chevron.right`.
- Build a child view `SettingsRow` that takes `icon: String` and `title:
  String` and renders the row described above. The icon goes in a 28pt-wide
  leading slot so all titles align vertically across rows.
- Drive the stat values from a tiny backing model `ProfileVM` so the test
  suite below can assert on them. The view reads from the model; no other
  state.

Starter (`ContentView.swift`):

```swift
import SwiftUI
import Observation

@Observable
final class ProfileVM {
    var name: String = "Tae S."
    var subtitle: String = "iOS Developer"
    var posts: Int = 42
    var followers: String = "1.2k"
    var following: Int = 180
}

struct SettingsRow: View {
    let icon: String
    let title: String
    var body: some View { Text("TODO") }
}

struct ProfileScreen: View {
    var body: some View { Text("TODO") }
}
```

Acceptance checklist (visual oracle -- tick every box before declaring done):

1. The hero band is exactly 160pt tall and uses `Color.blue`.
2. The avatar is 96x96, circular, and has a 4pt white ring.
3. The avatar overlaps the bottom of the hero band by 48pt (i.e. half of it
   is over the band, half is below).
4. The name `Tae S.` is below the avatar, centred horizontally, in `.title`
   weight `.bold`.
5. The subtitle `iOS Developer` is below the name, centred, in
   `.subheadline` with secondary foreground style.
6. The stat row has THREE equal-width cells separated by `Spacer`-equivalent
   spacing (use `frame(maxWidth: .infinity)` per cell, not `Spacer`).
7. Each stat cell shows the number on the FIRST line in `.title2` bold and
   the label on the SECOND line in `.caption` secondary.
8. A `Divider()` separates the stat row from the settings list.
9. Each `SettingsRow` shows: SF Symbol leading (28pt-wide slot), title,
   `Spacer`, `chevron.right` trailing.
10. All settings rows have their titles aligned to the same X coordinate.
11. The whole screen scrolls (wrap the VStack in a `ScrollView`).
12. The hero band's blue colour fills the device width (no horizontal
    margin).
13. The settings rows have horizontal padding so they do not touch the
    screen edges.
14. Modifier order on the avatar: `.resizable() -> .scaledToFill() ->
    .frame(96, 96) -> .clipShape(Circle()) -> .overlay { Circle().stroke }`.
15. Modifier order on each stat cell: content -> `.frame(maxWidth: .infinity)`
    -> (no background needed).

Oracle (`Tests.swift`) -- the parts grading machinery can verify:

```swift
import XCTest
@testable import App

final class ProfileVMTests: XCTestCase {
    func test_default_values() {
        let vm = ProfileVM()
        XCTAssertEqual(vm.name, "Tae S.")
        XCTAssertEqual(vm.subtitle, "iOS Developer")
        XCTAssertEqual(vm.posts, 42)
        XCTAssertEqual(vm.followers, "1.2k")
        XCTAssertEqual(vm.following, 180)
    }

    func test_name_is_mutable() {
        let vm = ProfileVM()
        vm.name = "Alex"
        XCTAssertEqual(vm.name, "Alex")
    }
}

final class SettingsRowTests: XCTestCase {
    // Smoke test: the row constructs with the public init shape we need.
    func test_row_init_takes_icon_and_title() {
        let row = SettingsRow(icon: "bell.fill", title: "Notifications")
        // Mirror gives access to stored properties without depending on body.
        let mirror = Mirror(reflecting: row)
        let icon = mirror.children.first { $0.label == "icon" }?.value as? String
        let title = mirror.children.first { $0.label == "title" }?.value as? String
        XCTAssertEqual(icon, "bell.fill")
        XCTAssertEqual(title, "Notifications")
    }
}
```

(Note: the practical exam runs unit tests against the model and trivial
view init shapes; the visual checklist replaces the missing snapshot
oracle.)

<details><summary>Solution</summary>

```swift
import SwiftUI
import Observation

@Observable
final class ProfileVM {
    var name: String = "Tae S."
    var subtitle: String = "iOS Developer"
    var posts: Int = 42
    var followers: String = "1.2k"
    var following: Int = 180
}

struct SettingsRow: View {
    let icon: String
    let title: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.blue)
                .frame(width: 28)

            Text(title)
                .font(.body)

            Spacer()

            Image(systemName: "chevron.right")
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

struct StatCell: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

struct ProfileScreen: View {
    @State private var vm = ProfileVM()

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // 1. Hero band with overlapping avatar
                ZStack(alignment: .bottom) {
                    Color.blue
                        .frame(height: 160)
                        .frame(maxWidth: .infinity)

                    Image("avatar")
                        .resizable()
                        .scaledToFill()
                        .frame(width: 96, height: 96)
                        .clipShape(Circle())
                        .overlay {
                            Circle().stroke(.white, lineWidth: 4)
                        }
                        .offset(y: 48)   // half of 96 -> overlaps by 48
                }
                .padding(.bottom, 48)    // make room for the offset avatar

                // 2. Name + subtitle
                VStack(spacing: 4) {
                    Text(vm.name)
                        .font(.title)
                        .fontWeight(.bold)
                    Text(vm.subtitle)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 8)
                .padding(.bottom, 16)

                // 3. Stat row
                HStack(spacing: 0) {
                    StatCell(value: "\(vm.posts)", label: "Posts")
                    StatCell(value: vm.followers, label: "Followers")
                    StatCell(value: "\(vm.following)", label: "Following")
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 16)

                // 4. Divider
                Divider()
                    .padding(.horizontal, 16)

                // 5. Settings rows
                VStack(spacing: 0) {
                    SettingsRow(icon: "bell.fill", title: "Notifications")
                    Divider().padding(.leading, 56)
                    SettingsRow(icon: "lock.fill", title: "Privacy")
                    Divider().padding(.leading, 56)
                    SettingsRow(icon: "questionmark.circle.fill", title: "Help")
                }
                .padding(.top, 8)
            }
        }
    }
}

#Preview {
    ProfileScreen()
}
```

Why each piece works:
- The hero uses `ZStack(alignment: .bottom)` so the avatar is anchored to
  the bottom edge of the blue band; `.offset(y: 48)` then shifts it down by
  half its height, producing the half-over / half-under overlap. The
  outer `.padding(.bottom, 48)` reserves the space the offset would
  otherwise eat into.
- The avatar's modifier ORDER is exam-bait. `.resizable()` MUST come first;
  `.clipShape(Circle())` must come AFTER `.frame(...)` so the circle clips
  the framed bitmap; `.overlay { Circle().stroke }` then paints the ring on
  top of the clipped area.
- The stat row is three `StatCell`s with `.frame(maxWidth: .infinity)`
  instead of `Spacer()`s. That keeps the cells equal-width regardless of
  number length (`1.2k` is wider than `42`).
- `SettingsRow` puts the icon in a fixed 28pt-wide slot via `.frame(width:
  28)`, which is what aligns the titles vertically across rows.
- Divider insets (`.padding(.leading, 56)`) match `16pt outer + 28pt icon
  + 12pt spacing` so the divider starts under the title text -- the iOS
  list-style convention.

The testable parts (`ProfileVM` defaults, `SettingsRow` init reflectivity)
let an automated grader confirm the structure without needing a snapshot
oracle. Everything visual is in the acceptance checklist above.
</details>

---

## Self-grading reminders

Before declaring an exercise done, mentally render the wireframe one more
time and ask:

1. Did I order modifiers correctly? `padding -> background -> cornerRadius`
   for filled pills; `resizable -> scaledTo... -> frame -> clipped/clipShape`
   for images.
2. Did I use `Spacer()` where the wireframe needed an edge anchor?
3. Did I pick the right alignment on each stack? Default `VStack` is
   `.center` -- if the text reads left-aligned in the wireframe, you need
   `VStack(alignment: .leading)`.
4. Did I avoid hard-coded widths where `.frame(maxWidth: .infinity)` would
   adapt to device size?
5. Are nested stacks justified, or could a single `.background` modifier
   replace a one-child `ZStack`?
