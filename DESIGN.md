---
name: "Yearn Governance Apps"
description: "A restrained product UI system for Yearn governance workflows."
colors:
  yearn-blue: "#0657f9"
  neutral-0: "#ffffff"
  neutral-50: "#f5f5f5"
  neutral-100: "#fafafa"
  neutral-200: "#f0f0f0"
  neutral-300: "#e5e5e5"
  neutral-400: "#a3a3a3"
  neutral-500: "#737373"
  neutral-600: "#525252"
  neutral-700: "#404040"
  neutral-800: "#262626"
  neutral-900: "#171717"
  sunset-600: "#fb7f33"
  disco-700: "#b71962"
  tokyo-600: "#5814fb"
  success-700: "#00796d"
  error-700: "#c73203"
  warning-300: "#ffdc53"
typography:
  display:
    fontFamily: "Aeonik, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "0"
  headline:
    fontFamily: "Aeonik, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0"
  title:
    fontFamily: "Aeonik, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0"
  body:
    fontFamily: "Aeonik, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "Aeonik, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.025em"
rounded:
  box: "8px"
  control: "8px"
  compact: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.neutral-900}"
    textColor: "{colors.neutral-0}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 24px"
  button-secondary:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-900}"
    rounded: "{rounded.control}"
    height: "48px"
    padding: "0 24px"
  card-default:
    backgroundColor: "{colors.neutral-0}"
    textColor: "{colors.neutral-900}"
    rounded: "{rounded.box}"
    padding: "24px"
---

# Design System: Yearn Governance Apps

## 1. Overview

**Creative North Star: "The Governance Console"**

This is a product interface for people doing governance and finance work, not a
campaign site. The visual system is quiet, dense, and precise: neutral surfaces,
clear type, compact control groups, and strong state language. The polished
routes use different page shapes, but they share a common discipline: show the
system state first, then guide the next action.

The design rejects generic AI dashboard aesthetics, decorative gradients,
glassmorphism, and one-size-fits-all card grids. `/teams` and `/ybc` should feel
like they belong beside `/styfi`, `/veyfi`, and `/yeth`, while keeping their own
command-center and governance-board workflows.

**Key Characteristics:**

- Product register, web platform, restrained color strategy.
- Aeonik for all UI text, Aeonik Mono for addresses, amounts, periods, and IDs.
- Flat neutral surfaces with 8px radii and sparse shadows.
- Accent colors reserved for brand identity, active selection, primary action,
  and semantic state.
- Persistent copy for blocked, terminal, loading, empty, and permissioned states.

## 2. Colors

The palette is neutral-first with one Yearn ecosystem blue and route-specific
brand accents.

### Primary

- **Yearn Blue**: The shared ecosystem accent used for brand marks, selected
  state, and high-confidence emphasis.
- **Ink Neutral**: The text and primary-action anchor.

### Secondary

- **stYFI Sunset**: Route accent for stYFI and stYFIx flows.
- **veYFI Disco**: Route accent for veYFI and LLYFI flows.
- **yETH Tokyo**: Route accent for yETH recovery flows.

### Neutral

- **App Canvas**: The page background and quiet separators.
- **Surface**: Cards, panels, popovers, and command areas.
- **Surface Secondary**: Hover, selected, and nested information areas.
- **Border**: Structural hairlines, dividers, and table boundaries.
- **Text Secondary**: Supporting copy and metadata, always with AA contrast.
- **Text Tertiary**: Labels, timestamps, and eyebrow text only.
- **Semantic State**: Success, error, and warning colors are used for toasts,
  alerts, and status feedback, paired with high-contrast text.

### Named Rules

**The Accent Rarity Rule.** Accent color should be rare enough that active
state, selection, or action meaning remains obvious. Do not use accent color as
ambient decoration.

**The Neutral Legibility Rule.** Gray copy on colored backgrounds is prohibited.
Use high-contrast ink or a darker shade of the same semantic color.

## 3. Typography

**Display Font:** Aeonik with system-ui fallback
**Body Font:** Aeonik with system-ui fallback
**Label/Mono Font:** Aeonik Mono for numbers, addresses, IDs, and compact code

**Character:** One family carries the product UI. Weight, spacing, and color
create hierarchy; decorative font pairing would add noise.

### Hierarchy

- **Display** (700, 3rem, 1.05): Route-level titles only.
- **Headline** (700, 1.875rem, 1.2): Major section and command-center headings.
- **Title** (700, 1.25rem, 1.25): Card and panel titles.
- **Body** (400, 1rem, 1.5): Descriptions, explanatory copy, and state text.
  Body copy should stay within roughly 65-75ch when it is prose.
- **Label** (700, 0.75rem, 0.025em): Small uppercase labels and table metadata.

### Named Rules

**The Product Type Rule.** Use fixed rem sizes for app UI. Do not use fluid
viewport-scaled typography inside dense operational surfaces.

**The Numeric Stability Rule.** Dynamic amounts, periods, timers, addresses, and
table values use tabular numerals.

## 4. Elevation

The system is flat by default. Depth comes from tonal surface changes, borders,
and very small shadows on cards, dropdowns, modals, and active segmented
controls. Shadows must clarify hierarchy; they are not decoration.

### Shadow Vocabulary

- **Card Rest** (`shadow-sm`): Default surface lift for cards that need to stand
  apart from the app canvas.
- **Overlay** (`shadow-xl`): Dropdowns, modals, floating debug controls, and
  other elements that must sit above route content.

### Named Rules

**The Flat-First Rule.** A panel at rest should not look elevated unless it must
compete with neighboring content. Use spacing and headings before using shadow.

## 5. Components

### Buttons

- **Shape:** Gently curved rectangle (8px radius).
- **Primary:** Neutral ink background with white text; route-branded variants
  are allowed only for route-owned primary actions.
- **Hover / Focus:** Color shift, visible focus ring, and no layout movement.
- **Active:** Subtle 0.96 press scale unless the caller marks the button static.
- **Size:** Small buttons still provide at least a 40px hit area.

### Chips

- **Style:** Compact badges with bold mono labels, semantic variants, and no
  decorative icons unless the icon conveys state.
- **State:** Brand badges identify route or current user context; warning and
  error badges must correspond to persistent explanatory copy nearby.

### Cards / Containers

- **Corner Style:** 8px radius.
- **Background:** Surface for primary cards, app or surface-secondary for
  nested data blocks.
- **Shadow Strategy:** Default cards use a small shadow; flat cards use tonal
  layering and no shadow.
- **Border:** Structural hairline only; side-stripe accents are prohibited.
- **Internal Padding:** 24px for full cards, 16px for compact data blocks.

### Inputs / Fields

- **Style:** Surface or surface-secondary fill, 8px radius, border token.
- **Focus:** Text-primary ring or border shift with clear contrast.
- **Error / Disabled:** Persistent text near the field; never tooltip-only.

### Navigation

- **Style:** Global header remains stable across routes. Domain navigation lives
  inside the route and should use shared tabs, segmented controls, and anchor
  targets rather than bespoke navigation widgets.
- **Mobile:** Controls can scroll horizontally, but labels must remain readable
  and touch targets must remain at least 40px tall.

## 6. Do's and Don'ts

### Do:

- **Do** reuse `components/ui/*` before adding route-local primitives.
- **Do** keep copy local to `app/<domain>/messages.ts`.
- **Do** use `StatsBar`, `Tabs`, `ViewToggle`, `Card`, `Button`, `Table`, and
  `Badge` consistently across routes.
- **Do** show blocked state in the disabled CTA label and in persistent copy next
  to the action.
- **Do** verify desktop and mobile screenshots for `/styfi`, `/veyfi`, `/yeth`,
  `/teams`, and `/ybc` before calling a design pass done.
- **Do** use `docs/shared/design-review-process.md` for route-level UI and copy
  passes.

### Don't:

- **Don't** use purple gradients, glassmorphism, decorative blobs, or generic AI
  dashboard decoration.
- **Don't** create nested UI cards where spacing, dividers, or tonal data blocks
  are enough.
- **Don't** use `transition: all` or Tailwind `transition-all` for core shared
  controls.
- **Don't** hide governance, permission, terminal, or transaction blockers in
  tooltips only.
- **Don't** force every app into one layout. Uniformity means shared design
  language, not identical information architecture.
