# DAO Telegram alerts

The DAO stream extends the existing `governance-alerts-bot-v2` Worker.
It uses one chat and the independent Durable Object `alerts:dao:v2`.
Its cursor starts at Ethereum block `25883944`.
The committed DAO flag is enabled. Existing streams retain their configuration.

## Alert catalogue

| Event | Message and next action |
| --- | --- |
| Proposal created | Proposal link, type, proposer, threshold, voting dates, and execution permissions. Read the proposal and join its discussion. |
| Discussion ending | Reminders 24 hours and 1 hour before voting opens. |
| Voting opens | Voting deadline and a link to the proposal. |
| Vote recorded | Account, effective weight, support share, and final block totals. Collective account updates can replace earlier weight. |
| Voting ending | Reminders 24 hours and 1 hour before voting closes. |
| Vote weight decay | Notice at the first block where the pinned Voter reduces new personal vote weight. Existing votes do not decay automatically. |
| Voting closes | Approval or rejection, final totals, and threshold. Zero turnout fails even when the threshold is zero. |
| Signal approved | Approval notice with no request for an execution transaction. |
| Execution window opens | Deadline, operator restriction or permissionless access, and instructions to review and simulate execution in the app. |
| Execution window ending | Reminders 24 hours and 1 hour before expiry. |
| Execution confirmed | The executor account and transaction. A signal finalization states that no actions ran. |
| Execution expires | The approved executable proposal missed its window and can no longer execute. |
| Author retracts | Voting and execution are unavailable. |
| Operator flags | The contract reason and notice that voting and execution are blocked. |
| Guardian vetoes | The contract reason and permanent execution block. Voting remains available only when the proposal was not also retracted. |
| Vetoed voting closes | Final totals with an explicit reminder that voting cannot remove the veto. |

Every message includes its observation time in UTC and the confirmed block number.
Transaction events link to Etherscan transactions. Deadline alerts link to their confirmed blocks.
Proposal links include the chain and Voting address, so numeric proposal IDs remain unambiguous.

Message headings use one emoji, following the other alert channels:

| Emoji | Message type |
| --- | --- |
| 📝 | New proposal |
| 🗳️ | Vote recorded or voting opened |
| 💬 | Discussion ending |
| ⏰ | Voting or execution deadline approaching |
| 📉 | Vote weight decay started |
| 👍 / ❌ | Proposal approved / rejected |
| ▶️ / ✅ / ⌛ | Execution opens / completes / expires |
| ↩️ / 🚩 / 🛑 | Retraction / flag / veto |
| ⚙️ / 🔐 | Protocol configuration / role change |

Text labels remain explicit, including when the same emoji groups related events.

All proposal alert types use the verified title and available forum link, including votes, deadlines, results, moderation, and execution.
New-proposal announcements also include a summary excerpt. The bot and website share the summary selection helper.
An explicit Summary section takes precedence over author attribution below the title.

The `DAO_APP` service binding calls `/api/dao-data` on the existing `governance-apps` Worker.
That route uses the website's existing `DAO_DATA_URL`. No feed URL or secret needs to be entered for the bot.
The bot uses the same bounded feed reader and content validator as the website.
It matches the chain, Voting address, proposal ID, and on-chain digest before accepting `contentBytes`.
Feed timestamps, status, and vote totals never replace confirmed chain observations in alerts.
The bot makes no direct IPFS requests and does not fetch URLs from proposal content.

Verified titles, summary excerpts, and forum links persist in the DAO object's storage, keyed by proposal identity and digest.
A feed request occurs at most once per run when uncached content is needed.
Cached content remains usable during feed outages and after restarts.
For uncached content, feed failures or producer delays preserve the cursor and retry on the next cron.
These retries continue for ten minutes from the first failure for that proposal and digest.
After ten minutes, alerts continue with the proposal ID, link, and an explicit title-unavailable notice.
The bot keeps trying the feed on later runs and caches content when it becomes available.
Controlled errors appear in `/status`; fallback warnings appear in structured logs without content or credentials.
A missing service binding is a configuration error and stops uncached DAO proposal delivery until corrected.

## Operator configuration alerts

The bot monitors every event in the pinned Voting and Voter contracts.
The configuration messages explain these changes:

- Proposal weight, cooldown, and blacklist contract.
- Voting period and Voter implementation.
- Execution delay, execution guard, and Executor implementation.
- Approval threshold. This change affects new proposals only.
- Proposal hooks, weight measure, and operator.
- Pending and accepted guardian or management transfers.
- Voter decay interval, delegated staking, YBC, and YBC weight aggregator.

Voting and execution parameter changes also affect existing proposals.
The scanner refreshes active proposals and recalculates their future deadlines.
It reads proposal thresholds from stored proposal data, rather than the current global threshold.

The supported deployment matches [the app configuration](examples/mainnet-deployments.json).
The ABI source is [Voting.vy](https://github.com/yearn/stYFI/blob/9395d5e6fffdfe21fda32af94d32fca1a4f7840b/contracts/governance/Voting.vy)
and [Voter.vy](https://github.com/yearn/stYFI/blob/9395d5e6fffdfe21fda32af94d32fca1a4f7840b/contracts/governance/Voter.vy).
An unreviewed Voter disables decay assumptions and produces a compatibility notice when configured.
A new Voting deployment or Voter implementation needs a coverage review and an explicit scanner update.

## Delivery and recovery

The shared cron runs once per minute and uses six confirmations.
Each DAO scan stops at the first event block or pending deadline, whichever comes first.
A binary search finds the first block at a deadline. Deadline alerts therefore work without contract events.
Events in that block take precedence over reminders. Retraction, flagging, or execution suppresses obsolete reminders.
The pinned Voter starts decay strictly after its configured boundary; the bot follows that comparison.

RPC reads use the observation block hash with `requireCanonical: true`.
Proposal totals describe the end of the block, including all collective vote updates in that block.
The scanner does not infer unique voters, sum replacement votes, or identify moderation callers from transaction senders.

Historical replay includes historical deadlines. Message timestamps describe those historical observations.
The final private chat must reach the confirmed head before participants rely on it.
Cancelled or elapsed reminder windows do not produce current-action messages.

The worker sends at most five messages per domain run.
Receipts prevent resending accepted messages when a run reaches its cap or restarts.
The cursor and proposal state advance only after all messages for the scanned block have receipts.
Telegram `retry_after` pauses delivery without consuming the block.
The existing duplicate window remains: Telegram can accept a message before its receipt reaches durable storage.

Malformed events, missing required reads, and canonical hash mismatches stop the DAO stream at its saved cursor.
The other streams continue independently. Errors appear in structured logs and authenticated `GET /status`.
This extension does not send infrastructure warnings to Telegram.

## Configuration and rollout

| Setting | Purpose | Current configuration |
| --- | --- | --- |
| `DAO_TELEGRAM_CHAT_ID` | Cloudflare secret for the final DAO chat | Managed on the deployed Worker |
| `ALERTS_DAO_ENABLED` | Enable DAO scanning and delivery | `true` |
| `DAO_ALERT_VOTES_ENABLED` | Include each Vote event | `true` |
| `DAO_APP` | Service binding to the website's configured feed route | `governance-apps` |

The existing `RPC_URL`, `TELEGRAM_BOT_TOKEN`, and `ADMIN_TOKEN` are shared.
The RPC must support historical calls by canonical block hash.
Setting `DAO_ALERT_VOTES_ENABLED=false` suppresses individual vote messages; proposal totals and lifecycle alerts remain active.

For the content fix and fresh replay, deploy the alert Worker with the committed service binding.
The existing website route needs no deployment or new configuration.
Keep the current Worker name and chat ID. The registry now selects a fresh DAO object, `alerts:dao:v2`.
Its empty cursor, receipts, and content cache restart the full DAO history from block 25,883,944 inclusive.
The old `alerts:dao:v1` object remains stored. Its receipts do not suppress messages in the fresh replay.
Other domains retain their object names, cursors, and receipts.
Existing Telegram posts remain; replay adds new messages with titles and icons to the configured group.

To start the prepared replay, deploy the current checkout:

```fish
npx wrangler deploy --config wrangler.alerts.jsonc --keep-vars
```

The enabled cron starts replay automatically. No storage deletion, reset endpoint, migration, or new secret is required.
Check the DAO entry in authenticated `/status` for `objectName: "alerts:dao:v2"`.
Before its first run, `cursorBlock` is 25883943. Then it advances until `caughtUp: true` without an error.
Review the new messages before accepting the replay. Old messages can be removed manually if a clean group history is desired.
Subsequent deployments keep the `v2` cursor and resume; they do not restart replay again.

For a new installation, keep DAO disabled until the destination secret is configured:

1. Create the final private DAO chat and add the existing bot with permission to post.
2. Configure `DAO_TELEGRAM_CHAT_ID` with `npx wrangler secret put DAO_TELEGRAM_CHAT_ID --config wrangler.alerts.jsonc`.
3. Review the DAO message snapshots and run the checks below.
4. Set `ALERTS_DAO_ENABLED=true` in the reviewed deployment configuration.
5. Deploy the alert Worker through the existing release process.
6. Check the authenticated status until DAO reports `caughtUp: true` without a saved error.
7. Review replay messages, links, deadline ordering, and Telegram delivery in the private chat.
8. Make the chat available to participants after replay acceptance.

To pause DAO delivery, set `ALERTS_DAO_ENABLED=false` and deploy the configuration.
Its stored cursor and receipts remain available when delivery resumes.
Do not change the object name for routine deployments or reuse another stream's cursor.
Another deliberate full replay requires a new DAO generation in a reviewed change, following the shared runbook.

## Validation

```fish
npm run typecheck
npm run lint
npm run test
npx wrangler deploy --dry-run --config wrangler.alerts.jsonc --outdir /tmp/dao-alerts-bundle
```

The focused suites cover event decoding, quiet deadlines, cancellations, vote replacement semantics, configuration changes, canonical reads, feed identity, content integrity, message bounds, and recovery.
Content tests cover the website's configured feed route, all proposal alert types, durable caching, bounded retries, timeouts, and oversized responses.
Exact HTML examples are in [the snapshot catalogue](../../../tests/unit/workers/__snapshots__/alerts-bot.dao.test.ts.snap).
These examples use fictional proposal data and observation times.
No app route or UI flow changes are required.

Local validation of the content, emoji, and replay updates on 5 October 2026 passed typecheck, lint, the Worker dry-run build,
and all 1,915 tests with two test workers. The focused DAO suites contain 83 tests.
All 33 DAO message snapshots include the event icons.
The routing test checks that DAO starts fresh while other domain cursors and old DAO receipts remain intact.
The lower concurrency avoids an intermittent timeout in an existing publication-store test.
All 560 local DAO documentation targets passed the link check.
The new reader verified the two live proposals from the website feed in a read-only check.
Both returned a title, summary, and forum link using one feed response.
The service binding, fresh replay, and Telegram delivery still require deployment of this update.

## Coverage limits and integrator notes

Reverted transactions emit no successful contract events. The bot cannot observe failed execution attempts or wallet simulation failures through this scanner.
An execution-window alert describes timing and permissions. It does not prove that an execution simulation succeeds.
Forum replies, private drafts, content uploads without proposals, and per-wallet eligibility changes are outside this on-chain stream.
The app remains the source for fresh wallet eligibility and transaction preparation.

No new dependency, Durable Object class, or storage migration is required.
The content update adds the configured `DAO_APP` service binding and separate additive content cache records.
Existing domain records load without a DAO state field. New DAO records use their own object identity.
The DAO extension can merge independently of frontend changes.
Enabling delivery requires the destination secret and private replay acceptance.
This change does not deploy the Worker or send live Telegram messages.
