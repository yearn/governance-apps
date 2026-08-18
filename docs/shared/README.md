# Shared Documentation

Shared docs define requirements and architecture that apply across multiple apps.
App behavior and active delivery status belong under `docs/apps/<domain>`.

## Current Architecture

- [`frontend-architecture.md`](frontend-architecture.md)
- [`architecture-blueprint.md`](architecture-blueprint.md) is a compatibility
  pointer for older links.

## Historical Specifications

These remain for traceability. They do not define new app behavior.

- [`normative-spec-yip88.md`](normative-spec-yip88.md)
- [`frontend-frd.md`](frontend-frd.md)

## Design and Product Standards

- [`design-system.md`](design-system.md)
- [`copy-and-tone.md`](copy-and-tone.md)
- [`design-review-process.md`](design-review-process.md)

Historical review evidence:

- [`polished-app-baseline-audit.md`](polished-app-baseline-audit.md)

## Delivery and Testing

- [`codex-usage-guide.md`](codex-usage-guide.md) is the canonical worktree,
  review, and integration workflow.
- [`teams-ybc-production-plan.md`](teams-ybc-production-plan.md)
- [`rpc-reliance-reduction-roadmap.md`](rpc-reliance-reduction-roadmap.md)
- [`testing.md`](testing.md)
- [`cloudflare-worker-size.md`](cloudflare-worker-size.md)
  - Future deployment directions: per-app Workers, OpenNext multi-worker, and static SPA options.
- [`mock-toggles.md`](mock-toggles.md)
- [`debug-runtime-contract.md`](debug-runtime-contract.md)
- [`runtime-modes.md`](runtime-modes.md)
- [`security-hardening.md`](security-hardening.md)
- [`security-hardening-backlog.md`](security-hardening-backlog.md)

## Shared Work Packages

These packages record the Teams/YBC delivery history. They are not templates
for new app work. New domains use the shared delivery guide and an app-owned
delivery plan.

- [`work-packages/WP0-debug-runtime-shared-seam.md`](work-packages/WP0-debug-runtime-shared-seam.md)
- [`work-packages/WP1-teams-ybc-data-contracts.md`](work-packages/WP1-teams-ybc-data-contracts.md)
- [`work-packages/WP2-gov-apps-stats-teams-ybc-feeds.md`](work-packages/WP2-gov-apps-stats-teams-ybc-feeds.md)
- [`work-packages/WP3-teams-ybc-feed-validation.md`](work-packages/WP3-teams-ybc-feed-validation.md)

## Producer Handoffs

- [`gov-apps-stats-teams-ybc-feed-brief.md`](gov-apps-stats-teams-ybc-feed-brief.md)

## Prompt Templates

- [`prompt-templates/orchestrator-template.md`](prompt-templates/orchestrator-template.md)
- [`prompt-templates/implementor-template.md`](prompt-templates/implementor-template.md)
- [`prompt-templates/reviewer-template.md`](prompt-templates/reviewer-template.md)
- [`prompt-templates/auditor-template.md`](prompt-templates/auditor-template.md)
- [`prompt-templates/fixer-template.md`](prompt-templates/fixer-template.md)
- [`prompt-templates/integrator-template.md`](prompt-templates/integrator-template.md)

## Data Schemas

- [`schemas/global-data-schema.md`](schemas/global-data-schema.md)
