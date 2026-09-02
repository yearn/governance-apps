import { describe, expect, it } from "vitest";

import {
  PRODUCT_ALERT_INTRODUCTIONS,
  assertProductAlertIntroductionHtml,
  renderProductAlertAction,
} from "@/workers/alerts-bot/src/product-renderer";
import type { ProductAlertAction } from "@/workers/alerts-bot/src/product-types";
import {
  PRODUCT_ALERT_CATALOGUE_FIXTURES,
  PRODUCT_CATALOGUE_BLOCK_HASH,
  PRODUCT_CATALOGUE_EVENT_TIME,
  renderProductAlertFixture,
} from "./alerts-bot.product-catalogue-fixtures";

const WAD = 10n ** 18n;

function fixture(kind: ProductAlertAction["kind"]): ProductAlertAction {
  const value = PRODUCT_ALERT_CATALOGUE_FIXTURES.find((candidate) => candidate.kind === kind);
  if (value === undefined) throw new Error("product_catalogue_fixture_missing");
  return value.action;
}

describe("Teams and YBC alert catalogue", () => {
  it("renders every agreed alert family within Telegram's HTML limit", () => {
    expect(PRODUCT_ALERT_CATALOGUE_FIXTURES).toHaveLength(30);

    for (const value of PRODUCT_ALERT_CATALOGUE_FIXTURES) {
      const html = renderProductAlertFixture(value);
      expect(html.length, value.kind).toBeLessThanOrEqual(4_096);
      expect(html, value.kind).toContain("https://etherscan.io/");
      expect(html, value.kind).not.toContain("Snapshot");
      expect(html, value.kind).not.toContain("delegated influence");
    }
  });

  it("uses product links for useful current state and cast-weight vote math", () => {
    const teamHtml = renderProductAlertAction(fixture("team_added"), PRODUCT_CATALOGUE_EVENT_TIME);
    const voteHtml = renderProductAlertAction(fixture("ybc_vote_cast"), PRODUCT_CATALOGUE_EVENT_TIME);
    expect(teamHtml).toContain("https://teams.yearn.fi/");
    expect(voteHtml).toContain("https://ybc.yearn.fi/?proposal=12#proposals".replace("?", "?").replace("&", "&amp;"));
    expect(voteHtml).toContain("8.00 / 10.00 YFI cast · 80.00% yea");
    expect(voteHtml).toContain("60.00% · Currently passing");
    expect(voteHtml).toContain("Final-day decay: active · 43,200 seconds remaining");
  });

  it("does not let rounded support change the on-chain pass result", () => {
    const vote = fixture("ybc_vote_cast") as Extract<
      ProductAlertAction,
      { kind: "ybc_vote_cast" }
    >;
    const html = renderProductAlertAction({
      ...vote,
      details: {
        ...vote.details,
        yeaWeight: 59_995n * WAD,
        totalWeight: 100_000n * WAD,
        thresholdBps: 6_000n,
      },
    }, PRODUCT_CATALOGUE_EVENT_TIME);

    expect(html).toContain("60.00% yea");
    expect(html).toContain("60.00% · Currently failing");
  });

  it("uses exact integer vote math at threshold, one unit below, and zero votes", () => {
    const vote = fixture("ybc_vote_cast") as Extract<
      ProductAlertAction,
      { kind: "ybc_vote_cast" }
    >;
    const render = (yeaWeight: bigint, totalWeight: bigint) =>
      renderProductAlertAction({
        ...vote,
        details: {
          ...vote.details,
          yeaWeight,
          totalWeight,
          thresholdBps: 6_000n,
        },
      }, PRODUCT_CATALOGUE_EVENT_TIME);

    expect(render(60n * WAD, 100n * WAD)).toContain("Currently passing");
    expect(render(60n * WAD - 1n, 100n * WAD)).toContain("Currently failing");
    expect(render(0n, 0n)).toContain("Currently failing");
  });

  it("renders the final-day boundary without claiming an invertible current weight", () => {
    const vote = fixture("ybc_vote_cast") as Extract<
      ProductAlertAction,
      { kind: "ybc_vote_cast" }
    >;
    const beforeDecay = renderProductAlertAction({
      ...vote,
      details: { ...vote.details, finalDayDecaySecondsRemaining: null },
    }, PRODUCT_CATALOGUE_EVENT_TIME);
    const lastSecond = renderProductAlertAction({
      ...vote,
      details: { ...vote.details, finalDayDecaySecondsRemaining: 1n },
    }, PRODUCT_CATALOGUE_EVENT_TIME);

    expect(beforeDecay).not.toContain("Final-day decay:");
    expect(lastSecond).toContain("Final-day decay: active · 1 second remaining");
    expect(lastSecond).not.toContain("current weight counted");
  });

  it("renders direct and vested funding delivery variants", () => {
    const funding = fixture("team_funding_claimed") as Extract<
      ProductAlertAction,
      { kind: "team_funding_claimed" }
    >;
    const vested = renderProductAlertAction(funding, PRODUCT_CATALOGUE_EVENT_TIME);
    const direct = renderProductAlertAction({
      ...funding,
      details: {
        ...funding.details,
        vest: "0x0000000000000000000000000000000000000000",
      },
    }, PRODUCT_CATALOGUE_EVENT_TIME);

    expect(vested).toContain("Delivery: Vesting contract");
    expect(direct).toContain("Delivery: Direct transfer");
  });

  it("renders whale, non-whale, contiguous, and noncontiguous bonus variants", () => {
    const bonus = fixture("team_bonus_claimed") as Extract<
      ProductAlertAction,
      { kind: "team_bonus_claimed" }
    >;
    const whale = renderProductAlertAction({
      ...bonus,
      details: { ...bonus.details, gross: 40n * WAD },
    }, PRODUCT_CATALOGUE_EVENT_TIME);
    const ordinary = renderProductAlertAction({
      ...bonus,
      details: {
        ...bonus.details,
        periods: [2n, 4n],
        gross: 39n * WAD,
        teamAmount: 34n * WAD,
      },
    }, PRODUCT_CATALOGUE_EVENT_TIME);

    expect(whale).toContain("WHALE MOVE");
    expect(ordinary).not.toContain("WHALE MOVE");
    expect(ordinary).toContain("Periods: #2, #4");
  });

  it("renders token fallback, expulsion, operator removal, and declining-power variants", () => {
    const revenue = fixture("team_revenue_deposited") as Extract<
      ProductAlertAction,
      { kind: "team_revenue_deposited" }
    >;
    const proposal = fixture("ybc_proposal_opened") as Extract<
      ProductAlertAction,
      { kind: "ybc_proposal_opened" }
    >;
    const operator = fixture("ybc_operator_changed") as Extract<
      ProductAlertAction,
      { kind: "ybc_operator_changed" }
    >;
    const power = fixture("ybc_collective_power_changed") as Extract<
      ProductAlertAction,
      { kind: "ybc_collective_power_changed" }
    >;
    const fallback = renderProductAlertAction({
      ...revenue,
      details: {
        ...revenue.details,
        deposited: { ...revenue.details.deposited, symbol: null, decimals: null, value: 123n },
      },
    }, PRODUCT_CATALOGUE_EVENT_TIME);
    const expulsion = renderProductAlertAction({
      ...proposal,
      details: { ...proposal.details, proposalType: "expulsion" },
    }, PRODUCT_CATALOGUE_EVENT_TIME);
    const removed = renderProductAlertAction({
      ...operator,
      details: { ...operator.details, enabled: false },
    }, PRODUCT_CATALOGUE_EVENT_TIME);
    const decline = renderProductAlertAction({
      ...power,
      details: {
        ...power.details,
        previousPower: 100n * WAD,
        currentPower: 90n * WAD,
        cause: "weight configuration changed",
      },
    }, PRODUCT_CATALOGUE_EVENT_TIME);

    expect(fallback).toContain("123 base units · token");
    expect(expulsion).toContain("YBC-12 · Remove member");
    expect(expulsion).toContain("Member:");
    expect(removed).toContain("YBC operator removed");
    expect(removed).toContain("Status: Removed");
    expect(decline).toContain("Change: -10.00 YFI");
    expect(decline).toContain("Cause: Weight configuration changed");
  });

  it("uses a block-only footer for epoch-only B14 checkpoints", () => {
    const power = fixture("ybc_collective_power_changed") as Extract<
      ProductAlertAction,
      { kind: "ybc_collective_power_changed" }
    >;
    const html = renderProductAlertAction({
      ...power,
      eventId: `ybc-power:${PRODUCT_CATALOGUE_BLOCK_HASH}`,
      txHash: `ybc-power:${PRODUCT_CATALOGUE_BLOCK_HASH}`,
      source: {
        kind: "synthetic",
        metricId: `ybc-power:${PRODUCT_CATALOGUE_BLOCK_HASH}`,
        blockHash: PRODUCT_CATALOGUE_BLOCK_HASH,
        orderingIndex: power.logIndex,
      },
    }, PRODUCT_CATALOGUE_EVENT_TIME);

    expect(html).toContain("Block 25,500,000");
    expect(html).not.toContain(">Tx</a>");
  });

  it("validates both channel introductions", () => {
    expect(() => assertProductAlertIntroductionHtml()).not.toThrow();
    expect(PRODUCT_ALERT_INTRODUCTIONS.teams).toContain("Yearn Teams activity");
    expect(PRODUCT_ALERT_INTRODUCTIONS.ybc).toContain("weight cast on that proposal");
  });
});
