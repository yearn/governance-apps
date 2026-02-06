# Governance Apps Documentation

This directory is organized by **shared system documentation** and **app-specific documentation**.

## Structure

```text
docs/
  shared/              # Cross-app architecture, standards, testing, schemas, roadmap
  apps/
    styfi/             # stYFI + stYFIx product docs
    veyfi/             # veYFI + LLYFI product docs
    yeth/              # yETH recovery docs
```

## Navigation

- Shared docs: [`docs/shared/README.md`](shared/README.md)
- App docs index: [`docs/apps/README.md`](apps/README.md)
- stYFI docs: [`docs/apps/styfi/README.md`](apps/styfi/README.md)
- veYFI docs: [`docs/apps/veyfi/README.md`](apps/veyfi/README.md)
- yETH docs: [`docs/apps/yeth/README.md`](apps/yeth/README.md)

## Documentation Rules

- Keep behavior changes and docs updates in the same PR.
- Put app-specific behavior only in that app's folder.
- Keep shared standards in `docs/shared` only.
- Prefer references over duplication.
- Every production-impacting feature should have:
  - app-level spec updates,
  - implementation status notes,
  - test coverage notes,
  - production-readiness checklist updates.
