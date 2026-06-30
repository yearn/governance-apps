# YBC Delivery Plan

This folder mirrors the delivery style already used by the existing yETH planning docs, but
targets the new YBC surface.

## Current production sequence

The mock and debug-runtime phases are complete enough to stop treating mock coverage as
the main blocker. The current path is feed-first:

1. accept the shared Teams/YBC feed contracts
2. implement `ybc.json` in `gov-apps-stats`
3. validate the staging feed as the frontend consumer
4. wire feed-backed YBC reads
5. wire launch-scope YBC writes
6. run targeted fork/preprod smoke
7. roll out behind production flags

## Included

- `planning-spec.md`
- `fork-runbook.md`
- `ybc-feed-schema-v1.md`
- `examples/ybc-feed.example.json`
- `prompts/`
- `work-packages/`
