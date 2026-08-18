# Product

## Register

product

## Platform

web

## Users

Governance participants, Yearn builders, team owners, finance operators, and
protocol operators use these apps to inspect positions, manage staking and
recovery actions, review team finances, and operate YBC membership or proposal
flows. They are often comparing numbers, checking permissions, or preparing a
transaction, so the interface must support fast scanning and clear action
readiness.

## Product Purpose

Governance Apps is a suite of route-scoped operational surfaces for Yearn
governance products. `/styfi`, `/veyfi`, `/yeth`, `/teams`, and `/ybc` set the
current product baseline. `/dao` adds proposal creation, voting, and execution
review through the same domain-first, mock-first approach. Success means users
can trust what is actionable, what is read-only, what is blocked, and why,
without needing protocol context from outside the interface.

## Brand Personality

Calm, precise, and operational. The product should feel like a serious finance
and governance tool: restrained, data-literate, and quiet until an action or
risk needs attention.

## Anti-references

- Generic AI dashboard aesthetics: purple gradients, glassmorphism, decorative
  blobs, and oversized marketing heroes.
- Decorative card grids where hierarchy should come from task structure.
- Hidden protocol state, tooltip-only blockers, or action buttons that do not
  explain why they are unavailable.
- Dense admin screens that use the same visual weight for primary actions,
  secondary audit context, and background metadata.

## Design Principles

1. Match the polished app family first. Reuse the route shell, shared UI
   primitives, neutral surfaces, 8px radius, and domain-local copy patterns
   already proven across the existing routes.
2. Let workflow shape the page. Dashboards, registries, recovery flows, team
   workspaces, and proposal boards can use different layouts, but they must
   share hierarchy, spacing, controls, and feedback behavior.
3. Make state legible before making it attractive. Loading, empty, blocked,
   permissioned, terminal, and read-only states must be persistent and visible.
4. Keep protocol math and facts out of the UI layer. Page components render
   typed domain client values and perform only lightweight formatting.
5. Prefer restraint. Accent color is for brand identity, primary action, current
   selection, and semantic state, not decoration.

## Accessibility & Inclusion

Target WCAG AA for contrast, focus visibility, semantic controls, and keyboard
navigation. Interactive controls should provide at least a 40x40px hit area,
with 44px used where practical. Motion must be state-driven, interruptible, and
compatible with reduced-motion preferences.
