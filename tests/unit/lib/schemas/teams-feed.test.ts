import { describe, expect, it } from "vitest";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import {
  TEAMS_FEED_MAX_EVENT_ID_LENGTH,
  TEAMS_FEED_MAX_SOURCE_REF_LENGTH,
  TEAMS_FEED_MAX_TEAMS,
  TEAMS_FEED_MAX_TEAM_NAME_LENGTH,
  TEAMS_FEED_MAX_TOKENS,
  TEAMS_FEED_MAX_TOKEN_SYMBOL_LENGTH,
  TEAMS_FEED_MAX_UNIX_SECONDS,
  TeamsFeedSchema,
  type TeamsFeed,
} from "@/lib/schemas/teams-feed";

describe("TeamsFeedSchema", () => {
  it("accepts normalized v2 payloads with explicit units", () => {
    const parsed = TeamsFeedSchema.safeParse(feedExample);
    expect(parsed.success).toBe(true);
  });

  it("keeps legacy v1 payloads parseable for nonfinancial data", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      version: 1,
      units: undefined,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts the live v1 zero balance tuple without assigning unitless values", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      version: 1,
      units: undefined,
      revenueRecipient: {
        ...feedExample.revenueRecipient,
        token: undefined,
        lastBalance: "0",
        sumBalance: "0",
        used: ["0", "0", "0"],
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects nonzero v1 recipient balances without a token", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      version: 1,
      units: undefined,
      revenueRecipient: {
        ...feedExample.revenueRecipient,
        token: undefined,
        lastBalance: "1",
        sumBalance: "1",
        used: ["0", "0", "0"],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("requires v2 recipient balances to declare their token even when zero", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      revenueRecipient: {
        ...feedExample.revenueRecipient,
        token: undefined,
        lastBalance: "0",
        sumBalance: "0",
        used: ["0", "0", "0"],
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("requires unit metadata for v2 payloads", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      units: undefined,
    });
    expect(parsed.success).toBe(false);
  });

  it.each([
    [
      "USD symbol",
      {
        ...feedExample.units,
        usd: { ...feedExample.units.usd, symbol: "USDX" },
      },
    ],
    [
      "USD decimals",
      {
        ...feedExample.units,
        usd: { ...feedExample.units.usd, decimals: 6 },
      },
    ],
    [
      "USD scope",
      {
        ...feedExample.units,
        usd: { ...feedExample.units.usd, scope: "accountant-only" },
      },
    ],
    [
      "bonus token symbol",
      {
        ...feedExample.units,
        bonusToken: { ...feedExample.units.bonusToken, symbol: "USDC" },
      },
    ],
    [
      "bonus token decimals",
      {
        ...feedExample.units,
        bonusToken: { ...feedExample.units.bonusToken, decimals: 6 },
      },
    ],
  ])("rejects an incompatible %s unit declaration", (_label, units) => {
    expect(
      TeamsFeedSchema.safeParse({
        ...feedExample,
        units,
      }).success
    ).toBe(false);
  });

  it("requires revenue token splits to total exactly 10,000 bps", () => {
    expect(
      TeamsFeedSchema.safeParse({
        ...feedExample,
        revenueRecipient: {
          ...feedExample.revenueRecipient,
          tokenSplitBps: [5000, 3000, 1999],
        },
      }).success
    ).toBe(false);
  });

  it("rejects non-mainnet chain id", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      chainId: 10,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects decimal token amount strings", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      teams: [
        {
          ...feedExample.teams[0]!,
          periods: [
            {
              ...feedExample.teams[0]!.periods[0]!,
              financials: {
                ...feedExample.teams[0]!.periods[0]!.financials,
                revenueUsd: "1.5",
              },
            },
          ],
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("requires deployment block metadata", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      deployment: {
        ...feedExample.deployment,
        deployBlock: undefined,
      },
    });
    expect(parsed.success).toBe(false);
  });

  it.each(["abc", "-1", "1".repeat(79)])(
    "rejects malformed uint256 strings without throwing: %s",
    (revenueUsd) => {
      expect(() =>
        TeamsFeedSchema.safeParse({
          ...feedExample,
          teams: [
            {
              ...feedExample.teams[0]!,
              lifetime: {
                ...feedExample.teams[0]!.lifetime,
                revenueUsd,
              },
            },
          ],
        })
      ).not.toThrow();
      expect(
        TeamsFeedSchema.safeParse({
          ...feedExample,
          teams: [
            {
              ...feedExample.teams[0]!,
              lifetime: {
                ...feedExample.teams[0]!.lifetime,
                revenueUsd,
              },
            },
          ],
        }).success
      ).toBe(false);
    }
  );

  it("rejects integers above uint256 max", () => {
    const parsed = TeamsFeedSchema.safeParse({
      ...feedExample,
      teams: [
        {
          ...feedExample.teams[0]!,
          lifetime: {
            ...feedExample.teams[0]!.lifetime,
            revenueUsd:
              "115792089237316195423570985008687907853269984665640564039457584007913129639936",
          },
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("bounds externally supplied strings and timestamps", () => {
    const longId = cloneFeed();
    longId.teams[0]!.periods[0]!.revenueDeposits[0]!.id = "x".repeat(
      TEAMS_FEED_MAX_EVENT_ID_LENGTH + 1
    );
    expectSchemaIssue(longId, /too big/i);

    const longTeamName = cloneFeed();
    longTeamName.teams[0]!.name = "x".repeat(
      TEAMS_FEED_MAX_TEAM_NAME_LENGTH + 1
    );
    expectSchemaIssue(longTeamName, /too big/i);

    const tokenKey = Object.keys(feedExample.tokens)[0]!;
    const longTokenSymbol = cloneFeed();
    longTokenSymbol.tokens[tokenKey]!.symbol = "x".repeat(
      TEAMS_FEED_MAX_TOKEN_SYMBOL_LENGTH + 1
    );
    expectSchemaIssue(longTokenSymbol, /too big/i);

    const longSourceRef = cloneFeed();
    longSourceRef.deployment.source.ref = "x".repeat(
      TEAMS_FEED_MAX_SOURCE_REF_LENGTH + 1
    );
    expectSchemaIssue(longSourceRef, /too big/i);

    const distantTimestamp = cloneFeed();
    distantTimestamp.generatedAt = TEAMS_FEED_MAX_UNIX_SECONDS + 1;
    expectSchemaIssue(distantTimestamp, /too big/i);
  });

  it("preflights oversized arrays before parsing their items", () => {
    const poisonousEntry = new Proxy(
      {},
      {
        get() {
          throw new Error("array item should not be parsed");
        },
      }
    );
    const oversizedTeams = Array.from(
      { length: TEAMS_FEED_MAX_TEAMS + 1 },
      () => poisonousEntry
    );

    expect(() =>
      TeamsFeedSchema.safeParse({
        ...feedExample,
        teams: oversizedTeams,
      })
    ).not.toThrow();
    expect(
      TeamsFeedSchema.safeParse({
        ...feedExample,
        teams: oversizedTeams,
      }).success
    ).toBe(false);
  });

  it("bounds token records before parsing their entries", () => {
    const baseToken = Object.values(cloneFeed().tokens)[0]!;
    const tokens = Object.fromEntries(
      Array.from({ length: TEAMS_FEED_MAX_TOKENS + 1 }, (_, index) => {
        const address = `0x${(index + 1).toString(16).padStart(40, "0")}`;
        return [address, { ...baseToken, address }];
      })
    );

    expectSchemaIssue(
      {
        ...feedExample,
        tokens,
      },
      /at most 256 entries/i
    );
  });

  it("rejects zero addresses and normalized duplicate identities", () => {
    const zeroOwner = cloneFeed();
    zeroOwner.teams[0]!.owner =
      "0x0000000000000000000000000000000000000000";
    expectSchemaIssue(zeroOwner, /non-zero Ethereum address/i);

    const duplicateTokens = cloneFeed();
    const [tokenKey, token] = Object.entries(duplicateTokens.tokens)[0]!;
    const normalizedKey = tokenKey.toLowerCase();
    duplicateTokens.tokens[normalizedKey] = {
      ...token,
      address: normalizedKey,
    };
    expectSchemaIssue(duplicateTokens, /Token keys must be unique/i);
  });

  it("rejects unresolved token and funding-approval cross-references", () => {
    const unknownDepositToken = cloneFeed();
    unknownDepositToken.teams[0]!.periods[0]!.revenueDeposits[0]!.token =
      "0x4444444444444444444444444444444444444444";
    expectSchemaIssue(
      unknownDepositToken,
      /Revenue deposits must reference/i
    );

    const unknownApproval = cloneFeed();
    unknownApproval.teams[0]!.periods[0]!.fundingApprovalIds = [999];
    expectSchemaIssue(
      unknownApproval,
      /Funding approval references must resolve/i
    );
  });

  it("conserves event ranges, counters, IDs, and log coordinates", () => {
    const wrongCount = cloneFeed();
    wrongCount.events.revenueDepositCount += 1;
    expectSchemaIssue(wrongCount, /Event counters must exactly match/i);

    const outOfRange = cloneFeed();
    outOfRange.teams[0]!.periods[0]!.revenueDeposits[0]!.blockNumber =
      outOfRange.events.firstIndexedBlock - 1;
    expectSchemaIssue(outOfRange, /inside the indexed snapshot range/i);

    const duplicateLog = cloneFeed();
    const original =
      duplicateLog.teams[0]!.periods[0]!.revenueDeposits[0]!;
    duplicateLog.teams[0]!.periods[0]!.revenueDeposits.push({
      ...original,
      id: "duplicate-log-coordinate",
    });
    duplicateLog.events.revenueDepositCount += 1;
    expectSchemaIssue(
      duplicateLog,
      /transaction log coordinates must be globally unique/i
    );
  });

  it("conserves v2 financial and bonus arithmetic", () => {
    const brokenFinancials = cloneFeed();
    brokenFinancials.teams[0]!.lifetime.profitUsd = "1";
    expectSchemaIssue(
      brokenFinancials,
      /Profit and loss must exactly conserve/i
    );

    const brokenBonus = cloneFeed();
    brokenBonus.teams[0]!.periods[0]!.bonus!.claimableYfi = "1";
    expectSchemaIssue(
      brokenBonus,
      /Claimable YFI must equal/i
    );
  });

  it("rejects aggregate funding returns above claims for a team-period-token bucket", () => {
    const payload = cloneFeed();
    const approval = payload.fundingApprovals[0]!;
    approval.used = "1";
    approval.claimable = "49999999";
    approval.claims = [
      {
        id: "claim-0",
        approvalId: approval.id,
        team: approval.team,
        period: approval.period,
        token: approval.token,
        amount: "1",
        costUsd: "1",
        vest: null,
        recipient: "0x2222222222222222222222222222222222222222",
        txHash:
          "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        blockNumber: payload.blockNumber,
        logIndex: 1,
        timestamp: payload.generatedAt,
      },
    ];
    approval.returns = [
      {
        id: "return-0",
        approvalId: approval.id,
        team: approval.team,
        period: approval.period,
        token: approval.token,
        amount: "2",
        refundUsd: "2",
        sender: "0x2222222222222222222222222222222222222222",
        txHash:
          "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        blockNumber: payload.blockNumber,
        logIndex: 2,
        timestamp: payload.generatedAt,
      },
    ];
    payload.events.fundingClaimCount = 1;
    payload.events.fundingReturnCount = 1;

    expectSchemaIssue(
      payload,
      /Aggregate funding return units cannot exceed recorded claim units/i
    );
  });

  it("accepts cross-approval returns when the aggregate cost bucket stays nonnegative", () => {
    const payload = cloneFeed();
    const approval = payload.fundingApprovals[0]!;
    approval.used = "10";
    approval.claimable = "49999990";
    approval.claims = [
      {
        id: "claim-aggregate",
        approvalId: approval.id,
        team: approval.team,
        period: approval.period,
        token: approval.token,
        amount: "10",
        costUsd: "10",
        vest: null,
        recipient: "0x2222222222222222222222222222222222222222",
        txHash:
          "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        blockNumber: payload.blockNumber,
        logIndex: 3,
        timestamp: payload.generatedAt,
      },
    ];
    const sibling = structuredClone(approval);
    sibling.id = 1;
    sibling.used = "0";
    sibling.claimable = sibling.amount;
    sibling.claims = [];
    sibling.returns = [
      {
        id: "return-cross-approval",
        approvalId: sibling.id,
        team: sibling.team,
        period: sibling.period,
        token: sibling.token,
        amount: "8",
        refundUsd: "8",
        sender: "0x2222222222222222222222222222222222222222",
        txHash:
          "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        blockNumber: payload.blockNumber,
        logIndex: 4,
        timestamp: payload.generatedAt,
      },
    ];
    payload.fundingApprovals.push(sibling);
    payload.teams[0]!.periods[0]!.fundingApprovalIds = [0, 1];
    payload.events.fundingApprovalCount = 2;
    payload.events.fundingClaimCount = 1;
    payload.events.fundingReturnCount = 1;

    expect(TeamsFeedSchema.safeParse(payload).success).toBe(true);

    sibling.returns[0]!.amount = "11";
    expectSchemaIssue(
      payload,
      /Aggregate funding return units cannot exceed recorded claim units/i
    );
  });
});

function cloneFeed(): TeamsFeed {
  return structuredClone(feedExample) as unknown as TeamsFeed;
}

function expectSchemaIssue(payload: unknown, expected: RegExp): void {
  const result = TeamsFeedSchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (result.success) return;
  expect(result.error.issues.map((issue) => issue.message).join("\n")).toMatch(
    expected
  );
}
