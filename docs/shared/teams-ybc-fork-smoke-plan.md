# Teams + YBC Fork Smoke Plan

Status: active launch validation plan
Last updated: 2026-07-06

This plan defines the repeatable fork-smoke approach for taking Teams and YBC from
feed-backed local/preprod validation to controlled production exposure. It intentionally
does not require redeploying the Teams or YBC contracts on a fork.

## 1. What this validates

The fork smoke should prove that the frontend can use the deployed production contracts
through the same wallet, approval, simulation, write, receipt, and invalidation paths
that production will use.

It is not intended to exhaust every historical Teams or YBC visual state. State coverage
for UX iteration should continue to use mock mode, the mock navigator/debug bridge, and
component/E2E tests after the baseline fork smoke has passed.

## 2. Core approach

Use three data sources deliberately:

- the validated corrected Teams v2 candidate and validated YBC JSON for normal
  feed-backed rendering;
- the real deployed contracts on a mainnet fork for transaction submission;
- tiny local feed fixtures or request interception only where fork writes create state
  that the live R2 feed cannot know about.

Do not run a fork-specific `gov-apps-stats` publisher for launch smoke unless a concrete
bug proves that saved/live JSON plus fixtures is insufficient.

Do not redeploy the protocol contracts on the fork. Redeployment requires a synthetic
feed, synthetic teams, synthetic members, synthetic approvals, and synthetic bonuses. That
tests a local deployment more than it tests the production deployment.

## 3. Local fork environment

Start a local mainnet fork with chain id `1`:

```fish
set -x MAINNET_RPC_URL "https://your-mainnet-rpc"
anvil --fork-url $MAINNET_RPC_URL --chain-id 1 --port 8545
```

Run the frontend in non-mock mode:

```fish
set -x NEXT_PUBLIC_RUNTIME_MODE development
set -x NEXT_PUBLIC_USE_MOCKS false
set -x NEXT_PUBLIC_E2E false
set -x NEXT_PUBLIC_RPC_URLS http://127.0.0.1:8545
set -x NEXT_PUBLIC_GLOBAL_DATA_URL https://data.dao-ops.com/prod/stats.json
set -x NEXT_PUBLIC_TEAMS_DATA_URL http://127.0.0.1:8788/teams.json
set -x NEXT_PUBLIC_YBC_DATA_URL https://data.dao-ops.com/prod/ybc.json
set -x NEXT_PUBLIC_ENABLE_TEAMS true
set -x NEXT_PUBLIC_ENABLE_YBC true
```

Use a local test wallet, preferably one printed by Anvil. Import that private key into
the browser wallet and add/select:

```text
Name: Local Mainnet Fork
RPC: http://127.0.0.1:8545
Chain ID: 1
Currency: ETH
```

Avoid signing with privileged production wallets during fork smoke unless explicitly
accepted. Because the fork uses chain id `1`, signatures from real privileged wallets
should be treated carefully even if they are only sent to a local RPC.

Before cutover, the local Teams URL above must serve the exact validated v2 candidate.
It is private test plumbing, not a second public or versioned producer endpoint.
Intercepting `/api/teams-data` with the same candidate is also acceptable.

## 4. Fast-path test tracks

### Track A: validated JSON only

Use this for the first sanity pass.

Validate:

- Teams renders with the corrected v2 candidate and YBC renders with its validated
  feed;
- wallet connects to chain id `1`;
- wrong-network guards behave correctly if the wallet is moved away from chain id `1`;
- Teams revenue deposit works after seeding the test wallet with the selected revenue
  token;
- any owner/member action that is already available to the connected wallet works.

This track is not sufficient by itself if the test wallet is not a team owner or YBC
member.

Do not use the current Teams v1 object for financial sign-off. It remains unsafe until
the same-URL v2 cutover is complete.

### Track B: production contracts plus minimal fork state

Use this as the preferred launch-write smoke.

Teams:

1. Pick one active team from the corrected v2 candidate.
2. Impersonate the current team owner on the fork.
3. Transfer ownership to the local test wallet and accept ownership from that wallet.
4. Patch a local Teams fixture, or intercept `/api/teams-data`, so the same team owner in
   feed state is also the test wallet.
5. Seed a small current-period funding approval if live feed state does not already have
   one.
6. Test revenue deposit, funding claim, and funding return from the UI.
7. Test bonus claim only when prod/fork state already has a clean claimable case, or when
   a targeted fixture is prepared for that case.

YBC:

1. Prefer a real current YBC member with positive weight if that wallet can be used
   safely.
2. If not, seed the local test wallet as a YBC member on the fork for proposal-creation
   smoke.
3. Test propose addition and propose expulsion from the UI.
4. For voting, either use a real weighted member wallet or seed the local test wallet with
   voting weight through the deployed upstream `WeightAggregator` hook path on the fork.
   The hook path is preferred over storage editing because the UI still submits the real
   YBC vote transaction from the connected wallet.
5. Use a tiny YBC fixture or request interception when a newly created fork proposal must
   appear in the UI for retract, vote, or execute testing.

### Track C: mock-mode UX iteration after baseline smoke

After Track B passes once for the launch scope, heavy UX iteration may return to mock
mode:

- `NEXT_PUBLIC_USE_MOCKS=true`;
- `NEXT_PUBLIC_E2E=false` for manual mock navigator/debug controls;
- `NEXT_PUBLIC_E2E=true` only for deterministic Playwright flows.

Mock-only local QA is acceptable for layout, copy, visual hierarchy, responsive behavior,
tables, cards, tabs, loading states, empty states, and state-specific UX. Run the normal
test/build suite and preprod live-feed smoke before release.

Re-run fork smoke when a change touches:

- `lib/clients/teams/onchain.ts`;
- `lib/clients/ybc/onchain.ts`;
- `lib/hooks/useTeamsWrites.ts`;
- `lib/hooks/useYbcProposalWrites.ts`;
- `lib/tx/*`;
- token approval handling;
- amount parsing or token decimals;
- contract addresses or feed deployment fields;
- action enablement logic;
- proposal id, approval id, team address, or token address threading;
- wallet account or chain handling;
- form submission code around actual write buttons.

## 5. Expected Teams evidence

Capture:

- fork RPC and fork block;
- wallet address used;
- `teams.json` URL or fixture path;
- selected team address and owner before/after fork setup;
- revenue token used and deposit tx hash;
- funding approval id and claim tx hash;
- return tx hash if return testing is performed;
- bonus tx hash if bonus testing is performed;
- screenshots of directory, selected team workspace, revenue, funding, and bonus panels.

Minimum accepted Teams write smoke:

- revenue deposit succeeds through the UI;
- funding claim succeeds through the UI for a current-period approval;
- funding return succeeds through the UI or is explicitly deferred with the reason
  recorded;
- bonus claim succeeds or is explicitly deferred because no clean claimable launch state
  exists.

## 6. Expected YBC evidence

Capture:

- fork RPC and fork block;
- wallet address used;
- `ybc.json` URL or fixture path;
- member/weight setup used;
- proposal creation tx hash;
- vote tx hash if voting is performed;
- execute tx hash if execution is performed;
- screenshots of overview, roster, proposal board, and active/executable proposal state.

Minimum accepted YBC write smoke:

- propose addition succeeds through the UI;
- propose expulsion succeeds through the UI;
- retract, vote, and execute are tested through the UI when matching feed/fork state is
  present, otherwise the missing state and fixture requirement are recorded.

## 7. Exit criteria

The launch fork smoke is accepted when:

- production feeds render in non-mock mode;
- launch write paths tested on the fork use real deployed contract addresses;
- unavoidable fixture/intercept usage is narrow and documented;
- wrong-network and missing-feed behavior are checked at least once;
- any untested write path has a concrete reason and a follow-up owner;
- preprod smoke remains the next gate before production flags are enabled.
