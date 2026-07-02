# YBC Delivery Plan

This folder mirrors the delivery style already used by the existing yETH planning docs, but
targets the new YBC surface.

## Current production sequence

The mock and debug-runtime phases are complete enough to stop treating mock coverage as
the main blocker. The current path is feed-first:

1. accept the shared Teams/YBC feed contracts — done
2. implement `ybc.json` in `gov-apps-stats` — done
3. validate the staging feed as the frontend consumer — done
4. wire feed-backed YBC reads — done
5. wire launch-scope YBC writes — implemented, pending fork smoke
6. run targeted fork/preprod smoke — next
7. roll out behind production flags — pending approval

## Included

- `planning-spec.md`
- `fork-runbook.md`
- `ybc-feed-schema-v1.md`
- `examples/ybc-feed.example.json`
- `prompts/`
- `work-packages/`
