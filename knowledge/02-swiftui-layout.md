# SwiftUI Layout & View Decomposition - Study Guide

Closed-book target: given a wireframe, write SwiftUI code using basic UI
(VStack, HStack, ZStack, Text, Image, Spacer). Memorize the patterns below.

---

## 1. Stacks

```swift
VStack(alignment: .leading, spacing: 12) { ... }   // top -> bottom
HStack(alignment: .center,  spacing: 8)  { ... }   // left -> right
ZStack(alignment: .topTrailing)          { ... }   // back -> front (overlay)
```

- VStack alignment: `.leading | .center | .trailing`
- HStack alignment: `.top | .center | .bottom | .firstTextBaseline`
- ZStack alignment: `.top, .topLeading, .topTrailing, .center, .bottom, .bottomLeading, ...`
- `spacing:` is the gap between children. Default is system spacing; pass `0` to remove gaps.

Children listed top-to-bottom in source = top-to-bottom on screen for VStack
(left-to-right for HStack, back-to-front for ZStack).

## 2. Spacer

```swift
HStack {
    Text("Left")
    Spacer()              // pushes the next view to the right
    Text("Right")
}
```

- `Spacer()` expands to fill all available space along the stack's axis.
- Use it to push content to one edge, or space items apart evenly (multiple Spacers).
- In `VStack`, `Spacer()` pushes vertically; in `HStack`, horizontally.

## 3. Text and modifiers

```swift
Text("Hello")
    .font(.title)                          // .largeTitle, .title, .title2, .title3,
                                           // .headline, .subheadline, .body, .callout,
                                           // .caption, .caption2
    .font(.system(size: 32, weight: .bold))
    .fontWeight(.bold)                     // or .bold(), .italic()
    .foregroundColor(.blue)                // older API
    .foregroundStyle(.secondary)           // newer; Color or hierarchical style
    .multilineTextAlignment(.center)       // .leading | .center | .trailing
    .lineLimit(2)                          // truncate after N lines
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

## 4. Image

System (SF Symbols) vs asset:

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

For SF Symbols, set size via `.font(.system(size: 60))`:

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

## 5. Frame, padding, background - ORDER MATTERS

Modifiers wrap from inside out. Each modifier returns a new view.

```swift
// padding INSIDE background -> background expands to include padding
Text("A").padding().background(Color.yellow)

// background INSIDE padding -> background hugs text, padding outside
Text("A").background(Color.yellow).padding()
```

Same logic with `.frame` and `.cornerRadius`:

```swift
Text("Random")
    .foregroundColor(.white)
    .frame(width: 150, height: 50)
    .background(Color.orange)
    .cornerRadius(10)
```

If `.cornerRadius` comes BEFORE `.background`, the background re-paints square corners on top.

## 6. Frame fill modifier

```swift
.frame(maxWidth: .infinity)        // expand horizontally to fill parent
.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
```

Used for full-width cards:

```swift
VStack { ... }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 20)
    .background(Color.blue)
    .cornerRadius(15)
```

## 7. Color, background, divider, shapes

```swift
Color.blue                                 // Color is a View; fills available space
Color(red: 215/255, green: 202/255, blue: 184/255)
    .ignoresSafeArea()                     // bleed under status bar / home indicator

Divider()                                  // thin horizontal line
Rectangle().fill(.gray).frame(height: 1)   // custom-thickness line
RoundedRectangle(cornerRadius: 12).fill(.blue)
Circle().stroke(Color.red, lineWidth: 2)
```

## 8. Decomposition strategy (the exam recipe)

1. Look at the WHOLE screen: vertical layout (VStack) or overlays (ZStack background)?
2. Slice into ROWS top-to-bottom -> each row is a child of the outer VStack.
3. Each row with multiple side-by-side items becomes an HStack.
4. Inside an HStack, a column of stacked text becomes a nested VStack(alignment: .leading).
5. To push something to an edge, insert `Spacer()`.
6. Add modifiers per-element (font, color), then per-container (padding, background).

Pseudo-template:

```swift
VStack(alignment: .leading, spacing: 16) {
    HStack { ... }                            // header row
    HStack { ... }                            // content row
    Spacer()                                  // push remaining content up
}
.padding()
```

---

## Worked example A - Profile card (avatar + name + bio + button)

Wireframe:

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

Code:

```swift
VStack(alignment: .leading, spacing: 16) {
    HStack(spacing: 12) {
        Image("avatar")
            .resizable()
            .scaledToFill()
            .frame(width: 64, height: 64)
            .clipShape(Circle())
        VStack(alignment: .leading, spacing: 2) {
            Text("Jane Doe")
                .font(.title2)
                .bold()
            Text("iOS Developer")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        Spacer()
    }

    Text("Loves SwiftUI, coffee, and cats.")
        .font(.body)
        .multilineTextAlignment(.leading)

    HStack {
        Spacer()
        Button(action: { }) {
            Text("Follow")
                .foregroundColor(.white)
                .frame(width: 140, height: 44)
                .background(Color.blue)
                .cornerRadius(22)
        }
        Spacer()
    }
}
.padding()
.background(Color(.systemBackground))
.cornerRadius(16)
```

## Worked example B - Simple list row (icon + title/subtitle + grade)

From hw/5 MyGradesView - subject row:

```swift
HStack {
    VStack(alignment: .leading) {
        Text("4 Credit")
            .font(.caption2)
            .foregroundColor(.gray)
        Text("Math")
            .font(.headline)
    }
    Spacer()                    // pushes grade to the right edge
    Text("3.0")
        .font(.title3)
        .bold()
        .foregroundColor(.blue)
}
.padding(.vertical, 4)
```

## Worked example C - Settings row (icon + label + chevron)

Wireframe:

```
[bell]  Notifications              >
```

```swift
HStack(spacing: 12) {
    Image(systemName: "bell.fill")
        .font(.title3)
        .foregroundStyle(.orange)
        .frame(width: 28)
    Text("Notifications")
        .font(.body)
    Spacer()
    Image(systemName: "chevron.right")
        .foregroundStyle(.secondary)
}
.padding(.horizontal, 16)
.padding(.vertical, 12)
.background(Color(.secondarySystemBackground))
.cornerRadius(10)
```

## Worked example D - ZStack overlay card

Image + date badge top-right + title bottom-left (from hw/3 TravelPackage):

```swift
ZStack(alignment: .topTrailing) {
    Image("mountain")
        .resizable()
        .frame(width: 320, height: 320)
        .clipped()

    // Date badge (top-trailing because of ZStack alignment)
    VStack {
        Text("20").font(.title.weight(.bold))
        Text("Nov").fontWeight(.semibold)
    }
    .padding(8)
    .background(.white)
    .cornerRadius(12)
    .padding(12)

    // Title (bottom-leading) - VStack+Spacer trick
    VStack {
        Spacer()
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
            Spacer()
        }
    }
    .frame(width: 320, height: 320)
}
```

---

## Two-card stat row (from hw/5 MyGradesView)

```swift
HStack(spacing: 15) {
    VStack {
        Text("GPAX").font(.caption).bold()
        Text("3.25").font(.system(size: 34, weight: .bold))
    }
    .foregroundColor(.white)
    .frame(maxWidth: .infinity)
    .padding(.vertical, 20)
    .background(Color.blue)
    .cornerRadius(15)

    VStack {
        Text("Credits").font(.caption).bold()
        Text("36").font(.system(size: 34, weight: .bold))
    }
    .foregroundColor(.white)
    .frame(maxWidth: .infinity)
    .padding(.vertical, 20)
    .background(Color.green)
    .cornerRadius(15)
}
.padding()
```

Key trick: `.frame(maxWidth: .infinity)` on each card makes them split the row equally.

---

## Common pitfalls (graders look for these)

1. Forgetting `.resizable()` before `.frame()` on `Image("asset")` - the image keeps its
   intrinsic size and ignores your frame.
2. `.padding().background()` vs `.background().padding()` - first paints background OUTSIDE
   the padded area (large coloured block); second paints background hugging the content
   (small coloured block, white margin around it).
3. Putting `.cornerRadius()` before `.background()` - background re-draws square corners on top.
   Always: frame -> background -> cornerRadius.
4. Using `.frame(width:height:)` on an SF Symbol expecting it to grow - SF Symbols size with
   `.font(.system(size:))` or `.imageScale(.large)`. To stretch them, add `.resizable()` first.
5. Forgetting `Spacer()` when pushing to edges - without Spacer, HStack centres its content.
6. ZStack alignment confusion - `alignment:` only applies to children that do not themselves
   fill the ZStack. To pin a child to a corner inside a fixed-size ZStack, wrap in
   `VStack { Spacer(); HStack { content; Spacer() } }` or set
   `.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)`.
7. `foregroundColor` vs `foregroundStyle` - both work; `foregroundStyle` is newer and accepts
   gradients and hierarchy (`.secondary`, `.tertiary`).
8. `.scaledToFill()` without `.clipped()` lets the image draw outside its frame.

---

## Cheat-sheet ordering for a card-style view

```swift
content
    .padding()                  // inner padding
    .frame(maxWidth: .infinity) // expand width
    .background(Color.X)        // paint background (includes padding)
    .cornerRadius(R)            // round corners of the painted area
    .padding(.horizontal)       // outer margin from screen edges
```

---

## Drill plan (last 4 days)

- Day 1: redraw 3 wireframes from memory, no peeking. Compare to homework solutions.
- Day 2: practice Image modifiers - draw a card with image cover and overlay badge.
- Day 3: practice complex HStack/VStack nesting (settings list of 5 rows).
- Day 4: timed practice - one wireframe in 10 minutes, code-only on paper.
