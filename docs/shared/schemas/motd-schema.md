# MOTD Schema (S3 JSON)

This document defines the **optional** JSON schema served from S3 (or similar) and consumed by the frontend to render a per-app "State" message in the stats bar. The message can be updated without redeploying the frontend.

- Env: `NEXT_PUBLIC_MOTD_URL`
- Consumer: `useMotd()` / `lib/clients/motd.ts`
- Refresh: 60s (React Query)
- Failure behavior: if the JSON is missing/invalid/unreachable, the message is **not shown**.

---

## 1. JSON Shape

```json
{
  "version": 1,
  "styfi": {
    "label": "State",
    "value": "Staking live, voting coming soon"
  },
  "veyfi": {
    "label": "State",
    "value": "Migration & Staking Open"
  }
}
```

### Fields

- `version` (required): Integer schema version (>= 1).
- `styfi` (optional): Object containing a message for the stYFI app.
- `veyfi` (optional): Object containing a message for the veYFI app.
- `label` (optional): Defaults to `State` when omitted.
- `value` (optional): If missing or empty, the message is not rendered.

---

## 2. Rendering Rules

- If `value` is missing/empty -> do not render a message.
- If `label` is missing/empty -> default to `State`.
- This message is **app-specific** (stYFI vs veYFI).
- The message is **informational only**; it does not gate any behavior.

---

## 3. Caching & Proxy

- The browser uses `/api/motd` to avoid CORS issues.
- Cache-control headers from the upstream response are forwarded by the proxy.
- Default revalidation interval is 60 seconds.
