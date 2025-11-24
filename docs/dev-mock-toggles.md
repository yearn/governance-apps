# Dev Mocks: Toggles & Scenarios

## Time Offset

- Env: `NEXT_PUBLIC_MOCK_TIME_OFFSET_SECONDS`
- Usage: positive or negative seconds added to `now` inside mock clients.
- Purpose: fast-forward/rewind cooldowns and reward accrual during UI testing.

## Scenario Presets

- Env: `NEXT_PUBLIC_SCENARIO`
- Allowed: `standard` (default), `active`, `ready`, `caps-exhausted`
  - `active`: pre-staked + in-cooldown fixtures
  - `ready`: cooldown ended, ready-to-withdraw fixtures
  - `caps-exhausted`: global and per-token redemption caps fully used

These presets seed mock state on first account load.

## Notes

- Domain allowances should be read from account state in mock mode (avoid `useTokenAllowance`).
- Error shaping is normalized in `lib/tx/errors.ts`; keep new mock errors aligned with that map.
