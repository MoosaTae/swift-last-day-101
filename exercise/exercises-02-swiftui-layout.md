# Topic 2 — SwiftUI Layout & Modifiers: Practice

A practice pack aligned with the closed-book written exam. Every snippet uses only the basic toolkit allowed by the instructor: `VStack`, `HStack`, `ZStack`, `Text`, `Image`, `Spacer`, plus basic modifiers (`.frame`, `.padding`, `.background`, `.foregroundColor`, `.cornerRadius`, `.font`, `.fontWeight`, `.resizable`, `.scaledToFit/Fill`, `.multilineTextAlignment`, `.lineLimit`).

> **React/CSS quick map:** `VStack` = `flex-col`, `HStack` = `flex-row`, `ZStack` = `position: relative` + absolute children (or `grid`). `Spacer()` = a child with `flex: 1` (or `margin-left: auto`). `.frame(maxWidth: .infinity)` = `flex: 1` / `width: 100%`. **The big difference**: modifier order matters in SwiftUI (`.padding().background()` ≠ `.background().padding()`), whereas CSS is mostly order-independent.

---

## Section A — Output / Render Prediction (10 problems)

### A1. Padding then background

```swift
Text("Hello")
    .padding()
    .background(Color.yellow)
```

<details><summary>Answer</summary>

A yellow rectangle whose size is `Text("Hello")` plus 16pt of padding on every side. The yellow fills the padded area, so there is yellow space around the letters. Order: padding wraps the text first, then `.background` paints behind that already-padded view.

> **React/CSS:** equivalent to `<span style={{ padding: 16, background: 'yellow' }}>Hello</span>` — CSS background fills the padding box automatically.
</details>

### A2. Background then padding

```swift
Text("Hello")
    .background(Color.yellow)
    .padding()
```

<details><summary>Answer</summary>

The yellow background hugs the text exactly (no inner gap). Then padding adds 16pt of transparent space outside the yellow box. Visually: small yellow rectangle that just wraps the glyphs, surrounded by a clear margin.

> **React/CSS:** like wrapping yellow tightly: `<span><span style={{ background: 'yellow' }}>Hello</span></span>` with 16pt margin on the outer. **There is no CSS analog to "swap modifier order on the same element"** — Swift modifier order = nesting wrapper views.
</details>

### A3. Image without `.resizable()`

```swift
Image("puppy")
    .frame(width: 50, height: 50)
```

<details><summary>Answer</summary>

The image keeps its intrinsic (original) pixel size and is centered inside a 50x50 frame. If the asset is larger than 50x50 it overflows the frame visually (unless `.clipped()` is added). `.frame` on an image without `.resizable()` only sets the layout box, not the image size.

> **React/CSS:** like `<img src="puppy" />` inside a `<div style={{ width:50, height:50 }}>` — the img keeps its natural size and overflows the div without `object-fit: contain` or `width: 100%`.
</details>

### A4. `.frame` before `.resizable()`

```swift
Image("puppy")
    .frame(width: 50, height: 50)
    .resizable()
```

<details><summary>Answer</summary>

Compiles, but `.resizable()` must be applied to the original `Image`, not to the framed view. The intent of "shrink the picture into 50x50" fails here — the image is still rendered at intrinsic size inside the 50x50 frame. Correct order is `.resizable()` first, then `.frame`.
</details>

### A5. Background then cornerRadius vs cornerRadius then background

```swift
// A5a
Text("A")
    .frame(width: 100, height: 40)
    .background(Color.blue)
    .cornerRadius(10)

// A5b
Text("A")
    .frame(width: 100, height: 40)
    .cornerRadius(10)
    .background(Color.blue)
```

<details><summary>Answer</summary>

A5a: blue 100x40 rectangle with rounded corners (correct rounded button look).
A5b: `.cornerRadius` is applied to the un-coloured frame, then `.background` paints a fresh blue rectangle BEHIND that — with square corners. Result: square blue rectangle. Always do `frame -> background -> cornerRadius`.

> **React/CSS:** in CSS this is one element: `border-radius` clips the background regardless of property order — no equivalent gotcha. Swift is stricter because each modifier wraps a new view.
</details>

### A6. HStack with one Spacer

```swift
HStack {
    Text("Left")
    Spacer()
    Text("Right")
}
```

<details><summary>Answer</summary>

`Left` pinned to the left edge, `Right` pinned to the right edge, the `Spacer` consumes all the gap in between. The HStack itself fills the parent width because a Spacer expands.

> **React/CSS:** `display: flex; justify-content: space-between` — or simply `<div className="flex"><span>Left</span><div className="flex-1"/><span>Right</span></div>`.
</details>

### A7. VStack default alignment

```swift
VStack {
    Text("Title")
    Text("A much longer subtitle line")
}
```

<details><summary>Answer</summary>

Both texts are horizontally centered relative to each other (default `VStack` alignment is `.center`). To left-align, write `VStack(alignment: .leading)`.

> **React/CSS:** equivalent to `flex flex-col items-center`. `.leading` = `items-start`. Note: SwiftUI defaults to `center`, Tailwind/CSS flex defaults to `stretch`.
</details>

### A8. ZStack alignment

```swift
ZStack(alignment: .topTrailing) {
    Color.gray.frame(width: 200, height: 200)
    Text("NEW")
        .padding(6)
        .background(Color.red)
        .foregroundColor(.white)
}
```

<details><summary>Answer</summary>

A 200x200 grey square with a small red "NEW" badge anchored to the top-right corner. The `Color.gray` fills the ZStack (gives it size); the badge sits on top, aligned top-trailing because of the ZStack alignment argument.

> **React/CSS:** `<div className="relative w-50 h-50 bg-gray-400"><span className="absolute top-0 right-0 ...">NEW</span></div>` — ZStack alignment is the absolute-positioning anchor.
</details>

### A9. `.frame(maxWidth: .infinity)` inside HStack

```swift
HStack(spacing: 10) {
    Text("A").frame(maxWidth: .infinity).background(Color.red)
    Text("B").frame(maxWidth: .infinity).background(Color.green)
    Text("C").frame(maxWidth: .infinity).background(Color.blue)
}
```

<details><summary>Answer</summary>

Three equally wide coloured cells (red, green, blue) splitting the available row width into thirds, each containing a centered letter. `maxWidth: .infinity` makes each child claim equal share of the remaining horizontal space.

> **React/CSS:** equivalent to three children with `flex: 1` each — `<div className="flex gap-2"><div className="flex-1 bg-red-500">A</div>...</div>`.
</details>

### A10. SF Symbol sizing trap

```swift
Image(systemName: "star.fill")
    .frame(width: 100, height: 100)
    .foregroundColor(.yellow)
```

<details><summary>Answer</summary>

A small yellow star at its default body-text size, centered inside a 100x100 invisible frame. SF Symbols scale with `.font(.system(size:))` or `.imageScale`, NOT with `.frame`. To actually grow the glyph, add `.resizable().scaledToFit()` before `.frame`, or use `.font(.system(size: 100))`.

> **React/CSS:** SF Symbols behave like icon fonts (e.g. Font Awesome) — sized by `font-size`, not container width. `.frame` is the icon's wrapper box, not the glyph itself.
</details>

---

## Section B — Code Improvement (8 problems)

### B1. Frame before resizable on an asset image

```swift
Image("avatar")
    .frame(width: 80, height: 80)
    .resizable()
    .clipShape(Circle())
```

<details><summary>Improved code & reasons</summary>

```swift
Image("avatar")
    .resizable()
    .scaledToFill()
    .frame(width: 80, height: 80)
    .clipShape(Circle())
```

Reasons:
- `.resizable()` must come BEFORE `.frame`, otherwise the bitmap renders at intrinsic size and is just placed inside the 80x80 box.
- Add `.scaledToFill()` (with the clip) so the avatar fills the circle without distortion.

> **React/CSS:** equivalent to `<img className="w-20 h-20 rounded-full object-cover" />`. `object-cover` ≈ `.scaledToFill().clipped()`.
</details>

### B2. Padding before background when student wants the colour to include padding

```swift
Text("Submit")
    .foregroundColor(.white)
    .background(Color.blue)
    .padding()
```

<details><summary>Improved code & reasons</summary>

```swift
Text("Submit")
    .foregroundColor(.white)
    .padding()
    .background(Color.blue)
```

Reasons:
- The original paints blue tightly around the glyphs and then adds clear padding outside — the button looks tiny.
- Apply `.padding()` first so the view grows, THEN `.background` to colour the enlarged area. This is the standard "tap target with breathing room" pattern.

> **React/CSS:** in CSS, `padding` and `background` are applied to the same element so order is irrelevant. SwiftUI gotcha: each modifier wraps a new view, so order = nesting order = visual order.
</details>

### B3. Hard-coded width that should fill the parent

```swift
VStack {
    Text("GPAX").bold()
    Text("3.25").font(.title)
}
.frame(width: 180)
.padding(.vertical, 20)
.background(Color.blue)
.cornerRadius(15)
```

<details><summary>Improved code & reasons</summary>

```swift
VStack {
    Text("GPAX").bold()
    Text("3.25").font(.title)
}
.foregroundColor(.white)
.frame(maxWidth: .infinity)
.padding(.vertical, 20)
.background(Color.blue)
.cornerRadius(15)
```

Reasons:
- Hard-coding `width: 180` breaks on different device sizes (SE vs Pro Max) and inside an HStack of stat cards.
- `maxWidth: .infinity` lets the card expand to share row space equally with siblings, which is the typical stat-card pattern.

> **React/CSS:** same lesson — prefer `flex: 1` / `w-full` over fixed widths. Hard-coded `width: 180px` is a responsive-design smell in both worlds.
</details>

### B4. Missing Spacer for left-anchoring text

```swift
HStack {
    Text("Username")
}
.padding()
```

<details><summary>Improved code & reasons</summary>

```swift
HStack {
    Text("Username")
    Spacer()
}
.padding()
```

Reasons:
- An HStack with a single child centers it because there is nothing else competing for space.
- Adding a trailing `Spacer()` consumes the right side of the row, pushing the text to the leading edge — the standard form-row layout.

> **React/CSS:** `<div className="flex"><span>Username</span><div className="flex-1"/></div>` — or just `justify-start` + `w-full`. `Spacer()` is the explicit "fill remaining space" child.
</details>

### B5. Excessive ZStack nesting that could be `.background()`

```swift
ZStack {
    Color.blue
        .cornerRadius(12)
    Text("Welcome")
        .foregroundColor(.white)
        .padding()
}
.frame(width: 200, height: 60)
```

<details><summary>Improved code & reasons</summary>

```swift
Text("Welcome")
    .foregroundColor(.white)
    .padding()
    .frame(width: 200, height: 60)
    .background(Color.blue)
    .cornerRadius(12)
```

Reasons:
- A ZStack just to put a colour behind a single label is overkill. The `.background` modifier exists for exactly this case.
- Fewer views means clearer intent and easier maintenance. Reserve ZStack for multiple stacked children that need independent alignment.

> **React/CSS:** `<div className="bg-blue-500 rounded-xl">` — no need for an extra absolutely-positioned color element. Same simplification.
</details>

### B6. Wrong VStack alignment when content should be leading

```swift
VStack(spacing: 4) {
    Text("Order #1041")
        .font(.headline)
    Text("Shipped on May 3")
        .font(.caption)
        .foregroundColor(.gray)
}
.padding()
```

<details><summary>Improved code & reasons</summary>

```swift
VStack(alignment: .leading, spacing: 4) {
    Text("Order #1041")
        .font(.headline)
    Text("Shipped on May 3")
        .font(.caption)
        .foregroundColor(.gray)
}
.padding()
```

Reasons:
- Default VStack alignment is `.center`, which centers each line independently — fine for hero text, wrong for left-aligned list rows.
- Adding `alignment: .leading` makes both lines share the same left edge, matching typical list-cell wireframes.

> **React/CSS:** swap `items-center` (default for SwiftUI VStack) → `items-start` (the typical list-row choice).
</details>

### B7. Missing multilineTextAlignment / lineLimit on a long caption

```swift
Text("This is a very long product description that the designer wants to wrap onto multiple centered lines under the title.")
    .font(.body)
    .padding()
```

<details><summary>Improved code & reasons</summary>

```swift
Text("This is a very long product description that the designer wants to wrap onto multiple centered lines under the title.")
    .font(.body)
    .multilineTextAlignment(.center)
    .lineLimit(3)
    .padding()
```

Reasons:
- Without `.multilineTextAlignment`, wrapped lines fall back to the leading edge even though the rest of the screen is centered.
- `.lineLimit(3)` protects the layout from overflowing when the string grows. Combine with truncation rather than letting the card stretch unpredictably.

> **React/CSS:** `text-align: center` + `line-clamp-3`. Same problem (long copy breaks layout), same kind of fix.
</details>

### B8. Hard-coded magic colour values

```swift
VStack {
    Text("Premium").foregroundColor(.white)
}
.padding()
.background(Color(red: 0.16, green: 0.50, blue: 0.85))
.cornerRadius(10)
```

<details><summary>Improved code & reasons</summary>

```swift
// Use a named colour so intent is clear and the value is reusable.
// Define once (e.g. in Assets or as a static), then reference by name.
VStack {
    Text("Premium").foregroundColor(.white)
}
.padding()
.background(Color.blue)        // or Color("BrandPrimary") from Assets
.cornerRadius(10)
```

Reasons:
- Raw `Color(red:green:blue:)` literals scattered across views are unreadable and impossible to keep consistent.
- Use a system colour (`.blue`) for prototypes, or define a named asset colour like `Color("BrandPrimary")`. The code now communicates intent ("brand colour") instead of an opaque triplet.

> **React/CSS:** raw `rgb(41,128,217)` everywhere is the same smell. Prefer Tailwind tokens (`bg-blue-500`), CSS variables (`var(--brand-primary)`), or a theme constant.
</details>

---

## Section C — View Decomposition (8 wireframes)

> **React framing:** these are pure component-tree exercises. Each `VStack` ≈ a `<div className="flex flex-col">`, each `HStack` ≈ `<div className="flex flex-row">`. The decomposition skill is identical to React component splitting.

### C1. Profile card — image + name + email column

```
+--------------------------------+
|                                |
|         + - - - - - +          |
|         |   IMG     |          |
|         + - - - - - +          |
|                                |
|         Jane Doe               |
|         jane@mail.com          |
|                                |
+--------------------------------+
```

Sizing: avatar 100x100, content centered horizontally.

<details><summary>Reference solution</summary>

```swift
VStack(spacing: 8) {
    Image("avatar")
        .resizable()
        .scaledToFill()
        .frame(width: 100, height: 100)
        .cornerRadius(50)

    Text("Jane Doe")
        .font(.title2)
        .fontWeight(.bold)

    Text("jane@mail.com")
        .font(.subheadline)
        .foregroundColor(.gray)
}
.padding()
.frame(maxWidth: .infinity)
.background(Color(.secondarySystemBackground))
.cornerRadius(16)
```

</details>

### C2. Settings row — icon + label + chevron

```
+----------------------------------------+
| [bell]   Notifications              >  |
+----------------------------------------+
```

Sizing: row fills width; icon 24pt; chevron right-aligned via Spacer.

<details><summary>Reference solution</summary>

```swift
HStack(spacing: 12) {
    Image(systemName: "bell.fill")
        .font(.title3)
        .foregroundColor(.orange)
        .frame(width: 28)

    Text("Notifications")
        .font(.body)

    Spacer()

    Image(systemName: "chevron.right")
        .foregroundColor(.gray)
}
.padding(.horizontal, 16)
.padding(.vertical, 12)
.background(Color(.secondarySystemBackground))
.cornerRadius(10)
```

</details>

### C3. Stat card — three metrics row

```
+----------------------------------------+
|     12        58         7             |
|   Posts   Followers   Following        |
+----------------------------------------+
```

Sizing: three equal columns, number above label, each column expands.

<details><summary>Reference solution</summary>

```swift
HStack(spacing: 0) {
    VStack(spacing: 4) {
        Text("12").font(.title).fontWeight(.bold)
        Text("Posts").font(.caption).foregroundColor(.gray)
    }
    .frame(maxWidth: .infinity)

    VStack(spacing: 4) {
        Text("58").font(.title).fontWeight(.bold)
        Text("Followers").font(.caption).foregroundColor(.gray)
    }
    .frame(maxWidth: .infinity)

    VStack(spacing: 4) {
        Text("7").font(.title).fontWeight(.bold)
        Text("Following").font(.caption).foregroundColor(.gray)
    }
    .frame(maxWidth: .infinity)
}
.padding(.vertical, 16)
.background(Color(.secondarySystemBackground))
.cornerRadius(12)
```

</details>

### C4. Login form — title, two fields, button

```
+----------------------------------+
|                                  |
|            Sign In               |
|                                  |
|  +----------------------------+  |
|  | Email                      |  |
|  +----------------------------+  |
|                                  |
|  +----------------------------+  |
|  | Password                   |  |
|  +----------------------------+  |
|                                  |
|       [    Log In    ]           |
|                                  |
+----------------------------------+
```

Sizing: fields full-width, button centered with fixed width. Treat fields as labelled rectangles using Text + background.

<details><summary>Reference solution</summary>

```swift
VStack(spacing: 16) {
    Text("Sign In")
        .font(.largeTitle)
        .fontWeight(.bold)
        .padding(.bottom, 12)

    Text("Email")
        .foregroundColor(.gray)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(8)

    Text("Password")
        .foregroundColor(.gray)
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(8)

    Text("Log In")
        .font(.headline)
        .foregroundColor(.white)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(Color.blue)
        .cornerRadius(10)
        .padding(.top, 8)
}
.padding()
```

</details>

### C5. Photo with overlay caption (ZStack)

```
+----------------------------+
|                            |
|          IMAGE             |
|                            |
|                            |
| Sunset at the harbour      |
+----------------------------+
```

Sizing: image fills the card; caption pinned bottom-leading.

<details><summary>Reference solution</summary>

```swift
ZStack(alignment: .bottomLeading) {
    Image("harbour")
        .resizable()
        .scaledToFill()
        .frame(width: 320, height: 220)
        .clipped()

    Text("Sunset at the harbour")
        .font(.headline)
        .foregroundColor(.white)
        .padding(8)
        .background(Color.black.opacity(0.5))
        .cornerRadius(6)
        .padding(12)
}
.frame(width: 320, height: 220)
.cornerRadius(16)
```

</details>

### C6. List item — avatar left, two-line text middle, badge right

```
+--------------------------------------------+
| (O)   Anna Lee                  [ NEW ]    |
|       Sent you a message                   |
+--------------------------------------------+
```

Sizing: avatar 48x48, text column expands, badge hugs right.

<details><summary>Reference solution</summary>

```swift
HStack(spacing: 12) {
    Image("avatar")
        .resizable()
        .scaledToFill()
        .frame(width: 48, height: 48)
        .cornerRadius(24)

    VStack(alignment: .leading, spacing: 2) {
        Text("Anna Lee")
            .font(.headline)
        Text("Sent you a message")
            .font(.subheadline)
            .foregroundColor(.gray)
    }

    Spacer()

    Text("NEW")
        .font(.caption)
        .fontWeight(.bold)
        .foregroundColor(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.red)
        .cornerRadius(8)
}
.padding(.horizontal, 16)
.padding(.vertical, 8)
```

</details>

### C7. Header bar — back button (left), title (center), action icon (right)

```
+----------------------------------------+
| <          Profile               [...] |
+----------------------------------------+
```

Sizing: full-width row, equal-weight Spacers around the title to keep it centered.

<details><summary>Reference solution</summary>

```swift
HStack {
    Image(systemName: "chevron.left")
        .font(.title3)
        .foregroundColor(.blue)

    Spacer()

    Text("Profile")
        .font(.headline)

    Spacer()

    Image(systemName: "ellipsis")
        .font(.title3)
        .foregroundColor(.blue)
}
.padding(.horizontal, 16)
.padding(.vertical, 12)
.frame(maxWidth: .infinity)
.background(Color(.secondarySystemBackground))
```

</details>

### C8. Pricing card — tier, price, 4 features, CTA button

```
+--------------------------------+
|            Pro Plan            |
|                                |
|            $9.99 / mo          |
|                                |
|  [v] Unlimited projects        |
|  [v] Priority support          |
|  [v] Custom themes             |
|  [v] Offline mode              |
|                                |
|       [   Subscribe   ]        |
+--------------------------------+
```

Sizing: card full-width, features left-aligned, CTA full-width inside card padding.

<details><summary>Reference solution</summary>

```swift
VStack(alignment: .leading, spacing: 12) {
    Text("Pro Plan")
        .font(.title2)
        .fontWeight(.bold)
        .frame(maxWidth: .infinity, alignment: .center)

    Text("$9.99 / mo")
        .font(.largeTitle)
        .fontWeight(.bold)
        .foregroundColor(.blue)
        .frame(maxWidth: .infinity, alignment: .center)
        .padding(.bottom, 8)

    HStack(spacing: 8) {
        Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
        Text("Unlimited projects")
    }
    HStack(spacing: 8) {
        Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
        Text("Priority support")
    }
    HStack(spacing: 8) {
        Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
        Text("Custom themes")
    }
    HStack(spacing: 8) {
        Image(systemName: "checkmark.circle.fill").foregroundColor(.green)
        Text("Offline mode")
    }

    Text("Subscribe")
        .font(.headline)
        .foregroundColor(.white)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(Color.blue)
        .cornerRadius(10)
        .padding(.top, 8)
}
.padding()
.frame(maxWidth: .infinity)
.background(Color(.secondarySystemBackground))
.cornerRadius(16)
```

</details>

---

## Section D — Practical Mini-Tasks (2 small refactors)

### D1. Stat-row card refactor

Broken View:

```swift
HStack {
    VStack {
        Text("GPAX").bold()
        Text("3.25").font(.system(size: 34, weight: .bold))
    }
    .frame(width: 150)
    .background(Color.blue)
    .cornerRadius(15)
    .padding()

    VStack {
        Text("Credits").bold()
        Text("36").font(.system(size: 34, weight: .bold))
    }
    .frame(width: 150)
    .background(Color.green)
    .cornerRadius(15)
    .padding()
}
```

Your task: make both cards split the row equally on every device, white text, 20pt vertical padding inside the coloured area, and 16pt of outer margin around the whole HStack — not between cards individually.

<details><summary>Reference solution</summary>

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

Why this works:
- `frame(maxWidth: .infinity)` on each card replaces the hard-coded `width: 150`, so the cards share the available row width on any device.
- The coloured `.background` is applied AFTER `.padding(.vertical, 20)` so the colour includes the inner padding.
- `.padding()` is moved to the outer HStack instead of each card, so the gap between cards is controlled by `spacing: 15` and the screen margin is uniform.

> **React/CSS:** equivalent to two `flex-1` cards in a `flex gap-4 p-4` container. Padding on the outer flex parent = uniform screen margin; gap between children = `gap-4`.
</details>

### D2. Notification row refactor

Broken View:

```swift
HStack {
    Image("avatar")
        .frame(width: 40, height: 40)
    VStack {
        Text("Anna Lee").font(.headline)
        Text("Sent you a message").font(.caption)
    }
    Text("NEW")
        .background(Color.red)
        .foregroundColor(.white)
        .cornerRadius(8)
        .padding()
}
.padding()
```

Your task: avatar must actually be circular and 40x40, text column must be left-aligned with the badge pushed to the right edge, and the red `NEW` badge must have padding INSIDE the red pill (not around it).

<details><summary>Reference solution</summary>

```swift
HStack(spacing: 12) {
    Image("avatar")
        .resizable()
        .scaledToFill()
        .frame(width: 40, height: 40)
        .cornerRadius(20)

    VStack(alignment: .leading, spacing: 2) {
        Text("Anna Lee").font(.headline)
        Text("Sent you a message")
            .font(.caption)
            .foregroundColor(.gray)
    }

    Spacer()

    Text("NEW")
        .font(.caption)
        .fontWeight(.bold)
        .foregroundColor(.white)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.red)
        .cornerRadius(8)
}
.padding()
```

Why this works:
- `.resizable()` is now applied before `.frame`, so the avatar actually scales down to 40x40, and `.cornerRadius(20)` (half the side) makes it a circle.
- `VStack(alignment: .leading)` left-aligns the two text lines (default was `.center`).
- A `Spacer()` between the text column and the badge pushes `NEW` to the trailing edge.
- The red badge applies `.padding` BEFORE `.background`, so the red pill includes the inner spacing instead of leaving a tight red rectangle wrapped by transparent padding.

> **React/CSS:** identical pattern — `<img className="w-10 h-10 rounded-full object-cover" />`, `flex-1` on the text column (or `flex-grow`), `ml-auto` or `<Spacer/>` to push the badge right, and `px-2 py-1 bg-red-500 rounded` for the pill.
</details>
