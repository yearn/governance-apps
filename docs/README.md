# `/docs` Directory

This folder contains all specification and planning documents for the `governance-apps` project.
They define **what the frontend must do** and **how it is built**, and serve as the reference for all implementation work.

## Contents

- [**0-normative-spec-yip88.md**](0-normative-spec-yip88.md) — The protocol normative spec
- [**1-user-stories-styfi.md**](1-user-stories-styfi.md) — User stories for stYFI + stYFIMax flows
- [**2-user-stories-veyfi.md**](2-user-stories-veyfi.md) — User stories for veYFI + LLYFI flows
- [**3-frd-frontend.md**](3-frd-frontend.md) — Frontend Functional Requirements (canonical behaviour spec)
- [**4-architecture-blueprint.md**](4-architecture-blueprint.md) — End-to-end implementation strategy and system design
- [**5-master-task-list.md**](5-master-task-list.md) — Phase-based, actionable roadmap for BR#1
- [**6-design-system.md**](6-design-system.md) — Visual guidelines, typography, and component usage
- [**7-copy-and-tone.md**](7-copy-and-tone.md) — Copywriting guidelines and voice commandments
- [**dev-mock-toggles.md**](dev-mock-toggles.md) — Mock scenarios and time offset for local UI testing

## Usage

- Keep all documents in sync with code changes.
- Update relevant files in the **same PR** when behaviour changes.
- Treat these documents as the source of truth for FE logic, state, and flows.

## Editing Rules

- No duplication between documents; each has a defined purpose.
- All changes must reflect YIP-88 and currently targeted contract versions.
- Keep formatting clean, concise, and consistent.
- Shared frontend primitives (e.g., CooldownState) MUST be defined once in /lib/clients/shared and referenced consistently across domains.
