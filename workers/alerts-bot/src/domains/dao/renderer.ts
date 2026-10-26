import { formatUnits } from "viem";
import { DAO_EXECUTOR, DAO_VOTER, DAO_VOTING } from "./contracts";
import { approval, approvalBar, approvalChange, thresholdStatus } from "./vote-display";
import { daoIsSignal, daoTiming } from "./lifecycle";
import type { DaoAlertAction } from "./types";
import type { DaoAlertContent } from "./content";

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DAO_ALERT_INTRODUCTION = "<b>Yearn DAO governance activity</b>\n\n" +
  "This channel tracks proposals, votes, deadlines, results, retractions, flags, vetoes, executions, and governance configuration on Ethereum.\n\n" +
  "Alerts use confirmed blocks. Historical replay includes historical deadlines; always check the app before acting. " +
  "A signal approval needs no execution. A veto permanently blocks execution, but voting can remain open. " +
  "Execution-window alerts describe timing and permissions; the app checks the script and simulates execution.";

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function text(value: string, limit: number): string {
  let result = "";
  for (const character of value.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ")) {
    const escaped = escape(character);
    if (result.length + escaped.length > limit) return `${result}…`;
    result += escaped;
  }
  return result;
}

function account(value: string): string {
  if (!/^0x[0-9a-f]{40}$/.test(value)) throw new Error("dao_render_address_invalid");
  return `<a href="https://etherscan.io/address/${value}">${value.slice(0, 6)}…${value.slice(-4)}</a>`;
}

function time(seconds: number): string {
  const date = new Date(seconds * 1_000);
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]}, ${date.toISOString().slice(11, 16)} UTC`;
}

function percent(bps: number | bigint): string {
  return `${formatUnits(BigInt(bps), 2)}%`;
}

function weight(value: string): string {
  const raw = BigInt(value);
  const rounded = (raw + 5_000_000_000_000_000n) / 10_000_000_000_000_000n;
  if (raw > 0n && rounded === 0n) return "&lt;0.01";
  const [whole, fraction] = formatUnits(rounded, 2).split(".");
  return whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (fraction ? `.${fraction}` : "");
}

const titles = {
  proposed: "📝 New DAO proposal", vote: "🗳️ DAO vote", retracted: "↩️ DAO proposal retracted",
  flagged: "🚩 DAO proposal flagged", vetoed: "🛑 DAO proposal vetoed", executed: "✅ DAO execution confirmed",
  discussion_ending: "💬 DAO discussion period ending", voting_open: "🗳️ DAO voting opened",
  voting_ending: "⏰ DAO voting ending", vote_decay: "📉 DAO vote weight decay started",
  approved: "👍 DAO proposal approved", rejected: "❌ DAO proposal rejected", vetoed_result: "🛑 DAO voting closed — veto remains",
  execution_ready: "▶️ DAO execution window opened", execution_ending: "⏰ DAO execution window ending",
  expired: "⌛ DAO execution window expired",
} as const;

export const DAO_CONFIGURATION_COPY: Readonly<Record<string, { title: string; effect: string; labels: Readonly<Record<string, string>> }>> = {
  SetProposeParameters: { title: "Proposal requirements changed", effect: "New proposals use these requirements. The blacklist address identifies the contract that checks proposer access.", labels: { min_weight: "Minimum proposal weight (raw units)", cooldown: "Proposal cooldown (seconds)", blacklist: "Blacklist contract" } },
  SetVoteParameters: { title: "Voting parameters changed", effect: "The voting window and Voter apply to existing proposals too. Review active deadlines in the app.", labels: { length: "Voting period (seconds)", voter: "Voter" } },
  SetExecuteParameters: { title: "Execution parameters changed", effect: "These rules apply to existing proposals too. A guarded execution requires the current operator.", labels: { delay: "Execution delay (seconds)", guard: "Operator-only execution", executor: "Executor" } },
  SetThreshold: { title: "Approval threshold changed", effect: "Only new proposals use this threshold. Existing proposals retain their creation-time threshold.", labels: { threshold: "Approval threshold (basis points)" } },
  SetHooks: { title: "Proposal hooks changed", effect: "Hooks affect proposal, retraction, and vote processing. Operators should review the new contract.", labels: { hooks: "Hooks" } },
  SetWeightMeasure: { title: "Voting weight measure changed", effect: "Future vote calls use the new weight measure. Existing recorded weights remain until a vote update.", labels: { measure: "Weight measure" } },
  SetOperator: { title: "DAO operator changed", effect: "The operator can flag proposals without votes and execute approved proposals when execution is guarded.", labels: { operator: "Operator" } },
  PendingGuardian: { title: "Guardian transfer proposed", effect: "The current guardian retains authority until the pending guardian accepts.", labels: { guardian: "Pending guardian" } },
  SetGuardian: { title: "Guardian transfer accepted", effect: "The guardian can veto proposals and change the operator.", labels: { guardian: "Guardian" } },
  PendingManagement: { title: "Management transfer proposed", effect: "The current management retains authority until the pending management accepts.", labels: { management: "Pending management" } },
  SetManagement: { title: "Management transfer accepted", effect: "The new management controls this contract's configuration.", labels: { management: "Management" } },
  SetDecayLength: { title: "Vote weight decay changed", effect: "Late votes lose weight over this interval before the epoch ends. Zero disables decay.", labels: { length: "Decay interval (seconds)" } },
  SetDelegatedStaking: { title: "Delegated staking vote source changed", effect: "YBC member votes can update the collective vote for this account.", labels: { staking: "Delegated staking" } },
  SetYBC: { title: "YBC vote source changed", effect: "The Voter checks membership and updates collective votes through this YBC contract.", labels: { ybc: "YBC" } },
  SetYBCWeightAggregator: { title: "YBC weight aggregator changed", effect: "YBC member votes use this aggregator to determine their collective vote share.", labels: { aggregator: "Weight aggregator" } },
};

export function renderDaoAlert(action: DaoAlertAction, content: DaoAlertContent | null = null, maxVoteRows = 8): string {
  const lines: string[] = [];
  const links: string[] = [];
  if (action.kind === "dao_configuration") {
    const copy = DAO_CONFIGURATION_COPY[action.event];
    if (!copy) throw new Error("dao_configuration_unsupported");
    const icon = ["SetOperator", "PendingGuardian", "SetGuardian", "PendingManagement", "SetManagement"].includes(action.event) ? "🔐" : "⚙️";
    lines.push(`<b>${icon} DAO: ${copy.title}</b>`, "", `Contract: ${account(action.contract)} (${action.contract === DAO_VOTING ? "Voting" : "Voter"})`);
    for (const [key, label] of Object.entries(copy.labels)) {
      const value = action.values[key];
      if (value === undefined) throw new Error("dao_configuration_value_missing");
      lines.push(`${label}: ${typeof value === "string" && /^0x[0-9a-f]{40}$/.test(value) ? account(value) : text(String(value), 100)}`);
    }
    lines.push("", copy.effect);
    if (action.event === "SetVoteParameters" && action.values.voter !== DAO_VOTER) lines.push("The Voter changed to an unreviewed implementation. Decay reminders are unavailable; review bot coverage before relying on it.");
    if (action.event === "SetExecuteParameters" && action.values.executor !== DAO_EXECUTOR) lines.push("The Executor changed to an unreviewed implementation. Review app compatibility before execution.");
    links.push('- <a href="https://dao.yearn.fi/">DAO</a>');
  } else {
    const p = action.proposal;
    const c = action.configuration;
    const t = daoTiming(p, c);
    const signal = daoIsSignal(p);
    const votingAllowed = !p.retracted && !p.flagged && action.timestamp >= t.voteStart && action.timestamp < t.voteEnd;
    const link = `https://dao.yearn.fi/proposals/${p.id}?chain=1&voting=${DAO_VOTING}`;
    lines.push(`<b>${titles[action.event]}</b>`, "", `<b>${content?.title ? `${text(content.title, 140)} · #${p.id}` : `Proposal #${p.id}`}</b>`);
    if (action.event === "proposed" && content?.summary) lines.push(text(content.summary, 300));
    lines.push("");
    if (action.event === "proposed") {
      lines.push(`Proposer: ${account(p.proposer)}`, `Voting opens: ${time(t.voteStart)}`, `Voting closes: ${time(t.voteEnd)}`,
        `Approval threshold: ${percent(p.threshold)} of cast weight, with positive turnout.`,
        signal ? "This is a signal proposal with no executable actions." : `Execution window: ${time(t.executeStart)} to ${time(t.executeEnd)}.`,
        "Read the proposal and join the discussion before voting.");
    } else if (action.event === "vote") {
      for (const vote of action.votes.slice(0, maxVoteRows)) {
        const choice = vote.supportBps === 10_000 ? "FOR" : vote.supportBps === 0 ? "AGAINST"
          : `${percent(vote.supportBps)} For · ${percent(10_000 - vote.supportBps)} Against`;
        lines.push(`${account(vote.account)} · <b>${choice}</b>`,
          `${action.rolesVerified ? "Personal" : "Recorded"} weight: <b>${weight(vote.weight)}</b>`);
      }
      if (action.votes.length > maxVoteRows) lines.push(`+${action.votes.length - maxVoteRows} more vote updates · see Transaction`);
      if (action.previouslyReported) lines.push(`${action.previouslyReported} vote update(s) reported earlier. Totals cover the whole transaction.`);
      if (!action.rolesVerified) lines.push("Account roles unavailable; these are recorded account updates.");
      if (action.collective) {
        const { before, after } = action.collective;
        lines.push("", `YBC vote (includes stYFIx): <b>${escape(before ? approval(before) + " → " : "")}${escape(approval(after))} For</b>`,
          `Collective weight: ${weight(after.votes)}`);
      } else if (action.collectiveUpdated) lines.push("", "YBC collective vote updated (includes stYFIx).");
    } else if (action.event === "retracted") {
      lines.push("The proposal author retracted this proposal. Voting and execution are unavailable.");
    } else if (action.event === "flagged") {
      lines.push("The operator flagged this proposal. Voting and execution are blocked.", `Reason: ${text(action.reason ?? "", 256)}`);
    } else if (action.event === "vetoed") {
      lines.push("The guardian permanently blocked execution.", `Reason: ${text(action.reason ?? "", 256)}`,
        votingAllowed ? `Voting remains open until ${time(t.voteEnd)}. Further votes cannot remove the veto.` : "Voting is unavailable at this observation.");
    } else if (action.event === "executed") {
      lines.push(`Executor account: ${account(action.actor!)}`, signal ? "The signal proposal was finalized on chain. It had no executable actions." : "The proposal's on-chain execution completed successfully.");
    } else if (action.event === "discussion_ending") {
      lines.push(`Voting opens: ${time(t.voteStart)}`, "Review the proposal and add feedback before voting opens.");
    } else if (action.event === "voting_open" || action.event === "voting_ending") {
      lines.push(`Voting closes: ${time(t.voteEnd)}`, "Open the proposal to review it and submit your vote.");
    } else if (action.event === "vote_decay") {
      lines.push(`Voting closes: ${time(t.voteEnd)}`, "The current Voter reduces the weight of new personal votes as the deadline approaches. Already recorded votes do not decay automatically.");
    } else if (action.event === "approved") {
      lines.push(signal ? "The DAO approved this signal. No execution transaction is needed." : `The vote passed. Execution window: ${time(t.executeStart)} to ${time(t.executeEnd)}.`);
    } else if (action.event === "rejected") {
      lines.push(BigInt(p.votes) === 0n ? "No positive voting weight was cast. The proposal did not pass." : "The final approval share was below the proposal threshold. The proposal did not pass.");
    } else if (action.event === "vetoed_result") {
      lines.push("Voting has closed. The guardian veto still blocks execution regardless of the vote totals.");
    } else if (action.event === "expired") {
      lines.push(`Execution deadline: ${time(t.executeEnd)}`, "The approved proposal was not executed before its window closed. It can no longer be executed.");
    } else {
      lines.push(`Execution deadline: ${time(t.executeEnd)}`, "The time window is open. Review the exact script and run a fresh execution simulation in the app.");
    }
    if (["vote", "approved", "rejected", "vetoed_result", "execution_ready", "execution_ending", "expired"].includes(action.event)) {
      const tally = action.event === "vote" && action.tally ? action.tally.after : p;
      const before = action.event === "vote" ? action.tally?.before : null;
      const label = action.event === "vote" ? (action.tally ? "Transaction approval" : "Approval at end of block") : "Approval";
      lines.push("", `${label}: <b>${escape(before ? approval(before) + " → " : "")}${escape(approval(tally))}</b>${escape(before ? approvalChange(before, tally) : "")}`,
        `<pre>${escape(approvalBar(tally, p.threshold))}</pre>`,
        `For ${weight(tally.yea)} · Against ${weight((BigInt(tally.votes) - BigInt(tally.yea)).toString())}`);
      if (action.event === "vote") {
        if (p.vetoed) lines.push("<b>Guardian veto at end of block · Execution blocked</b>");
        else if (p.flagged || p.retracted) lines.push("<b>Voting unavailable at end of block</b>");
        else if (votingAllowed) lines.push(`<b>${escape(thresholdStatus(tally, p.threshold))}</b> · Voting open`);
        else lines.push("Voting closed");
        lines.push(`Voting closes: ${time(t.voteEnd)}`);
        if (!action.tally) lines.push("Change unavailable; totals include all votes in this block.");
      }
    }
    if (!signal && ["proposed", "approved", "execution_ready", "execution_ending"].includes(action.event)) {
      lines.push(c.executeGuard ? `Execution is restricted to operator ${account(c.operator)}.` : "Execution is permissionless.");
      if (c.executor !== DAO_EXECUTOR) lines.push("The Executor is unreviewed. The app can block execution until compatibility is verified.");
    }
    if (p.vetoed && action.event !== "vetoed" && action.event !== "vote") lines.push("Guardian veto: execution is permanently blocked.");
    if (p.retracted && action.event !== "retracted" && action.event !== "flagged") lines.push("The proposal is retracted at the end of this block.");
    const discussion = content?.discussionUrl ? escape(content.discussionUrl) : null;
    links.push(`- <a href="${escape(link)}">Proposal</a>`);
    if (discussion && discussion.length <= 512) links.push(`- <a href="${discussion}">Discussion</a>`);
  }
  if (action.source.kind === "onchain") {
    if (!/^0x[0-9a-f]{64}$/.test(action.txHash)) throw new Error("dao_render_tx_invalid");
    links.push(`- <a href="https://etherscan.io/tx/${action.txHash}">Transaction</a>`);
  } else links.push(`- <a href="https://etherscan.io/block/${action.blockNumber}">Confirmed block</a>`);
  lines.push("", ...links, "", time(action.timestamp));
  const html = lines.join("\n");
  if (html.length > 4_096) {
    if (action.kind === "dao_proposal" && action.event === "vote" && maxVoteRows > 0) return renderDaoAlert(action, content, maxVoteRows - 1);
    throw new Error("dao_message_too_long");
  }
  return html;
}
