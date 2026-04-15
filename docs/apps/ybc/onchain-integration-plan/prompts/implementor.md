# Implementor Prompt — Yearn Builder's Collective

You are implementing work for `ybc` inside `governance-apps`.

## Core constraints

- stay inside the selected work package
- follow existing patterns from `/styfi`, `/veyfi`, and `/yeth`
- keep the implementation mock-first unless the selected WP explicitly covers onchain work
- reuse shared UI primitives and the shared transaction pipeline


## Non-negotiable product decisions
- Route key stays `/ybc`.
- Raw stake and effective voting weight must remain separate.
- MVP supports add/remove member flows only, not a generic arbitrary-call builder.
- Expired proposals are terminal; the user must start over.
- YBC rewards are visible here but should hand off to the shared claim surface.


## Work style

- prefer small PRs
- update tests when behavior changes
- update docs in the same PR
- keep file naming and route structure consistent with the repo

## Definition of done

- package scope is complete
- acceptance criteria in the WP doc are satisfied
- tests and docs are updated
- the route remains coherent on shared/path-based hosts
