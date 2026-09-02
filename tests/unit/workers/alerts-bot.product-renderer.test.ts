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
    expect(voteHtml).toContain("80.00% of current weight counted due to final-day decay");
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
