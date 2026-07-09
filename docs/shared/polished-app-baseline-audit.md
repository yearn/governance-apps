# Polished App Baseline Audit

**Date:** July 9, 2026
**Branch:** `codex/design-baseline`
**Baseline commit inspected:** `4b52820`
**Scope:** `/styfi`, `/veyfi`, `/yeth`, and `components/ui`

---

## Summary

No broad redesign is recommended for the polished app family. These routes
remain the control group for Teams and YBC design work: restrained product UI,
route-specific workflow shapes, shared primitives, visible state copy, and
compact financial data.

## Automated Checks

| Check | Command | Result |
| :-- | :-- | :-- |
| Impeccable detector | `node .github/skills/impeccable/scripts/detect.mjs --json app/styfi app/veyfi app/yeth components/ui` | `[]` |
| Plain-English scan | `rg -n -i "<plain-English terms>" app/styfi app/veyfi app/yeth docs/apps/styfi docs/apps/veyfi docs/apps/yeth docs/shared/copy-and-tone.md DESIGN.md PRODUCT.md` | Only literal `ecosystem` usage was found. No rewrite needed. |

## Findings

| Route | Keep | Watch next |
| :-- | :-- | :-- |
| `/styfi` | Clear route mode model, persistent wallet/network states, strong staking/cooldown labels, and compact reward copy. | Keep APR, voting, cooldown, claim, and delegation terms precise. Do not simplify protocol facts into vague marketing copy. |
| `/veyfi` | The migration, LLYFI ledger, trade controls, inventory, and rewards handoff use clear task structure. | `ecosystem` is acceptable where it means the stYFI product family. Avoid adding broader marketing language around it. |
| `/yeth` | Recovery states, risk language, and manual fallback copy are direct and state-driven. | Some labels are intentionally long because they carry risk or settlement meaning. Do not shorten them without a protocol/legal review. |

## Baseline Rules Carried Forward

| Area | Current Baseline | Future Rule |
| :-- | :-- | :-- |
| Copy | Mature routes avoid route-shell prototype wording and keep copy in `messages.ts`. | Run the shared copy pass before UI review. |
| Layout | Each app keeps its own workflow shape while sharing primitives and spacing discipline. | Match design language, not information architecture. |
| State | Blocked, terminal, permissioned, loading, and empty states are visible. | Never rely on tooltip-only state explanations. |
| Motion | Product motion is quiet and state-driven. | Keep transitions interruptible and explicit; avoid `transition-all`. |

## Follow-Up

Use `docs/shared/design-review-process.md` for regular UI and copy work. Run a
new baseline audit when a polished app receives a meaningful layout, state, or
copy change.
