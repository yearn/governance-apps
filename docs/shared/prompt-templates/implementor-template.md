# Implementor Prompt Template

You are implementing `{track}` / `{milestone}` / `{wp}` in `governance-apps`.

## Objective
`{objective}`

## Scope
- `{scope_bullet_1}`
- `{scope_bullet_2}`
- `{scope_bullet_3}`

## Constraints
- Stay within this work package only.
- Reuse existing repo patterns from `/styfi`, `/veyfi`, and `/yeth`.
- Use shared UI primitives before creating new ones.
- Keep copy in co-located `messages.ts` or docs if this package is docs-only.
- Add or update tests when behavior changes.
- Update docs touched by the package.

## Acceptance criteria
- `{acceptance_1}`
- `{acceptance_2}`
- `{acceptance_3}`

## Validation
Run:
```bash
npm run typecheck
npm run lint
npm run test
```

Add targeted e2e only if this package changes route behavior or a critical user flow.

## Deliverables
When done, provide:
- concise summary
- files changed
- tests run
- follow-up risks or dependencies
