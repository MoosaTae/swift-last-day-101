# SwiftUI Layout and View Decomposition - Learn

Tutorial companion to the layout cheat sheet. The exam will hand you a
wireframe and ask you to write SwiftUI by hand using only VStack, HStack, Text,
and Image. To do that on paper without panicking, you do not need to memorise
more code - you need a mental model that lets you derive the code on the spot.

---

## 1. Mental model: how SwiftUI decides where things go

> **Priority:** DRILL — parent-proposes/child-decides rule unlocks every layout question.

### The single rule that explains everything

> Parent proposes a size. Child decides its own size. Parent positions the child.

That is it. Every layout bug, every "why is this not centred", every "why is my
image gigantic" comes from misreading this three-step protocol.

```text
            ┌───────────────────────────────────┐
            │  PARENT (e.g. VStack, ZStack)     │
            │  has bounds W × H                 │
            └────────────────┬──────────────────┘
                             │ STEP 1
                  proposes:  │ "you may be up to W × H"
                             ▼
            ┌───────────────────────────────────┐
            │  CHILD                            │
            │  decides its own size             │
            └─────┬───────────────────────┬─────┘
                  │ STEP 2                │
        intrinsic │                       │ greedy
        (Text,    │                       │ (Spacer, Color,
         Image)   ▼                       ▼ .frame(maxW:.inf))
            "I want w × h"          "I take W × H"
                  │                       │
                  └───────────┬───────────┘
                              │ STEP 3
                              ▼
            ┌───────────────────────────────────┐
            │  PARENT positions child at (x,y)  │
            │  using its own alignment rule     │
            └───────────────────────────────────┘
```

Three implications you must internalise:

1. **A child is never forced to fill its parent.** A `Text` returns its
   intrinsic width even if the parent offered the full screen. That is why a
   `Text` in a `VStack` looks "narrow" - it took only what it needed.
2. **Some views are greedy.** `Color`, `Spacer`, `Rectangle`, and any view
   modified with `.frame(maxWidth: .infinity)` reply "I will take everything
   you offered." Greed is how you fill space.
3. **Modifiers are children too.** `.padding()` wraps a view in a new view that
   asks its parent for "child size + padding". This is why modifier order
   matters - each modifier is a new layer in the proposal/reply chain.

When you stare at a wireframe, walk this loop:

- Outer container: VStack (rows) or ZStack (overlays)?
- For each row: who is greedy? (probably a `Spacer` or `.frame(maxWidth: .infinity)`)
- For each leaf: text or image? Apply per-element modifiers (font, color).
- For each container: apply per-container modifiers (padding, background, corner radius).

---

## 2. The container family

> **Priority:** DRILL — VStack/HStack/ZStack/Spacer are the wireframe vocabulary.

Containers are the verbs of SwiftUI. Each expresses one geometric idea.

### 2.1 VStack - vertical column, top to bottom

Read code top to bottom = order on screen top to bottom.

```
   VStack(alignment: .leading, spacing: 12) {
       Text("A")    -->   +---------+
       Text("BB")   -->   | A       |
       Text("CCC")  -->   | BB      |   <- gap = spacing (12pt)
   }                      | CCC     |
                          +---------+
                          alignment .leading => left edges line up
```

```swift
VStack(alignment: .leading, spacing: 12) { // .leading | .center | .trailing
    Text("A")                              // first => topmost on screen
    Text("BB")
    Text("CCC")                            // last => bottommost on screen
}
```

### 2.2 HStack - horizontal row, left to right

Same idea rotated 90 degrees. First child is leftmost.

```swift
HStack(alignment: .firstTextBaseline, spacing: 8) {
    // .top | .center | .bottom | .firstTextBaseline | .lastTextBaseline
    Text("99").font(.largeTitle)
    Text("points").font(.caption)          // baselines align with "99"
}
```

### 2.3 ZStack - depth, back to front

First child is at the BACK. Last child is on TOP.

```
   ZStack(alignment: .topTrailing) {
       Color.gray         <- back layer (greedy, fills parent)
       Image("photo")     <- middle layer
       Text("NEW")        <- top layer, pinned top-right by alignment
   }
```

`alignment:` positions children SMALLER than the ZStack. Greedy children fill
the ZStack and ignore alignment. ZStack alignment options: `.top, .topLeading,
.topTrailing, .center, .bottom, .bottomLeading, ...`.

### 2.4 Spacer - the greedy gap

A view that says "give me all the leftover space along the stack's axis." It
is how you push siblings apart.

```
   HStack { Text("Left")  Spacer()  Text("Right") }
   render:
   | Left                                  Right |
```

```swift
HStack {
    Text("Left")
    Spacer()                // pushes "Right" to the trailing edge
    Text("Right")
}
```

Two `Spacer()`s split leftover space equally. Three split it in thirds. This
is how you centre a single item: `Spacer(); item; Spacer()`. In `VStack`,
Spacer pushes vertically; in `HStack`, horizontally.

### 2.5 Group - a transparent bag

Group does not add geometry - it lets you treat several views as one for
modifiers or branching.

```swift
Group {
    Text("One")
    Text("Two")
}
.foregroundStyle(.red)      // applied to BOTH children, no extra layout
```

### 2.6 ScrollView - escape from one screen

Gives its child UNLIMITED size along its axis. Greedy children (e.g.
`.frame(maxHeight: .infinity)`) inside a vertical ScrollView collapse.

```swift
ScrollView {                      // .vertical by default
    VStack(spacing: 16) {
        ForEach(0..<50) { i in
            Text("Row \(i)")
                .frame(maxWidth: .infinity)   // OK: width is bounded
                .padding()
                .background(Color.blue.opacity(0.2))
        }
    }
    .padding()
}
```

| Container | Axis | Greedy by default | Notes |
| --- | --- | --- | --- |
| VStack | vertical | no | child intrinsic |
| HStack | horizontal | no | child intrinsic |
| ZStack | depth | no | back-to-front |
| ScrollView | vertical/horizontal | no | unbounded along axis |
| LazyVStack | vertical | no | builds rows lazily |

`spacing:` is the gap between children; default is system spacing; pass `0` to
remove gaps.

---

## 3. Modifiers - what they really are

> **Priority:** DRILL — modifier order semantics are a recurring exam trap.

A modifier is a function on `View` that returns a NEW view wrapping the
original. It does not mutate. Reading

```swift
Text("Hi").padding().background(Color.yellow)
```

as a tree:

```
   Background(Yellow,
       Padding(16,
           Text("Hi")))
```

Each layer participates in the proposal/reply protocol. Reverse the order =
reverse the wrapping = different geometry.

### The order-of-operations rule

> The modifier WRITTEN FIRST is applied CLOSEST to the content.

```swift
// padding INSIDE background -> yellow rect includes the padding (big block):
Text("A").padding().background(Color.yellow)
// background INSIDE padding -> yellow hugs text, padding is outside (small block):
Text("A").background(Color.yellow).padding()
```

Before:

```swift
Text("A").padding().background(Color.yellow)   // yellow ENGULFS the padding
```

After:

```swift
Text("A").background(Color.yellow).padding()   // yellow HUGS the text
```

```text
   .padding().background(Color.yellow)     .background(Color.yellow).padding()
   ┌─────────────────────────┐             ┌─────────────────────────┐
   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│             │                         │
   │▓▓▓▓▓▓▓ padding ▓▓▓▓▓▓▓▓▓│             │      padding            │
   │▓▓▓▓ ┌─────────────┐ ▓▓▓▓│             │   ┌─────────────┐       │
   │▓▓▓▓ │     A       │ ▓▓▓▓│             │   │▓▓▓▓ A ▓▓▓▓▓▓│       │
   │▓▓▓▓ └─────────────┘ ▓▓▓▓│             │   └─────────────┘       │
   │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│             │      padding            │
   └─────────────────────────┘             └─────────────────────────┘
   yellow rect = text + padding            yellow rect = text only
```

Same logic with `.frame` and `.cornerRadius`:

```swift
Text("Random")
    .foregroundColor(.white)
    .frame(width: 150, height: 50)        // first set the box
    .background(Color.orange)             // then paint behind it
    .cornerRadius(10)                     // then round the painted area
```

If `.cornerRadius` comes BEFORE `.background`, the background re-paints square
corners on top.

### The most-tested modifiers

| Modifier | Purpose | Gotcha |
| --- | --- | --- |
| `.font(_:)` | Sets text font/size | Inherited by children unless overridden |
| `.foregroundStyle(_:)` | Text/SF Symbol colour | Newer; accepts hierarchy & gradients |
| `.foregroundColor(_:)` | Same, older API | Still valid |
| `.padding(_:_:)` | Adds outer space | Default is 16pt all sides |
| `.background(_:)` | Paints behind content | Sized by what is inside the call |
| `.frame(...)` | Resizes the proposal | Several variants - see below |
| `.cornerRadius(_:)` | Rounds corners | Must come AFTER `.background` |
| `.clipShape(_:)` | Crops to a shape | `.clipShape(Circle())` for avatars |
| `.overlay(_:)` | Paints in front | Mirror of `.background` |
| `.offset(x:y:)` | Visually shifts | Does NOT affect layout slot |
| `.opacity(_:)` | 0..1 transparency | View still occupies space at 0 |
| `.multilineTextAlignment(_:)` | Wraps text alignment | Only for multi-line text |
| `.lineLimit(_:)` | Truncate after N lines | Pair with `.minimumScaleFactor` |

### Text modifiers in full

```swift
Text("Hello")
    .font(.title)                          // .largeTitle, .title, .title2, .title3,
                                           // .headline, .subheadline, .body, .callout,
                                           // .caption, .caption2
    .font(.system(size: 32, weight: .bold))
    .fontWeight(.bold)                     // or .bold(), .italic()
    .foregroundColor(.blue)                // older API
    .foregroundStyle(.secondary)           // newer; Color or hierarchical
    .multilineTextAlignment(.center)       // .leading | .center | .trailing
    .lineLimit(2)
    .padding()                             // 16pt all sides
    .padding(.horizontal, 24)
```

Real combos from homework:

```swift
Text("My Grades").font(.title).bold()
Text("Rocket").font(.title.weight(.bold))
Text("PowerFul").foregroundStyle(.secondary).font(.title3.weight(.medium))
Text("4 Credit").font(.caption2).foregroundColor(.gray)
```

### Image - asset vs SF Symbol

```swift
Image(systemName: "person.fill")           // SF Symbol
Image("puppy")                             // asset in Media.xcassets
```

Sizing an asset image - ALWAYS `.resizable()` BEFORE `.frame(...)`:

```swift
Image("puppy")
    .resizable()                           // MUST come before frame
    .scaledToFill()                        // or .scaledToFit() / .aspectRatio(contentMode: .fill)
    .frame(width: 160, height: 200)
    .clipped()                             // crop overflow when using scaledToFill
    .cornerRadius(12)
```

For SF Symbols, set size via `.font(.system(size:))`:

```swift
Image(systemName: "sun.max.fill")
    .font(.system(size: 60))
    .foregroundStyle(.red)
```

Circle avatar pattern:

```swift
Image("avatar")
    .resizable()
    .scaledToFill()
    .frame(width: 80, height: 80)
    .clipShape(Circle())
```

### Color, divider, shapes

```swift
Color.blue                                 // Color is a View; fills available space
Color(red: 215/255, green: 202/255, blue: 184/255)
    .ignoresSafeArea()                     // bleed under status bar / home indicator

Divider()                                  // thin horizontal line
Rectangle().fill(.gray).frame(height: 1)   // custom-thickness line
RoundedRectangle(cornerRadius: 12).fill(.blue)
Circle().stroke(Color.red, lineWidth: 2)
```

---

## 4. Frame deep-dive

> **Priority:** DRILL — rigid/greedy/flexible frame variants asked verbatim.

Three variants, three different geometric statements.

### 4.1 `.frame(width:height:)` - rigid box

> "I want exactly this size, regardless of what my parent proposed."

```swift
Color.red.frame(width: 100, height: 50)    // a 100x50 red rectangle
```

Use for icons, fixed-size buttons, avatar frames.

### 4.2 `.frame(maxWidth:maxHeight:)` - greedy up to a cap

> "I want as much as my parent will give me, up to this maximum."

```swift
.frame(maxWidth: .infinity)                // expand to full parent width
.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
```

`.infinity` means "no upper limit" - take whatever the parent offered. Used
for full-width cards:

```swift
VStack { /* ... */ }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 20)
    .background(Color.blue)
    .cornerRadius(15)
```

### 4.3 `.frame(minWidth:idealWidth:maxWidth:...)` - flexible band

> "Give me at least min, prefer ideal, accept up to max."

```swift
Text("Continue")
    .frame(minWidth: 120, idealWidth: 200, maxWidth: .infinity)
```

### 4.4 `.frame(... alignment:)` - where the original content sits in the new frame

The single most missed point. Growing a frame leaves the ORIGINAL content at
its intrinsic size, positioned inside the new frame by `alignment:`.

```swift
Text("Hi")
    .frame(width: 200, height: 60, alignment: .leading)
    .background(Color.yellow)
```

```
   +--------------------+
   |Hi                  |   <- text is at the leading edge of a 200x60
   |                    |      yellow box, NOT centred.
   +--------------------+
```

Default alignment is `.center`.

### Frame visual cheat

```
   .frame(width: 100)            .frame(maxWidth: .infinity)
   +---------+                   +-------------------------+
   |  rigid  |                   |  greedy                 |
   +---------+                   +-------------------------+

   .frame(maxWidth: .infinity, alignment: .leading)
   +-------------------------+
   |left|                    |
   +-------------------------+
       ^ child intrinsic     ^ wrapper extends to parent width
```

| Variant | Greedy? | Sets exact size? | Common use |
| --- | --- | --- | --- |
| `.frame(width: w, height: h)` | no | yes | icon, avatar, fixed button |
| `.frame(maxWidth: .infinity)` | yes (W) | no | full-width card row |
| `.frame(maxWidth: .infinity, maxHeight: .infinity)` | yes | no | full-screen background |
| `.frame(minWidth:..maxWidth:..)` | conditional | no | adaptive button |
| `.frame(width: w, alignment: .leading)` | no | yes (W) | pin label inside fixed slot |

---

## 5. Alignment - four places it shows up, all subtly different

> **Priority:** DRILL — stack/frame/multilineText alignment confused often.

### 5.1 `VStack(alignment:)` - horizontal alignment of children

```
   .leading           .center            .trailing
   |Short            |   Short    |     |          Short|
   |A much longer... | A much l...|     |A much longer...|
```

Available: `.leading | .center | .trailing` plus custom alignment guides.

### 5.2 `HStack(alignment:)` - vertical alignment of children

```swift
HStack(alignment: .firstTextBaseline) {
    Text("99").font(.largeTitle)
    Text("pts").font(.caption)             // baselines align
}
```

Available: `.top | .center | .bottom | .firstTextBaseline | .lastTextBaseline`.

### 5.3 `ZStack(alignment:)` - 2D alignment of overlapping children

```swift
ZStack(alignment: .topTrailing) {
    Image("photo").resizable().scaledToFill()
    Text("NEW").padding(6).background(.red).foregroundStyle(.white)
}
```

Points: `.topLeading, .top, .topTrailing, .leading, .center, .trailing,
.bottomLeading, .bottom, .bottomTrailing`.

Caveat: alignment only positions children SMALLER than the ZStack. A child
that fills the ZStack ignores it.

### 5.4 `.frame(... alignment:)` - where ORIGINAL content sits in NEW frame

```swift
Text("Hi")
    .frame(maxWidth: .infinity, alignment: .leading)   // pin to leading edge
```

### 5.5 The alignment table to memorise

Four-quadrant visual reference — same word "alignment", four different jobs:

```text
   VStack(alignment: .leading)            HStack(alignment: .top)
   ┌──────────────────────┐               ┌──────────────────────┐
   │ A                    │               │ ┌──┐ ┌────┐ ┌──┐     │
   │ BB                   │               │ │99│ │pts │ │!!│     │
   │ CCC                  │               │ └──┘ └────┘ └──┘     │
   │ left edges line up   │               │ tops line up         │
   └──────────────────────┘               └──────────────────────┘
   horizontal edges of children            vertical edges of children

   ZStack(alignment: .topTrailing)         .frame(maxW:.inf, alignment:.leading)
   ┌──────────────────────┐               ┌──────────────────────┐
   │              ┌────┐  │               │ Hi                   │
   │  back        │NEW │  │               │                      │
   │  layer       └────┘  │               │ original content     │
   │                      │               │ pinned to leading    │
   │  fills ZStack        │               │ inside the new frame │
   └──────────────────────┘               └──────────────────────┘
   2D point of SMALLER children            content inside resized frame
```

| Where you write it | What it aligns | Default |
| --- | --- | --- |
| `VStack(alignment: x)` | horizontal edges of children | `.center` |
| `HStack(alignment: y)` | vertical edges of children | `.center` |
| `ZStack(alignment: p)` | 2D point of smaller children inside ZStack | `.center` |
| `.frame(... alignment: p)` | original content inside resized frame | `.center` |
| `.multilineTextAlignment(t)` | text inside a multi-line `Text` | `.leading` |

---

## 6. View decomposition walkthrough

> **Priority:** DRILL — wireframe-to-SwiftUI is a graded written category.

### Decision tree — wireframe to SwiftUI

```text
WHOLE wireframe
├── Overlapping layers? (image with badge on top, full-bleed bg)
│   ├── YES ──► ZStack outermost (back-to-front)
│   │           └── alignment: where do the smaller layers pin?
│   └── NO  ──► VStack outermost (rows top to bottom)
│
├── For EACH row:
│   ├── Single leaf? (just Text or Image) ──► no HStack needed
│   └── Side-by-side items? ──► HStack
│       ├── Stacked text inside? ──► nested VStack(alignment: .leading)
│       └── Need to push to an edge?
│           ├── push right    ──► Text; Spacer(); Text
│           ├── push apart    ──► A; Spacer(); B
│           └── centre one    ──► Spacer(); X; Spacer()
│
└── Modifiers (apply in this order):
    ├── per-element first     ──► .font, .foregroundStyle, .resizable
    ├── then container shape  ──► .padding, .frame(maxWidth:.inf)
    ├── then paint            ──► .background
    └── finally crop/round    ──► .cornerRadius, .clipShape
```

### The recipe (memorise the steps, not the code)

1. Look at the WHOLE screen. Vertical layout (VStack) or overlays (ZStack background)?
2. Slice into ROWS top to bottom. Each row is a child of the outer VStack.
3. Each row with side-by-side items becomes an HStack.
4. Inside an HStack, a column of stacked text becomes a nested `VStack(alignment: .leading)`.
5. To push something to an edge, insert `Spacer()`.
6. Apply per-element modifiers (font, color), then per-container modifiers (padding, background).

Pseudo-template:

```swift
VStack(alignment: .leading, spacing: 16) {
    HStack { /* header row */ }
    HStack { /* content row */ }
    Spacer()                          // push everything up if screen is taller
}
.padding()
```

Every wireframe is a tree of nested rectangles. Each rectangle is a stack.
Leaves are `Text` or `Image`.

---

### Worked wireframe A - Profile card (avatar + name + bio + button)

```
+----------------------------------+
| [O]  Jane Doe                    |
|      iOS Developer               |
|                                  |
|  Loves SwiftUI, coffee, and cats.|
|                                  |
|        [  Follow  ]              |
+----------------------------------+
```

Decomposition:
- Outer = VStack(alignment: .leading) (rows top to bottom).
- Row 1 = avatar + (name stacked over title) + Spacer => HStack with nested VStack.
- Row 2 = bio text => single Text.
- Row 3 = centred button => HStack with Spacer/button/Spacer.

```swift
VStack(alignment: .leading, spacing: 16) {
    HStack(spacing: 12) {
        Image("avatar")
            .resizable()                  // MUST come before frame for an asset
            .scaledToFill()               // crop to fill the frame
            .frame(width: 64, height: 64) // exact circle slot
            .clipShape(Circle())          // mask to a circle
        VStack(alignment: .leading, spacing: 2) {
            Text("Jane Doe")
                .font(.title2)
                .bold()
            Text("iOS Developer")
                .font(.subheadline)
                .foregroundStyle(.secondary) // hierarchical, dims for less emphasis
        }
        Spacer()                          // push column to leading edge
    }

    Text("Loves SwiftUI, coffee, and cats.")
        .font(.body)
        .multilineTextAlignment(.leading)

    HStack {
        Spacer()                          // centre the button: spacer left
        Button(action: { }) {
            Text("Follow")
                .foregroundColor(.white)
                .frame(width: 140, height: 44) // rigid pill size
                .background(Color.blue)
                .cornerRadius(22)              // half height = pill
        }
        Spacer()                          // and spacer right => centred
    }
}
.padding()                                // breathing room from card edge
.background(Color(.systemBackground))     // adapts to light/dark
.cornerRadius(16)
```

---

### Worked wireframe B - Subject grade row (from hw/5 MyGradesView)

```
+----------------------------------------+
| 4 Credit                          3.0  |
| Math                                   |
+----------------------------------------+
```

Decomposition: stacked text on the left, grade pinned right. Outer = HStack.
Left = `VStack(alignment: .leading)`. Spacer. Right = Text.

```swift
HStack {
    VStack(alignment: .leading) {
        Text("4 Credit")
            .font(.caption2)
            .foregroundColor(.gray)
        Text("Math")
            .font(.headline)
    }
    Spacer()                              // pushes grade to trailing edge
    Text("3.0")
        .font(.title3)
        .bold()
        .foregroundColor(.blue)
}
.padding(.vertical, 4)                    // tight rows in a list
```

ASCII of how Spacer carves the row:

```
   |VStack(.leading)|<--- Spacer takes everything --->|3.0|
```

---

### Worked wireframe C - Settings row (icon + label + chevron)

```
[bell]  Notifications              >
```

Decomposition: HStack of icon, label, Spacer, chevron. Fixed-width icon
column so multiple rows align.

```swift
HStack(spacing: 12) {
    Image(systemName: "bell.fill")        // SF Symbol, no .resizable needed
        .font(.title3)                    // sizes the SYMBOL
        .foregroundStyle(.orange)
        .frame(width: 28)                 // reserve a fixed icon column
    Text("Notifications")
        .font(.body)
    Spacer()                              // shove chevron to trailing
    Image(systemName: "chevron.right")
        .foregroundStyle(.secondary)
}
.padding(.horizontal, 16)
.padding(.vertical, 12)
.background(Color(.secondarySystemBackground))
.cornerRadius(10)
```

---

### Worked wireframe D - ZStack overlay card (from hw/3 TravelPackage)

Final composition:

```text
   ┌───────────────────────────────┐
   │░░░░░░░░░░░░░░░░░░░░░ ┌─────┐ │
   │░░░░░░░░░░░░░░░░░░░░░ │ 20  │ │
   │░░░░░ mountain ░░░░░░ │ Nov │ │
   │░░░░░  image   ░░░░░░ └─────┘ │
   │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
   │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
   │ Mountain                     │
   │ $$$$$$                       │
   └───────────────────────────────┘
```

Layer 0 — back image (full bleed):

```text
   ┌───────────────────────────────┐
   │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
   │░░░░░░ Image("mountain") ░░░░ │
   │░░░░░  .resizable           ░ │
   │░░░░░  .frame(320×320)      ░ │
   │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
   └───────────────────────────────┘
```

Layer 1 — date badge (.topTrailing):

```text
   ┌───────────────────────────────┐
   │                      ┌─────┐ │
   │  ZStack alignment    │ 20  │ │
   │  pins this layer     │ Nov │ │
   │  to top-right        └─────┘ │
   │                              │
   └───────────────────────────────┘
```

Layer 2 — title (.bottomLeading via Spacer trick):

```text
   ┌───────────────────────────────┐
   │                              │
   │  inner VStack { Spacer();    │
   │    HStack { col; Spacer() }} │
   │ Mountain                     │
   │ $$$$$$                       │
   └───────────────────────────────┘
```

Decomposition:
- Outer = `ZStack(alignment: .topTrailing)` so the date badge naturally goes top-right.
- Layer 0: image (fills).
- Layer 1: date VStack (positioned by ZStack alignment).
- Layer 2: title pinned bottom-leading using `VStack { Spacer; HStack { content; Spacer } }`.

```swift
ZStack(alignment: .topTrailing) {
    Image("mountain")
        .resizable()
        .frame(width: 320, height: 320)   // fixed canvas
        .clipped()                        // crop overflow when scaled

    // Date badge - lands top-right because of ZStack(.topTrailing)
    VStack {
        Text("20").font(.title.weight(.bold))
        Text("Nov").fontWeight(.semibold)
    }
    .padding(8)                           // inside the white pill
    .background(.white)
    .cornerRadius(12)
    .padding(12)                          // outside the pill, away from corner

    // Title pinned bottom-leading using Spacer-inside-Spacer trick
    VStack {
        Spacer()                          // push the row down
        HStack {
            VStack(alignment: .leading) {
                Text("Mountain")
                    .foregroundStyle(.white)
                    .font(.title.weight(.bold))
                Text("$$$$$$")
                    .foregroundStyle(.white)
                    .font(.title3.weight(.semibold))
            }
            .padding(16)
            Spacer()                      // push column left
        }
    }
    .frame(width: 320, height: 320)       // fill ZStack so spacers work
}
```

A Spacer only pushes if it has a bounded axis to push within. Giving the
inner VStack the same `frame` as the image gives the spacers something to fill.

---

### Worked wireframe E - Two-card stat row (split-evenly pattern)

```
+---------------+ +---------------+
|     GPAX      | |    Credits    |
|     3.25      | |      36       |
+---------------+ +---------------+
```

```swift
HStack(spacing: 15) {
    VStack {
        Text("GPAX").font(.caption).bold()
        Text("3.25").font(.system(size: 34, weight: .bold))
    }
    .foregroundColor(.white)
    .frame(maxWidth: .infinity)           // each card claims half the row
    .padding(.vertical, 20)
    .background(Color.blue)
    .cornerRadius(15)

    VStack {
        Text("Credits").font(.caption).bold()
        Text("36").font(.system(size: 34, weight: .bold))
    }
    .foregroundColor(.white)
    .frame(maxWidth: .infinity)           // same trick on the right card
    .padding(.vertical, 20)
    .background(Color.green)
    .cornerRadius(15)
}
.padding()
```

Key trick: `.frame(maxWidth: .infinity)` on each card makes them split the row
equally. Without it, both cards would shrink to text width and clump centre.

---

## 7. Common pitfalls (graders look for these)

> **Priority:** DRILL — section name says it: graders look for these.

Severity index — scan this before you write any wireframe answer:

| Tag | Pitfall | Why it stings |
| --- | --- | --- |
| [GRADED] | `.padding()` vs `.background()` order | Wrong order = wrong rectangle painted; instantly visible to grader |
| [GRADED] | `.cornerRadius` written before `.background` | Background re-paints square corners on top; rounded look disappears |
| [GRADED] | Forgot `.resizable()` on asset `Image` | `.frame` cannot shrink a raw bitmap; image overflows the layout |
| [GRADED] | Missing `Spacer()` when pushing to an edge | HStack centres its content; "Right" is not actually on the right |
| [WATCH]  | `.frame(maxWidth: .infinity)` without `alignment:` | Wrapper is greedy but content stays centred — common "why isn't my Text on the left?" |
| [WATCH]  | ZStack alignment ignored by greedy child | Child fills the ZStack and has nowhere to align to; needs Spacer trick or `.frame` alignment |
| [INFO]   | `Spacer()` in the wrong-axis stack | Spacer pushes along its parent stack's axis only — VStack-Spacer pushes vertical, not horizontal |

```text
THREE RULES TO REPEAT UNDER YOUR BREATH

  1. The first modifier is closest to the content.
  2. ZStack alignment ignores greedy children — wrap the child in
     Spacer/Spacer or .frame(maxW:.inf, maxH:.inf, alignment:) first.
  3. .frame(maxWidth: .infinity) does NOT centre or pin the content;
     it just makes the WRAPPER greedy. Add alignment: to place it.
```

### 7.1 Forgot `.resizable()` on an asset Image

```swift
// Wrong - the image keeps its intrinsic size and ignores frame.
Image("puppy").frame(width: 100, height: 100)

// Right
Image("puppy").resizable().scaledToFill().frame(width: 100, height: 100).clipped()
```

WHY: A bitmap from `Media.xcassets` has an intrinsic pixel size. Without
`.resizable()`, the view says "I am 1024x768, take it or leave it." `.frame`
only proposes; it cannot force a non-resizable image to shrink.

### 7.2 `.padding().background()` vs `.background().padding()`

```swift
// Student wanted a coloured pill with breathing room INSIDE the pill:
Text("Tag").background(Color.blue).padding()        // small blue dot, big white margin
// What they meant:
Text("Tag").padding().background(Color.blue)        // big blue pill containing text
```

First paints background OUTSIDE the padded area (large coloured block); second
paints background hugging the content (small coloured block, white margin
around it). `.background` paints what is currently INSIDE the chain.

### 7.3 `.cornerRadius` before `.background`

```swift
// Wrong - background re-draws square corners on top of the rounded ones.
Text("Hi").cornerRadius(10).background(Color.blue)
// Right
Text("Hi").background(Color.blue).cornerRadius(10)
```

Mantra: **frame -> background -> cornerRadius**. Or use
`.background(Color.blue, in: RoundedRectangle(cornerRadius: 10))`.

### 7.4 SF Symbol size with `.frame`

```swift
// Wrong - frame just reserves space; symbol stays small.
Image(systemName: "sun.max.fill").frame(width: 60, height: 60)
// Right - SF Symbols size with .font or .imageScale.
Image(systemName: "sun.max.fill").font(.system(size: 60))
// To stretch a symbol like a bitmap, add .resizable() first.
Image(systemName: "sun.max.fill").resizable().frame(width: 60, height: 60)
```

WHY: An SF Symbol is a glyph. Glyphs scale with font size, not frame size.

### 7.5 No Spacer when pushing to an edge

```swift
// Wrong - HStack centres its content; "Right" is not actually at the right.
HStack { Text("Left"); Text("Right") }
// Right
HStack { Text("Left"); Spacer(); Text("Right") }
```

WHY: HStack with two non-greedy children sizes itself to fit them and centres
the whole stack inside its parent. There is nothing pushing them apart unless
you insert greed.

### 7.6 ZStack alignment confusion

`alignment:` only applies to children that do not themselves fill the ZStack.
To pin a child to a corner inside a fixed-size ZStack, either:

```swift
// (a) Use the Spacer-trick:
VStack { Spacer(); HStack { content; Spacer() } }
// (b) Grow the child and use frame alignment:
content.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
```

WHY: Alignment applies during layout. A child that takes the full ZStack size
has nowhere to be aligned to.

### 7.7 `foregroundColor` vs `foregroundStyle`

Both work. `foregroundStyle` is newer and accepts gradients and hierarchy
(`.secondary`, `.tertiary`). Both safe on the exam.

### 7.8 `.scaledToFill()` without `.clipped()`

```swift
// Wrong - the image scales up to fill but spills outside the frame.
Image("photo").resizable().scaledToFill().frame(width: 100, height: 100)
// Right
Image("photo").resizable().scaledToFill().frame(width: 100, height: 100).clipped()
```

`.scaledToFill()` preserves aspect ratio and grows until ALL sides cover the
frame, so one axis overflows. Without `.clipped()`, that overflow draws
outside the frame and overlaps neighbours. Use `.scaledToFit()` for letterbox
bars instead.

### 7.9 Card-style chain order

When in doubt, the canonical chain for a "card row":

```swift
content
    .padding()                  // inner padding hugging the content
    .frame(maxWidth: .infinity) // expand to full row width
    .background(Color.X)        // paint the now-expanded area
    .cornerRadius(R)            // round the painted area's corners
    .padding(.horizontal)       // outer margin from screen edges
```

ORDER: padding (inner), frame, background, cornerRadius, padding (outer).

---

## 8. Quick recall card (last-minute review)

> **Priority:** DRILL — last-minute review, run through tonight.

Stacks and Spacer:

```swift
VStack(alignment: .leading, spacing: 12) { ... }    // top -> bottom
HStack(alignment: .center,  spacing: 8)  { ... }    // left -> right
ZStack(alignment: .topTrailing)          { ... }    // back -> front
HStack { Text("L"); Spacer(); Text("R") }           // pushes R to trailing
HStack { Spacer(); Text("center"); Spacer() }       // centres
```

Image (asset / SF Symbol / circle avatar):

```swift
Image("puppy").resizable().scaledToFill().frame(width: 160, height: 200).clipped().cornerRadius(12)
Image(systemName: "sun.max.fill").font(.system(size: 60)).foregroundStyle(.red)
Image("avatar").resizable().scaledToFill().frame(width: 80, height: 80).clipShape(Circle())
```

Frame variants:

```swift
.frame(width: 100, height: 50)                                      // rigid
.frame(maxWidth: .infinity)                                         // greedy width
.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
.frame(maxWidth: .infinity, alignment: .leading)                    // pin leading
```

Card chain order: `.padding() -> .frame(maxWidth: .infinity) -> .background(...) -> .cornerRadius(R) -> .padding(.horizontal)`.

Decomposition recipe: VStack-or-ZStack outer, HStack rows with nested
`VStack(alignment: .leading)` for stacked text, `Spacer()` to push to edges,
per-element modifiers first then per-container modifiers, outer `.padding()`
last.

Drill plan (last days):
- Redraw 3 wireframes from memory; compare to homework.
- Practise card with image cover + overlay badge.
- Practise settings list of 5 rows.
- Timed: one wireframe in 10 minutes, code-only on paper.

Three rules to repeat under your breath during the exam:

- Parent proposes, child decides, parent positions.
- The modifier written first is applied closest to the content.
- Spacer is greedy along the stack's axis.

Good luck.
