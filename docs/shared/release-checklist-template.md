# Release Checklist Template

Use this template for Teams, YBC, or any future governance app surface.

## 1. Scope freeze

- [ ] launch scope explicitly frozen
- [ ] non-goals documented
- [ ] open bugs labeled blocker / non-blocker

## 2. Engineering checks

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] targeted e2e passes
- [ ] docs updated
- [ ] no mock-only affordances exposed in production mode

## 3. Product / design checks

- [ ] copy reviewed
- [ ] responsive review complete
- [ ] accessibility review complete
- [ ] empty, loading, error, and success states all reviewed

## 4. Contract / fork checks

- [ ] fork runbook executed
- [ ] tx hashes recorded
- [ ] failure cases exercised
- [ ] simulation-before-write behavior confirmed

## 5. Routing / rollout checks

- [ ] path-based route works on shared host
- [ ] feature flag behavior correct
- [ ] subdomain decision explicit
- [ ] sitemap / discoverability decision explicit
- [ ] header nav inclusion decision explicit

## 6. Ops checks

- [ ] env vars present
- [ ] rollback plan written
- [ ] post-deploy smoke steps written
- [ ] owner for incident triage assigned

## 7. Sign-off

- [ ] implementer sign-off
- [ ] reviewer sign-off
- [ ] integrator sign-off
- [ ] product sign-off
- [ ] ops sign-off
