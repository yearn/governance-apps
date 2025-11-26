# 6. Design System & UI Standards

**Version:** 1.0
**Scope:** Visual language, typography, and component usage for `governance-apps`.

---

## 1. Philosophy: "The Yearn Look"

This application follows the **Yearn Press Kit** aesthetic but adapts it for a specialized governance interface.

- **Clean & High Contrast:** We avoid the "heavy dark mode glow" of older DeFi apps. We prefer distinct borders, clear white/grey surfaces, and strong typographic hierarchy.
- **Data-First:** Numbers are citizens of the first class. They use a dedicated monospaced font (`Aeonik Mono`) to ensure tabular alignment and readability.
- **Sub-Branding:**
  - **stYFI** is defined by **"Metaverse Sunset" (Orange)**.
  - **veYFI** is defined by **"Disco Salmon" (Pink)**.
  - **Shared/System** elements use **Yearn Blue** or Neutral Greys.

---

## 2. Typography

We use a dual-font stack. Fonts are served locally from `/public/fonts/` to ensure privacy and performance.

### 2.1. Sans-Serif: `Aeonik`

Used for headings, body text, labels, and navigation.

- **Variable:** `--font-sans`
- **Weights:**
  - `400` (Regular) - Body text
  - `700` (Bold) - Headings, Buttons

### 2.2. Monospace: `Aeonik Mono`

Used strictly for **financial data**, **addresses**, **hashes**, and **percentages**.

- **Variable:** `--font-mono`
- **Utility Class:** `.font-number`
- **Weights:**
  - `400` (Regular) - Data table values
  - `700` (Bold) - Big hero numbers, input fields

---

## 3. Color Palette

Colors are defined as CSS variables in `app/globals.css` and exposed via Tailwind v4 theme tokens.

### 3.1. Neutrals ("Good ol' Grey")

Used for backgrounds, borders, and text.

- `bg-neutral-100` - Page Background (Light Grey)
- `bg-neutral-0` - Cards / Modals (White)
- `border-neutral-300` - Standard Borders
- `text-neutral-900` - Primary Text (Almost Black)
- `text-neutral-600` - Secondary Text

### 3.2. Brand Colors

| Brand     | Token Name   | Hex (Approx) | Usage                                         |
| :-------- | :----------- | :----------- | :-------------------------------------------- |
| **Yearn** | `yearn-blue` | `#0657F9`    | Global accents, links, primary system buttons |
| **stYFI** | `sunset-500` | `#F8A908`    | stYFI Buttons, Highlights                     |
| **veYFI** | `disco-600`  | `#CC3767`    | veYFI Buttons, Highlights                     |

---

## 4. UI Primitives

We do not use an external UI library (like ShadCN or MUI). We own a small set of "dumb" components in `components/ui`.

### 4.1. `Button`

- **Variants:**
  - `primary`: Black background, white text (Generic actions).
  - `secondary`: White background, border (Cancel/Back).
  - `ghost`: No background (Navigation/utility).
  - `styfi`: **Orange** background (Specific to stYFI staking).
  - `veyfi`: **Pink** background (Specific to veYFI staking).
- **Loading State:** Handles its own spinner via `isLoading` prop.

### 4.2. `AmountInput`

The "Yearn-style" massive input field.

- Features a built-in **MAX** button.
- Features a built-in **Token Symbol** badge.
- Uses `font-mono` for the input value.
- Handles its own error state styling (red border).

### 4.3. `Toast`

A centralized notification system wrapping `react-hot-toast`.

- **Usage:** Driven by `useTx` hook automatically.
- **Manual Usage:** `import { toast } from "@/components/ui/Toast"`

### 4.4. `Table`

A clean, unopinionated table structure.

- Use for lists of LLYFI tokens or historical data.
- Supports `font-mono` cells for financial data.

### 4.5. `Tooltip`

A lightweight, styled tooltip wrapper for hover/focus hints.

- Usage: `<Tooltip content="Switch modes"><Button>...</Button></Tooltip>`
- Positions: `top` (default), `bottom`, `left`, `right`.
- Does not pull copy; consumers pass strings from feature `messages.ts`.

---

## 5. Layout Patterns

- **Header:** Sticky, backdrop-blur. Contains the `AppLauncher` (grid menu) and `WalletButton`.
- **Page Layout:** Centered single-column layout for main interactions (max-width ~480px for forms, wider for dashboards).
- **Cards:** All major interactions (Stake, Cooldown) live inside `Card` components with `p-6` padding.

---

## 6. Developer Workflow

### 6.1. Visual Testing

We maintain a "Kitchen Sink" page to audit components without needing to connect a wallet or perform transactions.

- **Path:** `/app/debug/ui/page.tsx`
- **URL:** `http://localhost:3000/debug/ui`
- **Requirement:** Check this page when modifying global CSS to ensure no regressions.

### 6.2. Adding Icons

1. Export SVG from Figma/Press Kit.
2. Clean up (remove `width`/`height` attributes, change `fill` to `currentColor`).
3. Wrap in a React component in `components/icons/`.
4. Ensure it accepts `className` for Tailwind styling.

---
