# Design Review Process

**Version:** 1.0
**Scope:** Route-level UI changes, shared UI primitives, user-facing copy, and
production readiness polish across `styfi`, `veyfi`, `yeth`, `teams`, and `ybc`.

---

## Goal

Use one repeatable process for design work so new apps improve toward the
polished app family instead of drifting into one-off prototypes.

The baseline is:

- `PRODUCT.md`
- `DESIGN.md`
- `docs/shared/design-system.md`
- `docs/shared/copy-and-tone.md`
- existing production routes: `/styfi`, `/veyfi`, and `/yeth`
- local Impeccable tooling in `.github/skills/impeccable`
- local interface polish guidance in `.agents/skills/make-interfaces-feel-better`

## Workflow

1. Define the target.
   - Name the route, files, and user flows under review.
   - State whether the surface is mock-only, feed-backed, onchain, or mixed.
   - Check app docs for required behavior before changing UI.

2. Compare against the polished family.
   - Inspect similar flows in `/styfi`, `/veyfi`, and `/yeth`.
   - Reuse shared primitives before adding route-local UI.
   - Keep the app's information architecture domain-specific. Uniformity means
     shared language, controls, state behavior, and polish, not identical pages.

3. Run the copy pass.
   - Review `app/<domain>/messages.ts` and user-visible docs.
   - Apply `docs/shared/copy-and-tone.md`.
   - Cut mock/prototype wording from mature default routes.
   - Keep protocol terms when they are precise.
   - Make disabled actions explain the blocked state in both CTA text and
     persistent nearby copy.

4. Run the interface polish pass.
   - Check hierarchy, spacing, alignment, and responsive behavior.
   - Confirm touch targets are at least 40x40px, with 44x44px where practical.
   - Prefer explicit transition properties over `transition-all`.
   - Use `text-balance` for short headings and `text-pretty` for short body
     copy when it improves wrapping.
   - Use tabular numbers for dynamic values, table numbers, timers, amounts,
     and counters.
   - Avoid nested cards, decorative gradients, glassmorphism, side-stripe
     accents, and generic dashboard tropes.

5. Run static checks.

   ```bash
   node .github/skills/impeccable/scripts/context.mjs --target <path>
   node .github/skills/impeccable/scripts/detect.mjs --json <paths>
   rg -n -i "delve|tapestry|leverage|multifaceted|robust|holistic|utilize|in order to|due to the fact that" app/<domain> docs/apps/<domain>
   ```

   Treat detector output as evidence, not proof. A clean detector result does
   not replace browser review.

6. Verify in the browser for UI changes.
   - Desktop and mobile screenshots for changed routes.
   - Keyboard navigation for changed controls.
   - Console check for runtime errors.
   - Wallet-connect, wrong-network, disconnected, empty, blocked, terminal, and
     loading states when the route supports them.

7. Run tests and update docs.
   - For meaningful code changes, run:

     ```bash
     npm run typecheck
     npm run lint
     npm run test
     ```

   - Run e2e when route behavior, navigation, wallet flow, or responsive UI
     behavior changes:

     ```bash
     npm run test:e2e
     npm run test:e2e:full
     ```

   - For docs-only process changes, run `git diff --check`.
   - Update `docs/apps/<domain>/...` with behavior changes in the same commit.

8. Record review evidence.
   - Note detector results, browser coverage, and test commands in the PR or
     commit summary.
   - If an app intentionally keeps a rough edge, document the reason and the
     follow-up owner.

## Review Table

Use this small table in review notes when a change affects UI or copy.

| Area | Before | After | Evidence |
| :-- | :-- | :-- | :-- |
| Copy | What was wordy, unclear, or prototype-only? | What changed? | File, screenshot, or test |
| Layout | What drifted from the polished app family? | What now aligns? | Screenshot or file |
| States | What state was hidden or ambiguous? | What is now persistent? | Flow or test |
| Responsiveness | What broke or felt cramped? | What was verified? | Viewport notes |
