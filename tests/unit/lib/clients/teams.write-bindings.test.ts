import { describe, expect, it } from "vitest";
import { getAddress, type Address } from "viem";
import feedExample from "@/docs/apps/teams/onchain-integration-plan/examples/teams-feed.example.json";
import {
  assertTeamsBonusWriteTarget,
  assertTeamsBonusSimulationTarget,
  assertTeamsFundingWriteTarget,
  assertTeamsMainnetWriteClient,
  assertTeamsRevenueWriteTarget,
  TEAMS_MAINNET_DEPLOYMENT,
  type TeamsCurrentBlockAnchor,
} from "@/lib/clients/teams";
import {
  TeamsFeedSchema,
  type TeamsFeed,
} from "@/lib/schemas/teams-feed";
import {
  createTeamsWritePublicClient,
  TEAMS_CANONICAL_TEAM_RUNTIME,
  TEAMS_CURRENT_BLOCK,
  TEAMS_CURRENT_BLOCK_HASH,
} from "@/tests/helpers/teams-onchain";

const ATTACKER =
  "0x9999999999999999999999999999999999999999" as Address;
const ANCHOR: TeamsCurrentBlockAnchor = {
  blockNumber: TEAMS_CURRENT_BLOCK,
  blockHash: TEAMS_CURRENT_BLOCK_HASH,
  blockTimestamp: BigInt(feedExample.generatedAt),
};

function createFeed(): TeamsFeed {
  return TeamsFeedSchema.parse(structuredClone(feedExample));
}

function getRevenueTarget(feed: TeamsFeed) {
  const team = feed.teams[0]!;
  const token = Object.values(feed.tokens).find(
    (entry) => entry.priceOracle !== null && entry.kind !== "bonus"
  )!;
  return {
    team: getAddress(team.address),
    token: getAddress(token.address),
  };
}

function createReturnableFeed(): TeamsFeed {
  const payload = structuredClone(feedExample) as unknown as TeamsFeed;
  const approval = payload.fundingApprovals[0]!;
  approval.used = "10";
  approval.claimable = "49999990";
  approval.averageCostPriceUsd = "1000000000000000000";
  approval.claims = [
    {
      id: "claim-0",
      approvalId: approval.id,
      team: approval.team,
      period: approval.period,
      token: approval.token,
      amount: "10",
      costUsd: "10000000000000000000",
      vest: null,
      recipient: payload.teams[0]!.owner,
      txHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      blockNumber: payload.blockNumber,
      logIndex: 1,
      timestamp: payload.generatedAt,
    },
  ];
  payload.events.fundingClaimCount = 1;
  return TeamsFeedSchema.parse(payload);
}

function getFundingBinding(
  feed: TeamsFeed,
  action: "claim" | "return",
  requestedAmount = 1n
) {
  const team = feed.teams[0]!;
  const approval = feed.fundingApprovals[0]!;
  return {
    action,
    approvalIdx: BigInt(approval.id),
    requestedAmount,
    team: getAddress(team.address),
    token: getAddress(approval.token),
    preparedAccount: getAddress(team.owner),
  } as const;
}

describe("Teams current write bindings", () => {
  it("uses the live revenue oracle mapping regardless of feed presentation kind", async () => {
    const feed = createFeed();
    const { team, token } = getRevenueTarget(feed);
    const record = Object.values(feed.tokens).find(
      (entry) => entry.address.toLowerCase() === token.toLowerCase()
    )!;
    record.kind = "funding";
    const publicClient = createTeamsWritePublicClient(feed);

    await expect(
      assertTeamsRevenueWriteTarget(
        feed,
        publicClient,
        ANCHOR,
        team,
        token
      )
    ).resolves.toBeUndefined();

    for (const [request] of publicClient.readContract.mock.calls) {
      expect(request).toEqual(
        expect.objectContaining({ blockNumber: TEAMS_CURRENT_BLOCK })
      );
    }
    for (const [request] of publicClient.getBytecode.mock.calls) {
      expect(request).toEqual(
        expect.objectContaining({ blockNumber: TEAMS_CURRENT_BLOCK })
      );
    }
  });

  it("does not call optional ERC-20 name metadata when the feed omits it", async () => {
    const feed = createFeed();
    const { team, token } = getRevenueTarget(feed);
    const record = Object.values(feed.tokens).find(
      (entry) => entry.address.toLowerCase() === token.toLowerCase()
    )!;
    record.name = null;
    const publicClient = createTeamsWritePublicClient(feed);

    await assertTeamsRevenueWriteTarget(
      feed,
      publicClient,
      ANCHOR,
      team,
      token
    );

    expect(publicClient.readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({
        address: token,
        functionName: "name",
      })
    );
  });

  it("rejects deployment and selected-team feed tampering before current reads", async () => {
    const deploymentFeed = createFeed();
    const deploymentTarget = getRevenueTarget(deploymentFeed);
    deploymentFeed.deployment.teamRegistry = ATTACKER;
    const deploymentClient = createTeamsWritePublicClient(deploymentFeed);

    await expect(
      assertTeamsRevenueWriteTarget(
        deploymentFeed,
        deploymentClient,
        ANCHOR,
        deploymentTarget.team,
        deploymentTarget.token
      )
    ).rejects.toThrow("deployment.teamRegistry");
    expect(deploymentClient.readContract).not.toHaveBeenCalled();

    const teamFeed = createFeed();
    const teamTarget = getRevenueTarget(teamFeed);
    teamFeed.teams[0]!.address = ATTACKER;
    await expect(
      assertTeamsRevenueWriteTarget(
        teamFeed,
        createTeamsWritePublicClient(teamFeed),
        ANCHOR,
        teamTarget.team,
        teamTarget.token
      )
    ).rejects.toThrow("not present in the trusted feed");
  });

  it.each([
    ["paused recipient", { revenueKilled: true }, "recipient is paused"],
    [
      "recipient accountant",
      { revenueAccountant: ATTACKER },
      "revenue recipient accountant",
    ],
    [
      "recipient period",
      { revenuePeriod: 3n },
      "revenue recipient period",
    ],
    ["recipient oracle", { revenueOracle: ATTACKER }, "oracle"],
    ["recipient converter", { revenueConverter: ATTACKER }, "converter"],
    ["token decimals", { tokenDecimals: 18 }, "decimals"],
    ["team name", { teamName: "Impostor" }, "name"],
    [
      "registry root",
      { registryRevenueRecipient: ATTACKER },
      "registry revenue recipient",
    ],
  ] as const)("rejects a mismatched current %s", async (_label, overrides, error) => {
    const feed = createFeed();
    const { team, token } = getRevenueTarget(feed);

    await expect(
      assertTeamsRevenueWriteTarget(
        feed,
        createTeamsWritePublicClient(feed, overrides),
        ANCHOR,
        team,
        token
      )
    ).rejects.toThrow(error);
  });

  it("rejects a current registry index that no longer resolves to the selected team", async () => {
    const feed = createFeed();
    const { team, token } = getRevenueTarget(feed);

    await expect(
      assertTeamsRevenueWriteTarget(
        feed,
        createTeamsWritePublicClient(feed, {
          indexedTeam: ATTACKER,
        }),
        ANCHOR,
        team,
        token
      )
    ).rejects.toThrow("team index 0");
  });

  it("does not gate existing Team writes on the registry implementation for future teams", async () => {
    const feed = createFeed();
    const { team, token } = getRevenueTarget(feed);
    const publicClient = createTeamsWritePublicClient(feed, {
      registryImplementation: ATTACKER,
    });

    await expect(
      assertTeamsRevenueWriteTarget(
        feed,
        publicClient,
        ANCHOR,
        team,
        token
      )
    ).resolves.toBeUndefined();
    expect(publicClient.readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "implementation" })
    );
  });

  it.each([
    [
      "attacker implementation target",
      `${TEAMS_CANONICAL_TEAM_RUNTIME.slice(0, 22)}${ATTACKER.slice(2)}${TEAMS_CANONICAL_TEAM_RUNTIME.slice(-30)}`,
      "does not target the audited implementation",
    ],
    [
      "malformed runtime",
      "0x6000",
      "not the canonical EIP-1167 proxy runtime",
    ],
  ] as const)(
    "rejects a selected Team proxy with %s",
    async (_label, teamProxyBytecode, error) => {
      const feed = createFeed();
      const { team, token } = getRevenueTarget(feed);

      await expect(
        assertTeamsRevenueWriteTarget(
          feed,
          createTeamsWritePublicClient(feed, {
            teamProxyBytecode: teamProxyBytecode as `0x${string}`,
          }),
          ANCHOR,
          team,
          token
        )
      ).rejects.toThrow(error);
    }
  );

  it("rejects a canonical Team proxy when its audited implementation has no bytecode", async () => {
    const feed = createFeed();
    const { team, token } = getRevenueTarget(feed);

    await expect(
      assertTeamsRevenueWriteTarget(
        feed,
        createTeamsWritePublicClient(feed, {
          teamImplementationBytecode: "0x",
        }),
        ANCHOR,
        team,
        token
      )
    ).rejects.toThrow("audited Teams implementation has no contract bytecode");
  });

  it("uses current mutable claim state without equality-binding it to the feed", async () => {
    const feed = createFeed();
    const binding = getFundingBinding(feed, "claim");
    const approval = feed.fundingApprovals[0]!;
    const publicClient = createTeamsWritePublicClient(feed, {
      approval: [
        binding.team,
        BigInt(approval.period),
        binding.token,
        BigInt(approval.amount),
        BigInt(approval.durationSeconds),
        10n,
      ],
      claimable: 49_999_990n,
    });

    await expect(
      assertTeamsFundingWriteTarget(
        feed,
        publicClient,
        ANCHOR,
        binding
      )
    ).resolves.toBeUndefined();
  });

  it("blocks a claim above the current claimable amount", async () => {
    const feed = createFeed();
    const binding = getFundingBinding(feed, "claim", 2n);

    await expect(
      assertTeamsFundingWriteTarget(
        feed,
        createTeamsWritePublicClient(feed, { claimable: 1n }),
        ANCHOR,
        binding
      )
    ).rejects.toThrow("exceeds the current claimable amount");
  });

  it.each(["claim", "return"] as const)(
    "rejects a mismatched funding accountant before a %s",
    async (action) => {
      const feed =
        action === "claim" ? createFeed() : createReturnableFeed();

      await expect(
        assertTeamsFundingWriteTarget(
          feed,
          createTeamsWritePublicClient(feed, {
            fundingAccountant: ATTACKER,
          }),
          ANCHOR,
          getFundingBinding(feed, action)
        )
      ).rejects.toThrow("funding distributor accountant");
    }
  );

  it.each([
    [
      "factory",
      { fundingVestingFactory: ATTACKER },
      "funding vesting factory",
    ],
    [
      "owner",
      { fundingVestingOwner: ATTACKER },
      "funding vesting owner",
    ],
  ] as const)(
    "rejects a mismatched vesting %s while a funding claim is still vesting",
    async (_label, overrides, error) => {
      const feed = createFeed();

      await expect(
        assertTeamsFundingWriteTarget(
          feed,
          createTeamsWritePublicClient(feed, overrides),
          ANCHOR,
          getFundingBinding(feed, "claim")
        )
      ).rejects.toThrow(error);
    }
  );

  it("does not bind vesting roots after the selected funding approval is liquid", async () => {
    const feed = createFeed();
    const approval = feed.fundingApprovals[0]!;
    const liquidAt =
      BigInt(feed.deployment.budgetGenesis) +
      BigInt(approval.period) * BigInt(feed.periods.lengthSeconds) +
      BigInt(approval.durationSeconds);
    const publicClient = createTeamsWritePublicClient(feed, {
      fundingVestingFactory: ATTACKER,
      fundingVestingOwner: ATTACKER,
    });

    await expect(
      assertTeamsFundingWriteTarget(
        feed,
        publicClient,
        { ...ANCHOR, blockTimestamp: liquidAt },
        getFundingBinding(feed, "claim")
      )
    ).resolves.toBeUndefined();

    const fundingReads = publicClient.readContract.mock.calls
      .map(([request]) => request)
      .filter(
        (request) =>
          request.address.toLowerCase() ===
          TEAMS_MAINNET_DEPLOYMENT.fundingDistributor.toLowerCase()
      );
    expect(fundingReads).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ functionName: "vesting_factory" }),
        expect.objectContaining({ functionName: "vesting_owner" }),
      ])
    );
  });

  it("rejects a tampered period length before it can bypass vesting-root checks", async () => {
    const feed = createFeed();
    feed.periods.lengthSeconds = 1;

    await expect(
      assertTeamsFundingWriteTarget(
        feed,
        createTeamsWritePublicClient(feed, {
          fundingVestingFactory: ATTACKER,
          fundingVestingOwner: ATTACKER,
        }),
        ANCHOR,
        getFundingBinding(feed, "claim")
      )
    ).rejects.toThrow("periods.lengthSeconds");
  });

  it("binds every immutable current funding approval field", async () => {
    const feed = createFeed();
    const binding = getFundingBinding(feed, "claim");
    const approval = feed.fundingApprovals[0]!;
    const canonical = [
      binding.team,
      BigInt(approval.period),
      binding.token,
      BigInt(approval.amount),
      BigInt(approval.durationSeconds),
      BigInt(approval.used),
    ] as const;
    const mismatches = [
      {
        label: "team",
        tuple: [
          ATTACKER,
          canonical[1],
          canonical[2],
          canonical[3],
          canonical[4],
          canonical[5],
        ] as const,
      },
      {
        label: "period",
        tuple: [
          canonical[0],
          canonical[1] + 1n,
          canonical[2],
          canonical[3],
          canonical[4],
          canonical[5],
        ] as const,
      },
      {
        label: "token",
        tuple: [
          canonical[0],
          canonical[1],
          ATTACKER,
          canonical[3],
          canonical[4],
          canonical[5],
        ] as const,
      },
      {
        label: "amount",
        tuple: [
          canonical[0],
          canonical[1],
          canonical[2],
          canonical[3] + 1n,
          canonical[4],
          canonical[5],
        ] as const,
      },
      {
        label: "duration",
        tuple: [
          canonical[0],
          canonical[1],
          canonical[2],
          canonical[3],
          canonical[4] + 1n,
          canonical[5],
        ] as const,
      },
    ];

    for (const mismatch of mismatches) {
      await expect(
        assertTeamsFundingWriteTarget(
          feed,
          createTeamsWritePublicClient(feed, {
            approval: mismatch.tuple,
          }),
          ANCHOR,
          binding
        ),
        mismatch.label
      ).rejects.toThrow(`funding approval 0 ${mismatch.label}`);
    }
  });

  it.each(["claim", "return"] as const)(
    "rejects an expired funding approval before %s target reads",
    async (action) => {
      const feed = createFeed();
      feed.fundingApprovals[0]!.period = feed.periods.current - 1;
      feed.fundingApprovals[0]!.status = "expired";

      const publicClient = createTeamsWritePublicClient(feed);
      await expect(
        assertTeamsFundingWriteTarget(
          feed,
          publicClient,
          ANCHOR,
          getFundingBinding(feed, action)
        )
      ).rejects.toThrow("not available in the current period");
      expect(publicClient.readContract).not.toHaveBeenCalled();
    }
  );

  it("allows permissionless retired-team returns using only the current cost bucket", async () => {
    const feed = createReturnableFeed();
    const binding = getFundingBinding(feed, "return");
    const publicClient = createTeamsWritePublicClient(feed, {
      claimable: 0n,
      fundingOracle: ATTACKER,
      fundingRegistry: ATTACKER,
      fundingVestingFactory: ATTACKER,
      fundingVestingOwner: ATTACKER,
      registered: false,
    });

    await expect(
      assertTeamsFundingWriteTarget(
        feed,
        publicClient,
        ANCHOR,
        binding
      )
    ).resolves.toBeUndefined();

    const functionNames = publicClient.readContract.mock.calls.map(
      ([request]) => request.functionName
    );
    expect(functionNames).not.toContain("is_team");
    expect(functionNames).not.toContain("claimable");
    expect(functionNames).not.toContain("oracles");
    const fundingReads = publicClient.readContract.mock.calls
      .map(([request]) => request)
      .filter(
        (request) =>
          request.address.toLowerCase() ===
          TEAMS_MAINNET_DEPLOYMENT.fundingDistributor.toLowerCase()
      )
      .map((request) => request.functionName);
    expect(fundingReads).not.toContain("registry");
    expect(fundingReads).not.toContain("vesting_factory");
    expect(fundingReads).not.toContain("vesting_owner");
  });

  it("ignores claim-only funding amount and duration changes on returns", async () => {
    const feed = createReturnableFeed();
    const binding = getFundingBinding(feed, "return");
    const approval = feed.fundingApprovals[0]!;

    await expect(
      assertTeamsFundingWriteTarget(
        feed,
        createTeamsWritePublicClient(feed, {
          approval: [
            binding.team,
            BigInt(approval.period),
            binding.token,
            BigInt(approval.amount) + 1n,
            BigInt(approval.durationSeconds) + 1n,
            BigInt(approval.used),
          ],
        }),
        ANCHOR,
        binding
      )
    ).resolves.toBeUndefined();
  });

  it("blocks retired-team claims and returns above the current aggregate cost", async () => {
    const claimFeed = createFeed();
    await expect(
      assertTeamsFundingWriteTarget(
        claimFeed,
        createTeamsWritePublicClient(claimFeed, { registered: false }),
        ANCHOR,
        getFundingBinding(claimFeed, "claim")
      )
    ).rejects.toThrow("not active");

    const revenueFeed = createFeed();
    const revenueTarget = getRevenueTarget(revenueFeed);
    await expect(
      assertTeamsRevenueWriteTarget(
        revenueFeed,
        createTeamsWritePublicClient(revenueFeed, {
          registered: false,
        }),
        ANCHOR,
        revenueTarget.team,
        revenueTarget.token
      )
    ).rejects.toThrow("not active");

    const returnFeed = createReturnableFeed();
    await expect(
      assertTeamsFundingWriteTarget(
        returnFeed,
        createTeamsWritePublicClient(returnFeed, {
          cost: [0n, 0n],
          registered: false,
        }),
        ANCHOR,
        getFundingBinding(returnFeed, "return")
      )
    ).rejects.toThrow("exceeds the current aggregate returnable amount");
  });

  it("allows retired bonus targets and monotonic cursor and period progress", async () => {
    const feed = createFeed();
    const team = feed.teams[0]!;
    const publicClient = createTeamsWritePublicClient(feed, {
      bonusCursor: BigInt(team.claimCursor.nextBonusPeriod + 1),
      bonusPendingPeriod: BigInt(feed.bonus.pendingPeriod + 20),
      registered: false,
    });

    await expect(
      assertTeamsBonusWriteTarget(
        feed,
        publicClient,
        ANCHOR,
        getAddress(team.address),
        getAddress(team.owner)
      )
    ).resolves.toBeUndefined();

    const functionNames = publicClient.readContract.mock.calls.map(
      ([request]) => request.functionName
    );
    expect(functionNames).not.toContain("is_team");
    expect(functionNames).not.toContain("registry");
  });

  it("binds distinct current owner, accountant, and YBC recipient addresses to their own roles", async () => {
    const feed = createFeed();
    const team = feed.teams[0]!;
    const publicClient = createTeamsWritePublicClient(feed);

    await expect(
      assertTeamsBonusWriteTarget(
        feed,
        publicClient,
        ANCHOR,
        getAddress(team.address),
        getAddress(team.owner)
      )
    ).resolves.toBeUndefined();
    await expect(
      assertTeamsBonusSimulationTarget(
        publicClient,
        ANCHOR,
        [1n, 1n]
      )
    ).resolves.toBeUndefined();

    expect(
      new Set([
        team.owner.toLowerCase(),
        TEAMS_MAINNET_DEPLOYMENT.teamAccountant.toLowerCase(),
        TEAMS_MAINNET_DEPLOYMENT.ybcBonusRecipient.toLowerCase(),
      ]).size
    ).toBe(3);
  });

  it("does not bind an unused YBC recipient for a zero-result bonus cursor advance", async () => {
    const feed = createFeed();
    const publicClient = createTeamsWritePublicClient(feed, {
      bonusYbcRecipient: ATTACKER,
    });

    await expect(
      assertTeamsBonusSimulationTarget(
        publicClient,
        ANCHOR,
        [0n, 0n]
      )
    ).resolves.toBeUndefined();
    expect(publicClient.readContract).not.toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "ybc_recipient" })
    );
  });

  it("rejects a mismatched YBC recipient when the bonus simulation will deposit a share", async () => {
    const feed = createFeed();

    await expect(
      assertTeamsBonusSimulationTarget(
        createTeamsWritePublicClient(feed, {
          bonusYbcRecipient: ATTACKER,
        }),
        ANCHOR,
        [1n, 1n]
      )
    ).rejects.toThrow("bonus distributor YBC recipient");
  });

  it.each([
    ["cursor regression", { bonusCursor: 1n }, "cursor regressed"],
    ["pending regression", { bonusPendingPeriod: 2n }, "period regressed"],
    ["bonus token", { bonusToken: ATTACKER }, "bonus distributor token"],
    [
      "accountant",
      { bonusAccountant: ATTACKER },
      "bonus distributor accountant",
    ],
    ["team owner", { teamOwner: ATTACKER }, "current Team owner"],
  ] as const)("rejects a bonus %s", async (_label, overrides, error) => {
    const feed = createFeed();
    const team = feed.teams[0]!;

    await expect(
      assertTeamsBonusWriteTarget(
        feed,
        createTeamsWritePublicClient(feed, overrides),
        ANCHOR,
        getAddress(team.address),
        getAddress(team.owner)
      )
    ).rejects.toThrow(error);
  });

  it("requires both configured and RPC-reported mainnet identity", async () => {
    const feed = createFeed();

    await expect(
      assertTeamsMainnetWriteClient(
        createTeamsWritePublicClient(feed, { chainMetadataId: 137 })
      )
    ).rejects.toThrow("configured Ethereum Mainnet");
    await expect(
      assertTeamsMainnetWriteClient(
        createTeamsWritePublicClient(feed, { rpcChainId: 137 })
      )
    ).rejects.toThrow("Ethereum Mainnet RPC");
  });
});
