# Topic 8 — View Decomposition: Practice

A practice pack of wireframes to decompose into SwiftUI views using only `VStack`, `HStack`, `Text`, `Image`, and `Spacer`. Modifiers like `.font`, `.foregroundColor`, `.fontWeight`, and `.padding` are fair game — keep them minimal.

> **React framing:** view decomposition is **identical to React component decomposition**. Translation: `VStack` = `<div className="flex flex-col">`, `HStack` = `<div className="flex flex-row">`, `Spacer()` = a `<div className="flex-1"/>` filler (or `ml-auto`), `.frame(maxWidth: .infinity)` = `flex-1`. The skill — looking at a wireframe and identifying which axis the top level is on — is the same one you already use for JSX.

## Section A — View Decomposition

### Q1

```text
+----------------------------+
| Inbox                      |
| 3 unread messages          |
| Last sync: 12:04           |
+----------------------------+
```

Regions:
- Line 1: section title "Inbox"
- Line 2: subtitle text
- Line 3: small footnote text

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct InboxSummaryView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Inbox")
                .font(.title)
                .fontWeight(.bold)
            Text("3 unread messages")
                .font(.subheadline)
            Text("Last sync: 12:04")
                .font(.caption)
                .foregroundColor(.gray)
        }
    }
}
```

Why: outer VStack — three lines stacked top-to-bottom with no horizontal siblings, so a single VStack is enough. `.leading` keeps all three flush to the left edge.

> **React:** `<div className="flex flex-col items-start gap-1">` with three children — same shape.
</details>

### Q2

```text
+----------------------------------+
|  +------+   Jane Doe             |
|  | IMG  |   iOS Developer        |
|  +------+                        |
+----------------------------------+
```

Regions:
- Left: square avatar image (asset name `"avatar"`)
- Right column: name on top, role subtitle below

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct ProfileCardView: View {
    var body: some View {
        HStack(spacing: 12) {
            Image("avatar")
                .resizable()
                .scaledToFill()
                .frame(width: 64, height: 64)
            VStack(alignment: .leading, spacing: 4) {
                Text("Jane Doe")
                    .font(.headline)
                Text("iOS Developer")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            Spacer()
        }
    }
}
```

Why: outer HStack — image and text column sit side by side at the top level; the text column is itself a nested VStack. Trailing `Spacer()` pushes content to the leading edge.

> **React:** `<div className="flex flex-row gap-3"><img/><div className="flex flex-col"><h3/><p/></div><div className="flex-1"/></div>`.
</details>

### Q3

```text
+--------------------------------------------+
| [bell]  Notifications     On            >  |
+--------------------------------------------+
```

Regions:
- Leading: SF Symbol `"bell.fill"`
- Label: "Notifications"
- Trailing-but-before-chevron: current value text "On"
- Trailing edge: SF Symbol `"chevron.right"`

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct SettingsRowView: View {
    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "bell.fill")
                .foregroundColor(.orange)
            Text("Notifications")
            Spacer()
            Text("On")
                .foregroundColor(.gray)
            Image(systemName: "chevron.right")
                .foregroundColor(.gray)
        }
    }
}
```

Why: outer HStack — everything is on a single row. The `Spacer()` between the label and the value pushes the value + chevron to the trailing edge while keeping icon + label on the leading edge.

> **React:** the classic settings-row shape — `<div className="flex items-center gap-3"><Icon/><span>Notifications</span><div className="flex-1"/><span>On</span><ChevronRight/></div>`.
</details>

### Q4

```text
+----------------------------+
|                            |
|         HEADER IMG         |
|                            |
+----------------------------+
| Sourdough Bread            |
| A crusty, tangy loaf       |
| baked at 230 C.            |
+----------------------------+
```

Regions:
- Top: wide header image (asset `"bread"`)
- Below: title in bold, then a multi-line description

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct RecipeCardView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Image("bread")
                .resizable()
                .scaledToFill()
                .frame(height: 180)
            Text("Sourdough Bread")
                .font(.headline)
            Text("A crusty, tangy loaf baked at 230 C.")
                .font(.body)
                .foregroundColor(.gray)
        }
    }
}
```

Why: outer VStack — image stacks above the text block in pure top-to-bottom layout. `.leading` left-aligns the title and description.
</details>

### Q5

```text
+------------------+------------------+
|       12         |       58         |
|     Posts        |    Followers     |
+------------------+------------------+
|       7          |      3.4         |
|    Following     |     Rating       |
+------------------+------------------+
```

Regions:
- Four stat cells, each with a big number on top and a caption below
- Two cells per row, two rows

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct StatGridView: View {
    var body: some View {
        VStack(spacing: 16) {
            HStack(spacing: 16) {
                VStack {
                    Text("12").font(.title).fontWeight(.bold)
                    Text("Posts").font(.caption).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                VStack {
                    Text("58").font(.title).fontWeight(.bold)
                    Text("Followers").font(.caption).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
            }
            HStack(spacing: 16) {
                VStack {
                    Text("7").font(.title).fontWeight(.bold)
                    Text("Following").font(.caption).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                VStack {
                    Text("3.4").font(.title).fontWeight(.bold)
                    Text("Rating").font(.caption).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}
```

Why: outer VStack — the grid is two rows stacked vertically; each row is an HStack of two cells. `.frame(maxWidth: .infinity)` on each cell makes them split the row equally — the closed-book trick for "equal columns" without `Grid` or `LazyVGrid`.

> **React:** `<div className="grid grid-cols-2 gap-4">` with four cells — or two `<div className="flex gap-4">` rows of `flex-1` cells. SwiftUI's no-Grid trick is exactly the `flex-1` pattern.
</details>

### Q6

```text
+------------------------------------------+
| (O)  Ada Lovelace  @ada   . 2h           |
|      Just shipped a new SwiftUI view!    |
|      It uses only stacks.                |
|      [reply] [retweet] [like] [share]    |
+------------------------------------------+
```

Regions:
- Leading: round avatar image (asset `"ada"`)
- Right column has three vertically-stacked rows:
  1. Header row: display name, handle, dot separator, time-ago
  2. Body text (2 lines)
  3. Action row: 4 SF Symbols spaced across the width
     (`"bubble.left"`, `"arrow.2.squarepath"`, `"heart"`, `"square.and.arrow.up"`)

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct TweetView: View {
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image("ada")
                .resizable()
                .scaledToFill()
                .frame(width: 44, height: 44)
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 4) {
                    Text("Ada Lovelace").fontWeight(.bold)
                    Text("@ada").foregroundColor(.gray)
                    Text(".").foregroundColor(.gray)
                    Text("2h").foregroundColor(.gray)
                    Spacer()
                }
                Text("Just shipped a new SwiftUI view! It uses only stacks.")
                HStack {
                    Image(systemName: "bubble.left")
                    Spacer()
                    Image(systemName: "arrow.2.squarepath")
                    Spacer()
                    Image(systemName: "heart")
                    Spacer()
                    Image(systemName: "square.and.arrow.up")
                }
                .foregroundColor(.gray)
            }
        }
    }
}
```

Why: outer HStack with `alignment: .top` — the avatar sits to the left of the text column, and `.top` keeps the avatar lined up with the first line of the header instead of floating to the vertical center.

> **React:** `<div className="flex flex-row items-start gap-2">` (note `items-start` ≈ `.top` alignment) wrapping `<img/>` and a `<div className="flex flex-col">`.
</details>

### Q7

```text
+----------------------------------------------+
| +-----+  Levitating                          |
| | ART |  Dua Lipa                            |
| +-----+                  [<<] [ |> ] [>>]    |
+----------------------------------------------+
```

Regions:
- Leading: square album artwork (asset `"album"`)
- Middle column: song title, artist below it
- Trailing: row of three SF Symbol controls
  (`"backward.fill"`, `"play.fill"`, `"forward.fill"`)

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct MiniPlayerView: View {
    var body: some View {
        HStack(spacing: 12) {
            Image("album")
                .resizable()
                .scaledToFill()
                .frame(width: 56, height: 56)
            VStack(alignment: .leading, spacing: 2) {
                Text("Levitating").fontWeight(.semibold)
                Text("Dua Lipa")
                    .font(.subheadline)
                    .foregroundColor(.gray)
            }
            Spacer()
            HStack(spacing: 16) {
                Image(systemName: "backward.fill")
                Image(systemName: "play.fill")
                Image(systemName: "forward.fill")
            }
        }
    }
}
```

Why: outer HStack — three side-by-side regions across the row (artwork, text column, controls cluster). The `Spacer()` between the text column and the controls pushes the controls to the trailing edge.
</details>

### Q8

```text
+--------------------------------+
| Coffee               $  4.50   |
| Croissant            $  3.25   |
| Orange Juice         $  5.00   |
| Tip                  $  2.00   |
+--------------------------------+
| Total                $ 14.75   |
+--------------------------------+
```

Regions:
- Four label + price rows
- A separator gap
- A bold total row at the bottom (same shape as items)

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct ReceiptView: View {
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text("Coffee")
                Spacer()
                Text("$  4.50")
            }
            HStack {
                Text("Croissant")
                Spacer()
                Text("$  3.25")
            }
            HStack {
                Text("Orange Juice")
                Spacer()
                Text("$  5.00")
            }
            HStack {
                Text("Tip")
                Spacer()
                Text("$  2.00")
            }
            HStack {
                Text("Total").fontWeight(.bold)
                Spacer()
                Text("$ 14.75").fontWeight(.bold)
            }
            .padding(.top, 8)
        }
    }
}
```

Why: outer VStack — each line of the receipt is a row, and rows stack vertically. Inside each row, an HStack with a `Spacer()` between label and price gives the classic "left label, right value" alignment.

> **React:** rows mapped from data + `flex justify-between` on each — `items.map(it => <div className="flex justify-between"><span>{it.name}</span><span>{it.price}</span></div>)`.
</details>

### Q9

```text
+--------------------------------------------+
| (O)  Anna mentioned you in           2m    |
|      "iOS Final Prep". Tap to                |
|      open the thread.                        |
+--------------------------------------------+
```

Regions:
- Leading: round avatar (asset `"anna"`)
- Middle column: 3-line message body
- Trailing-top: small timestamp text "2m"

Hint: the timestamp aligns with the FIRST line of the message, not the vertical center of the column.

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct NotificationCellView: View {
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image("anna")
                .resizable()
                .scaledToFill()
                .frame(width: 40, height: 40)
            Text("Anna mentioned you in \"iOS Final Prep\". Tap to open the thread.")
            Spacer()
            Text("2m")
                .font(.caption)
                .foregroundColor(.gray)
        }
    }
}
```

Why: outer HStack with `alignment: .top` — top alignment is what makes the timestamp sit next to the FIRST line of the message instead of floating to the middle. The `Spacer()` between the body Text and the timestamp pushes the timestamp to the trailing edge.
</details>

### Q10

```text
+----------------------------------------------+
|   [house]    [magnifyingglass]   [bell]   [person]
|   Home        Search             Alerts    Me
+----------------------------------------------+
```

Regions:
- Four equal-width columns
- Each column: SF Symbol on top, label below
- Symbols: `"house.fill"`, `"magnifyingglass"`, `"bell.fill"`, `"person.fill"`

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct TabBarView: View {
    var body: some View {
        HStack(spacing: 0) {
            VStack(spacing: 4) {
                Image(systemName: "house.fill")
                Text("Home").font(.caption)
            }
            .frame(maxWidth: .infinity)
            VStack(spacing: 4) {
                Image(systemName: "magnifyingglass")
                Text("Search").font(.caption)
            }
            .frame(maxWidth: .infinity)
            VStack(spacing: 4) {
                Image(systemName: "bell.fill")
                Text("Alerts").font(.caption)
            }
            .frame(maxWidth: .infinity)
            VStack(spacing: 4) {
                Image(systemName: "person.fill")
                Text("Me").font(.caption)
            }
            .frame(maxWidth: .infinity)
        }
    }
}
```

Why: outer HStack — four siblings in a row. Each tab is a small VStack (icon over label). `.frame(maxWidth: .infinity)` on each tab is the closed-book trick for equal-width columns.

> **React:** `<div className="flex">` with four `<div className="flex-1 flex flex-col items-center">` children — exact pattern.
</details>

### Q11

```text
+----------------------------------------------+
| Today's Summary                              |
+----------------------------------------------+
|   1,240   |    86%      |     4.7           |
|   Steps   |   Goal      |   Avg/hr          |
+----------------------------------------------+
```

Regions:
- Top: section header "Today's Summary"
- Below: a row of three equal-width stat blocks, each with a big number
  on top and a small caption below

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct DashboardView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Today's Summary")
                .font(.title2)
                .fontWeight(.bold)
            HStack(spacing: 0) {
                VStack {
                    Text("1,240").font(.title).fontWeight(.bold)
                    Text("Steps").font(.caption).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                VStack {
                    Text("86%").font(.title).fontWeight(.bold)
                    Text("Goal").font(.caption).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
                VStack {
                    Text("4.7").font(.title).fontWeight(.bold)
                    Text("Avg/hr").font(.caption).foregroundColor(.gray)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }
}
```

Why: outer VStack — the header sits above the stat row, so the top level is vertical. The stat row itself is an HStack of three equal-width VStacks using the same `frame(maxWidth: .infinity)` trick.
</details>

### Q12

```text
+----------------------+----------------------+
|       Before         |        After         |
|                      |                      |
|   +--------------+   |   +--------------+   |
|   |   IMG_OLD    |   |   |   IMG_NEW    |   |
|   +--------------+   |   +--------------+   |
|                      |                      |
|   38 fps             |   60 fps             |
+----------------------+----------------------+
```

Regions:
- Two equal-width columns side by side
- Each column has, top to bottom: a header label, an image, and a metric line
- Left column uses image asset `"old"`, right uses `"new"`

Write the SwiftUI body using only VStack, HStack, Text, Image (and Spacer).

<details><summary>Answer</summary>

```swift
struct BeforeAfterView: View {
    var body: some View {
        HStack(spacing: 16) {
            VStack(spacing: 8) {
                Text("Before").fontWeight(.bold)
                Image("old")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 160)
                Text("38 fps").foregroundColor(.gray)
            }
            .frame(maxWidth: .infinity)
            VStack(spacing: 8) {
                Text("After").fontWeight(.bold)
                Image("new")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 160)
                Text("60 fps").foregroundColor(.gray)
            }
            .frame(maxWidth: .infinity)
        }
    }
}
```

Why: outer HStack — two columns side by side, so the top level splits horizontally first. Each column is a VStack of three children. `.frame(maxWidth: .infinity)` on each column gives the equal 50/50 split.
</details>

### Q13

```text
+----------------------------------------+
| +----------------------+               |
| | Hello there          |               |
| +----------------------+               |
|                                        |
|             +------------------------+ |
|             | Hi! How are you?       | |
|             +------------------------+ |
+----------------------------------------+
```

Regions:
- Two chat bubbles, vertically stacked
- First bubble: leading-aligned, gray background
- Second bubble: trailing-aligned, blue background, white text

Allowed modifiers: `VStack`, `HStack`, `Text`, `Spacer`, `.padding`, `.background`, `.cornerRadius`, `.foregroundColor`, `.font`, `spacing`, `alignment`.

<details><summary>Answer</summary>

```swift
struct ChatBubblesView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Hello there")
                    .padding()
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(16)
                Spacer()
            }
            HStack {
                Spacer()
                Text("Hi! How are you?")
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(16)
            }
        }
    }
}
```

Why: outer VStack — two bubbles stacked vertically. Each bubble is its own HStack: a leading bubble uses `[ Text, Spacer ]`, a trailing bubble uses `[ Spacer, Text ]`. The Spacer is what asymmetrically pins the bubble to one edge.

**Modifier order matters**: `.padding -> .background -> .cornerRadius`. If `.cornerRadius` ran before `.background`, the colored area would have square corners (the rounded shape would be applied to the un-colored view, then the background would paint a fresh rectangle behind it). This is also a Code-Improvement mock pattern — same lesson, different section.
</details>

### Q14

```text
+----------------------------------+
|  ( O )   Jane Doe                |
|          @janedoe                |
+----------------------------------+
```

Regions:
- Leading: circular avatar (asset `"avatar"`)
- Right column: bold name + secondary handle

Allowed modifiers: `VStack`, `HStack`, `Text`, `Image`, `Spacer`, `.resizable`, `.scaledToFill`, `.frame`, `.clipShape`, `.font`, `.bold`, `.foregroundStyle`, `spacing`.

<details><summary>Answer</summary>

```swift
struct AvatarRowView: View {
    var body: some View {
        HStack(spacing: 12) {
            Image("avatar")
                .resizable()
                .scaledToFill()
                .frame(width: 56, height: 56)
                .clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text("Jane Doe").font(.headline).bold()
                Text("@janedoe").foregroundStyle(.secondary)
            }
            Spacer()
        }
    }
}
```

Why: outer HStack — avatar sits next to a two-line VStack. The trailing Spacer pushes content to the leading edge.

**Modifier order matters**: `.resizable -> .scaledToFill -> .frame -> .clipShape`. `.resizable` must come first or the bitmap renders at intrinsic size. `.scaledToFill` then `.frame` controls the final box. `.clipShape(Circle())` is applied LAST so the already-sized image is cropped to a circle. Wrong order produces an overflowing or non-circular avatar.
</details>

### Q15

```text
+----------------------------------------+
| [person]    Profile               >    |
| [bell]      Notifications         >    |
| [lock]      Privacy               >    |
| [?]         Help                  >    |
+----------------------------------------+
```

Regions:
- Four rows, each with a leading SF Symbol + label + trailing chevron
- Critical: all four leading icons must align in a fixed column, even though
  `lock` is narrow and `bell` is wide

Allowed modifiers: `VStack`, `HStack`, `Text`, `Image`, `Spacer`, `.frame`, `.padding`, `.font`, `.foregroundStyle`, `spacing`.

<details><summary>Answer</summary>

```swift
struct SettingsListView: View {
    var body: some View {
        VStack(spacing: 16) {
            HStack {
                Image(systemName: "person").frame(width: 28)
                Text("Profile")
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.secondary)
            }
            HStack {
                Image(systemName: "bell").frame(width: 28)
                Text("Notifications")
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.secondary)
            }
            HStack {
                Image(systemName: "lock").frame(width: 28)
                Text("Privacy")
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.secondary)
            }
            HStack {
                Image(systemName: "questionmark.circle").frame(width: 28)
                Text("Help")
                Spacer()
                Image(systemName: "chevron.right").foregroundStyle(.secondary)
            }
        }
        .padding()
    }
}
```

Why: outer VStack — four rows stacked vertically. Each row is an HStack of `[ icon, label, Spacer, chevron ]`.

**Key trick**: `.frame(width: 28)` on every leading `Image` forces a uniform icon column. SF Symbol intrinsic widths differ — without the fixed frame, `bell` (wide) would shift its label slightly right and `lock` (narrow) would shift its label slightly left, breaking the visual column. This recurs across mock papers (Mock 1, Mock 4 settings screens).
</details>
