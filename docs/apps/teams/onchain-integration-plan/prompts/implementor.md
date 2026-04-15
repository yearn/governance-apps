# Implementor Prompt — Team Finance

You are implementing work for `teams` inside `governance-apps`.

## Core constraints

- stay inside the selected work package
- follow existing patterns from `/styfi`, `/veyfi`, and `/yeth`
- keep the implementation mock-first unless the selected WP explicitly covers onchain work
- reuse shared UI primitives and the shared transaction pipeline


## Non-negotiable product decisions
- Route key stays `/teams`; display label is `Team Finance`.
- Revenue deposit is modeled as permissionless.
- Vest claiming itself is out of scope; only the initial funding claim flow is in scope.
- Bonus math should stay simple in the main UI and richer in details / tooltip states.


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
