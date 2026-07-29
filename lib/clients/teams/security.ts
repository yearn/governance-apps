import {
  erc20Abi,
  getAddress,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
} from "viem";
import { BonusDistributorAbi } from "@/lib/abis/BonusDistributor";
import { FundingDistributorAbi } from "@/lib/abis/FundingDistributor";
import { RevenueRecipientAbi } from "@/lib/abis/RevenueRecipient";
import { TeamAbi } from "@/lib/abis/Team";
import { TeamRegistryAbi } from "@/lib/abis/TeamRegistry";
import type {
  TeamsFeed,
  TeamsFeedFundingApproval,
  TeamsFeedTeam,
  TeamsFeedToken,
} from "@/lib/schemas/teams-feed";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";
import {
  assertSameTeamsAddress,
  assertTeamsMainnetDeployment,
  TEAMS_MAINNET_DEPLOYMENT,
} from "./deployment";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const EIP_1167_RUNTIME_PREFIX = "0x363d3d373d3d3d363d73";
const EIP_1167_RUNTIME_SUFFIX = "5af43d82803e903d91602b57fd5bf3";

export type TeamsWritePublicClient = Pick<
  PublicClient,
  "chain" | "getBlock" | "getBytecode" | "getChainId" | "readContract"
>;

export type TeamsCurrentBlockAnchor = {
  blockNumber: bigint;
  blockHash: Hash;
  blockTimestamp: bigint;
};

export type TeamsFundingWriteBinding = {
  action: "claim" | "return";
  approvalIdx: bigint;
  requestedAmount: bigint;
  team: Address;
  token: Address;
  preparedAccount: Address;
};

export class TeamsWriteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TeamsWriteValidationError";
  }
}

export async function assertTeamsMainnetWriteClient(
  publicClient: TeamsWritePublicClient
): Promise<void> {
  if (publicClient.chain?.id !== MAINNET_CHAIN_ID) {
    throw new TeamsWriteValidationError(
      "Teams writes require a configured Ethereum Mainnet public client."
    );
  }
  if ((await publicClient.getChainId()) !== MAINNET_CHAIN_ID) {
    throw new TeamsWriteValidationError(
      "Teams writes require an Ethereum Mainnet RPC."
    );
  }
}

export async function readTeamsCurrentBlockAnchor(
  publicClient: TeamsWritePublicClient
): Promise<TeamsCurrentBlockAnchor> {
  const block = await publicClient.getBlock({ blockTag: "latest" });
  if (
    block.number === null ||
    block.hash === null ||
    block.hash.toLowerCase() === ZERO_HASH
  ) {
    throw new TeamsWriteValidationError(
      "Teams could not pin a canonical current block."
    );
  }
  return {
    blockNumber: block.number,
    blockHash: block.hash,
    blockTimestamp: block.timestamp,
  };
}

export async function assertTeamsBlockAnchorCanonical(
  publicClient: TeamsWritePublicClient,
  anchor: TeamsCurrentBlockAnchor
): Promise<void> {
  const block = await publicClient.getBlock({
    blockNumber: anchor.blockNumber,
  });
  if (
    block.number !== anchor.blockNumber ||
    block.hash === null ||
    block.hash.toLowerCase() !== anchor.blockHash.toLowerCase()
  ) {
    throw new TeamsWriteValidationError(
      "The Teams validation anchor is no longer canonical."
    );
  }
}

export async function assertTeamsRevenueWriteTarget(
  feed: TeamsFeed,
  publicClient: TeamsWritePublicClient,
  anchor: TeamsCurrentBlockAnchor,
  team: Address,
  token: Address
): Promise<void> {
  assertTeamsMainnetDeployment(feed);
  const feedTeam = getSelectedFeedTeam(feed, team);
  const feedToken = getSelectedFeedToken(feed, token, "revenue");
  const blockNumber = anchor.blockNumber;

  await assertProtocolTeam(
    publicClient,
    feedTeam,
    blockNumber,
    {
      requireActive: true,
      root: "revenue",
    }
  );
  await assertCurrentTokenMetadata(
    publicClient,
    feedToken,
    blockNumber
  );
  await assertHasBytecode(
    publicClient,
    TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
    "revenue recipient",
    blockNumber
  );

  const [registry, accountant, killed, period, oracle, converter] =
    await Promise.all([
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
        abi: RevenueRecipientAbi,
        functionName: "registry",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
        abi: RevenueRecipientAbi,
        functionName: "accountant",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
        abi: RevenueRecipientAbi,
        functionName: "killed",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
        abi: RevenueRecipientAbi,
        functionName: "period",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
        abi: RevenueRecipientAbi,
        functionName: "oracles",
        args: [token],
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
        abi: RevenueRecipientAbi,
        functionName: "converters",
        args: [token],
        blockNumber,
      }),
    ]);

  assertSameTeamsAddress(
    registry,
    TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
    "revenue recipient registry"
  );
  assertSameTeamsAddress(
    accountant,
    TEAMS_MAINNET_DEPLOYMENT.teamAccountant,
    "revenue recipient accountant"
  );
  await assertHasBytecode(
    publicClient,
    TEAMS_MAINNET_DEPLOYMENT.teamAccountant,
    "team accountant",
    blockNumber
  );
  if (killed) {
    throw new TeamsWriteValidationError(
      "The current Teams revenue recipient is paused."
    );
  }
  assertCurrentPeriod(period, feed, "revenue recipient");
  const expectedOracle = getRequiredFeedOracle(feedToken, "revenue");
  assertSameTeamsAddress(
    oracle,
    expectedOracle,
    `revenue token ${token} oracle`
  );
  await assertHasBytecode(
    publicClient,
    getAddress(expectedOracle),
    `revenue token ${token} oracle`,
    blockNumber
  );

  const expectedConverter = feedToken.converter ?? ZERO_ADDRESS;
  assertSameTeamsAddress(
    converter,
    expectedConverter,
    `revenue token ${token} converter`
  );
  if (!sameAddress(expectedConverter, ZERO_ADDRESS)) {
    await assertHasBytecode(
      publicClient,
      getAddress(expectedConverter),
      `revenue token ${token} converter`,
      blockNumber
    );
  }
}

export async function assertTeamsFundingWriteTarget(
  feed: TeamsFeed,
  publicClient: TeamsWritePublicClient,
  anchor: TeamsCurrentBlockAnchor,
  binding: TeamsFundingWriteBinding
): Promise<void> {
  assertTeamsMainnetDeployment(feed);
  const feedTeam = getSelectedFeedTeam(feed, binding.team);
  const feedApproval = getSelectedFeedApproval(feed, binding);
  const feedToken = getSelectedFeedToken(feed, binding.token, "funding");
  const blockNumber = anchor.blockNumber;

  if (feedApproval.period !== feed.periods.current) {
    throw new TeamsWriteValidationError(
      `Teams funding approval ${binding.approvalIdx} is not available in the current period.`
    );
  }

  await assertProtocolTeam(
    publicClient,
    feedTeam,
    blockNumber,
    {
      preparedOwner:
        binding.action === "claim" ? binding.preparedAccount : null,
      requireActive: binding.action === "claim",
      root: "funding",
    }
  );

  await assertCurrentTokenMetadata(
    publicClient,
    feedToken,
    blockNumber
  );
  await assertHasBytecode(
    publicClient,
    TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
    "funding distributor",
    blockNumber
  );

  const [accountant, period, numApprovals, approval, approvalToken] =
    await Promise.all([
    publicClient.readContract({
      address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
      abi: FundingDistributorAbi,
      functionName: "accountant",
      blockNumber,
    }),
    publicClient.readContract({
      address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
      abi: FundingDistributorAbi,
      functionName: "period",
      blockNumber,
    }),
    publicClient.readContract({
      address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
      abi: FundingDistributorAbi,
      functionName: "num_approvals",
      blockNumber,
    }),
    publicClient.readContract({
      address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
      abi: FundingDistributorAbi,
      functionName: "approvals",
      args: [binding.approvalIdx],
      blockNumber,
    }),
    publicClient.readContract({
      address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
      abi: FundingDistributorAbi,
      functionName: "token",
      args: [binding.approvalIdx],
      blockNumber,
    }),
  ]);

  assertSameTeamsAddress(
    accountant,
    TEAMS_MAINNET_DEPLOYMENT.teamAccountant,
    "funding distributor accountant"
  );
  await assertHasBytecode(
    publicClient,
    TEAMS_MAINNET_DEPLOYMENT.teamAccountant,
    "team accountant",
    blockNumber
  );
  assertCurrentPeriod(period, feed, "funding distributor");
  if (binding.approvalIdx >= numApprovals) {
    throw new TeamsWriteValidationError(
      `Teams funding approval ${binding.approvalIdx} is outside the current distributor.`
    );
  }
  assertCurrentFundingApproval(
    feedApproval,
    binding,
    approval,
    approvalToken
  );

  if (binding.action === "claim") {
    const [registry, claimable, oracle] = await Promise.all([
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
        abi: FundingDistributorAbi,
        functionName: "registry",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
        abi: FundingDistributorAbi,
        functionName: "claimable",
        args: [binding.approvalIdx],
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
        abi: FundingDistributorAbi,
        functionName: "oracles",
        args: [binding.token],
        blockNumber,
      }),
    ]);
    assertSameTeamsAddress(
      registry,
      TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
      "funding distributor registry"
    );
    const expectedOracle = getRequiredFeedOracle(feedToken, "funding");
    assertSameTeamsAddress(
      oracle,
      expectedOracle,
      `funding token ${binding.token} oracle`
    );
    await assertHasBytecode(
      publicClient,
      getAddress(expectedOracle),
      `funding token ${binding.token} oracle`,
      blockNumber
    );
    if (binding.requestedAmount > claimable) {
      throw new TeamsWriteValidationError(
        `Teams funding claim exceeds the current claimable amount for approval ${binding.approvalIdx}.`
      );
    }
    if (
      anchor.blockTimestamp <
      BigInt(TEAMS_MAINNET_DEPLOYMENT.budgetGenesis) +
        approval[1] *
          BigInt(TEAMS_MAINNET_DEPLOYMENT.budgetPeriodLengthSeconds) +
        approval[4]
    ) {
      const [vestingFactory, vestingOwner] = await Promise.all([
        publicClient.readContract({
          address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
          abi: FundingDistributorAbi,
          functionName: "vesting_factory",
          blockNumber,
        }),
        publicClient.readContract({
          address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
          abi: FundingDistributorAbi,
          functionName: "vesting_owner",
          blockNumber,
        }),
      ]);
      assertSameTeamsAddress(
        vestingFactory,
        TEAMS_MAINNET_DEPLOYMENT.fundingVestingFactory,
        "funding vesting factory"
      );
      assertSameTeamsAddress(
        vestingOwner,
        TEAMS_MAINNET_DEPLOYMENT.fundingVestingOwner,
        "funding vesting owner"
      );
      await assertHasBytecode(
        publicClient,
        TEAMS_MAINNET_DEPLOYMENT.fundingVestingFactory,
        "funding vesting factory",
        blockNumber
      );
    }
    return;
  }

  const [costAmount] = await publicClient.readContract({
    address: TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
    abi: FundingDistributorAbi,
    functionName: "costs",
    args: [
      binding.team,
      BigInt(feedApproval.period),
      binding.token,
    ],
    blockNumber,
  });
  if (binding.requestedAmount > costAmount) {
    throw new TeamsWriteValidationError(
      `Teams funding return exceeds the current aggregate returnable amount for approval ${binding.approvalIdx}.`
    );
  }
}

export async function assertTeamsBonusWriteTarget(
  feed: TeamsFeed,
  publicClient: TeamsWritePublicClient,
  anchor: TeamsCurrentBlockAnchor,
  team: Address,
  preparedAccount: Address
): Promise<void> {
  assertTeamsMainnetDeployment(feed);
  const feedTeam = getSelectedFeedTeam(feed, team);
  const blockNumber = anchor.blockNumber;

  await Promise.all([
    assertHasBytecode(
      publicClient,
      TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
      "team registry",
      blockNumber
    ),
    assertCanonicalTeamProxy(publicClient, team, blockNumber),
    assertHasBytecode(
      publicClient,
      TEAMS_MAINNET_DEPLOYMENT.bonusDistributor,
      "bonus distributor",
      blockNumber
    ),
    assertHasBytecode(
      publicClient,
      TEAMS_MAINNET_DEPLOYMENT.yfi,
      "bonus token",
      blockNumber
    ),
  ]);

  const [
    numTeams,
    indexedTeam,
    currentName,
    currentOwner,
    accountant,
    bonusToken,
    pendingPeriod,
    cursor,
  ] = await Promise.all([
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
        abi: TeamRegistryAbi,
        functionName: "num_teams",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
        abi: TeamRegistryAbi,
        functionName: "teams",
        args: [BigInt(feedTeam.index)],
        blockNumber,
      }),
      publicClient.readContract({
        address: team,
        abi: TeamAbi,
        functionName: "name",
        blockNumber,
      }),
      publicClient.readContract({
        address: team,
        abi: TeamAbi,
        functionName: "owner",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.bonusDistributor,
        abi: BonusDistributorAbi,
        functionName: "accountant",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.bonusDistributor,
        abi: BonusDistributorAbi,
        functionName: "bonus_token",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.bonusDistributor,
        abi: BonusDistributorAbi,
        functionName: "pending_period",
        blockNumber,
      }),
      publicClient.readContract({
        address: TEAMS_MAINNET_DEPLOYMENT.bonusDistributor,
        abi: BonusDistributorAbi,
        functionName: "pending_claims",
        args: [team],
        blockNumber,
      }),
    ]);

  assertSelectedRegistryIndex(feedTeam, numTeams, indexedTeam);
  if (currentName !== feedTeam.name) {
    throw new TeamsWriteValidationError(
      `Teams team ${team} name does not match the current contract.`
    );
  }
  if (!sameAddress(currentOwner, preparedAccount)) {
    throw new TeamsWriteValidationError(
      "Only the current Team owner can claim bonus rewards."
    );
  }
  assertSameTeamsAddress(
    accountant,
    TEAMS_MAINNET_DEPLOYMENT.teamAccountant,
    "bonus distributor accountant"
  );
  await assertHasBytecode(
    publicClient,
    TEAMS_MAINNET_DEPLOYMENT.teamAccountant,
    "team accountant",
    blockNumber
  );
  assertSameTeamsAddress(
    bonusToken,
    TEAMS_MAINNET_DEPLOYMENT.yfi,
    "bonus distributor token"
  );
  if (pendingPeriod < BigInt(feed.bonus.pendingPeriod)) {
    throw new TeamsWriteValidationError(
      "The current bonus pending period regressed behind the trusted snapshot."
    );
  }
  const feedCursor = BigInt(feedTeam.claimCursor.nextBonusPeriod);
  if (cursor < feedCursor) {
    throw new TeamsWriteValidationError(
      `Teams team ${team} bonus cursor regressed behind the trusted snapshot.`
    );
  }
  if (cursor >= pendingPeriod) {
    throw new TeamsWriteValidationError(
      "The selected Team has no current bonus periods to claim."
    );
  }
}

export async function assertTeamsBonusSimulationTarget(
  publicClient: TeamsWritePublicClient,
  anchor: TeamsCurrentBlockAnchor,
  simulationResult: unknown
): Promise<void> {
  if (
    !Array.isArray(simulationResult) ||
    simulationResult.length !== 2 ||
    typeof simulationResult[0] !== "bigint" ||
    typeof simulationResult[1] !== "bigint"
  ) {
    throw new TeamsWriteValidationError(
      "The Teams bonus simulation returned an unexpected result."
    );
  }
  if (simulationResult[1] === 0n) {
    return;
  }

  const ybcRecipient = await publicClient.readContract({
    address: TEAMS_MAINNET_DEPLOYMENT.bonusDistributor,
    abi: BonusDistributorAbi,
    functionName: "ybc_recipient",
    blockNumber: anchor.blockNumber,
  });
  assertSameTeamsAddress(
    ybcRecipient,
    TEAMS_MAINNET_DEPLOYMENT.ybcBonusRecipient,
    "bonus distributor YBC recipient"
  );
  await assertHasBytecode(
    publicClient,
    TEAMS_MAINNET_DEPLOYMENT.ybcBonusRecipient,
    "YBC bonus recipient",
    anchor.blockNumber
  );
}

async function assertProtocolTeam(
  publicClient: TeamsWritePublicClient,
  feedTeam: TeamsFeedTeam,
  blockNumber: bigint,
  options: {
    preparedOwner?: Address | null;
    requireActive: boolean;
    root: "revenue" | "funding";
  }
): Promise<void> {
  const team = getAddress(feedTeam.address);
  await Promise.all([
    assertHasBytecode(
      publicClient,
      TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
      "team registry",
      blockNumber
    ),
    assertCanonicalTeamProxy(publicClient, team, blockNumber),
  ]);

  const [
    numTeams,
    indexedTeam,
    teamRegistry,
    currentName,
  ] = await Promise.all([
    publicClient.readContract({
      address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
      abi: TeamRegistryAbi,
      functionName: "num_teams",
      blockNumber,
    }),
    publicClient.readContract({
      address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
      abi: TeamRegistryAbi,
      functionName: "teams",
      args: [BigInt(feedTeam.index)],
      blockNumber,
    }),
    publicClient.readContract({
      address: team,
      abi: TeamAbi,
      functionName: "registry",
      blockNumber,
    }),
    publicClient.readContract({
      address: team,
      abi: TeamAbi,
      functionName: "name",
      blockNumber,
    }),
  ]);

  assertSelectedRegistryIndex(feedTeam, numTeams, indexedTeam);
  if (options.requireActive) {
    const registered = await publicClient.readContract({
      address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
      abi: TeamRegistryAbi,
      functionName: "is_team",
      args: [team],
      blockNumber,
    });
    if (!registered) {
      throw new TeamsWriteValidationError(
        `Teams write target ${team} is not active in the current registry.`
      );
    }
  }
  assertSameTeamsAddress(
    teamRegistry,
    TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
    `team ${team} registry`
  );
  if (currentName !== feedTeam.name) {
    throw new TeamsWriteValidationError(
      `Teams team ${team} name does not match the current contract.`
    );
  }

  const [currentRoot, expectedRoot, label] =
    options.root === "revenue"
      ? [
          await publicClient.readContract({
            address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
            abi: TeamRegistryAbi,
            functionName: "revenue_recipient",
            blockNumber,
          }),
          TEAMS_MAINNET_DEPLOYMENT.revenueRecipient,
          "registry revenue recipient",
        ]
      : [
          await publicClient.readContract({
            address: TEAMS_MAINNET_DEPLOYMENT.teamRegistry,
            abi: TeamRegistryAbi,
            functionName: "funding_distributor",
            blockNumber,
          }),
          TEAMS_MAINNET_DEPLOYMENT.fundingDistributor,
          "registry funding distributor",
        ];
  assertSameTeamsAddress(currentRoot, expectedRoot, label);
  if (options.preparedOwner) {
    const currentOwner = await publicClient.readContract({
      address: team,
      abi: TeamAbi,
      functionName: "owner",
      blockNumber,
    });
    if (!sameAddress(currentOwner, options.preparedOwner)) {
      throw new TeamsWriteValidationError(
        "Only the current Team owner can claim funding."
      );
    }
  }
}

async function assertCurrentTokenMetadata(
  publicClient: TeamsWritePublicClient,
  token: TeamsFeedToken,
  blockNumber: bigint
): Promise<void> {
  const address = getAddress(token.address);
  await assertHasBytecode(
    publicClient,
    address,
    `token ${address}`,
    blockNumber
  );
  const [symbol, decimals] = await Promise.all([
    publicClient.readContract({
      address,
      abi: erc20Abi,
      functionName: "symbol",
      blockNumber,
    }),
    publicClient.readContract({
      address,
      abi: erc20Abi,
      functionName: "decimals",
      blockNumber,
    }),
  ]);
  if (symbol !== token.symbol) {
    throw new TeamsWriteValidationError(
      `Teams token ${address} symbol does not match the current contract.`
    );
  }
  if (token.name !== null) {
    const name = await publicClient.readContract({
      address,
      abi: erc20Abi,
      functionName: "name",
      blockNumber,
    });
    if (name !== token.name) {
      throw new TeamsWriteValidationError(
        `Teams token ${address} name does not match the current contract.`
      );
    }
  }
  if (decimals !== token.decimals) {
    throw new TeamsWriteValidationError(
      `Teams token ${address} decimals do not match the current contract.`
    );
  }
}

function assertCurrentFundingApproval(
  feedApproval: TeamsFeedFundingApproval,
  binding: TeamsFundingWriteBinding,
  approval: readonly [Address, bigint, Address, bigint, bigint, bigint],
  approvalToken: Address
): void {
  const [
    currentTeam,
    currentPeriod,
    currentToken,
    currentAmount,
    currentDuration,
  ] = approval;
  assertSameTeamsAddress(
    currentTeam,
    binding.team,
    `funding approval ${binding.approvalIdx} team`
  );
  assertSameTeamsAddress(
    currentToken,
    binding.token,
    `funding approval ${binding.approvalIdx} token`
  );
  assertSameTeamsAddress(
    approvalToken,
    binding.token,
    `funding approval ${binding.approvalIdx} token getter`
  );
  assertSameBigint(
    currentPeriod,
    BigInt(feedApproval.period),
    `funding approval ${binding.approvalIdx} period`
  );
  if (binding.action === "claim") {
    assertSameBigint(
      currentAmount,
      BigInt(feedApproval.amount),
      `funding approval ${binding.approvalIdx} amount`
    );
    assertSameBigint(
      currentDuration,
      BigInt(feedApproval.durationSeconds),
      `funding approval ${binding.approvalIdx} duration`
    );
  }
}

function assertSelectedRegistryIndex(
  feedTeam: TeamsFeedTeam,
  numTeams: bigint,
  indexedTeam: Address
): void {
  if (BigInt(feedTeam.index) >= numTeams) {
    throw new TeamsWriteValidationError(
      `Teams feed index ${feedTeam.index} is outside the current registry.`
    );
  }
  assertSameTeamsAddress(
    indexedTeam,
    feedTeam.address,
    `team index ${feedTeam.index}`
  );
}

async function assertHasBytecode(
  publicClient: TeamsWritePublicClient,
  address: Address,
  label: string,
  blockNumber: bigint
): Promise<void> {
  const bytecode = await publicClient.getBytecode({
    address,
    blockNumber,
  });
  if (!bytecode || bytecode === "0x") {
    throw new TeamsWriteValidationError(
      `The current Teams ${label} has no contract bytecode.`
    );
  }
}

async function assertCanonicalTeamProxy(
  publicClient: TeamsWritePublicClient,
  team: Address,
  blockNumber: bigint
): Promise<void> {
  const [proxyBytecode, implementationBytecode] = await Promise.all([
    publicClient.getBytecode({
      address: team,
      blockNumber,
    }),
    publicClient.getBytecode({
      address: TEAMS_MAINNET_DEPLOYMENT.teamImplementation,
      blockNumber,
    }),
  ]);
  if (!proxyBytecode || proxyBytecode === "0x") {
    throw new TeamsWriteValidationError(
      `The current Teams team ${team} has no contract bytecode.`
    );
  }
  const implementation = readEip1167Implementation(proxyBytecode);
  if (!implementation) {
    throw new TeamsWriteValidationError(
      `Teams team ${team} is not the canonical EIP-1167 proxy runtime.`
    );
  }
  if (
    !sameAddress(
      implementation,
      TEAMS_MAINNET_DEPLOYMENT.teamImplementation
    )
  ) {
    throw new TeamsWriteValidationError(
      `Teams team ${team} does not target the audited implementation.`
    );
  }
  if (!implementationBytecode || implementationBytecode === "0x") {
    throw new TeamsWriteValidationError(
      "The audited Teams implementation has no contract bytecode."
    );
  }
}

function readEip1167Implementation(bytecode: Hex): Address | null {
  const normalized = bytecode.toLowerCase();
  const expectedLength =
    EIP_1167_RUNTIME_PREFIX.length +
    40 +
    EIP_1167_RUNTIME_SUFFIX.length;
  if (
    normalized.length !== expectedLength ||
    !normalized.startsWith(EIP_1167_RUNTIME_PREFIX) ||
    !normalized.endsWith(EIP_1167_RUNTIME_SUFFIX)
  ) {
    return null;
  }
  const implementationStart = EIP_1167_RUNTIME_PREFIX.length;
  return getAddress(
    `0x${normalized.slice(implementationStart, implementationStart + 40)}`
  );
}

function getSelectedFeedTeam(feed: TeamsFeed, address: Address): TeamsFeedTeam {
  const team = feed.teams.find((entry) => sameAddress(entry.address, address));
  if (!team) {
    throw new TeamsWriteValidationError(
      `Teams write target ${address} is not present in the trusted feed.`
    );
  }
  return team;
}

function getSelectedFeedToken(
  feed: TeamsFeed,
  address: Address,
  context: "revenue" | "funding"
): TeamsFeedToken {
  const token = Object.values(feed.tokens).find((entry) =>
    sameAddress(entry.address, address)
  );
  if (!token) {
    throw new TeamsWriteValidationError(
      `The selected Teams ${context} token is not present in the trusted feed.`
    );
  }
  return token;
}

function getRequiredFeedOracle(
  token: TeamsFeedToken,
  context: "revenue" | "funding"
): Address {
  if (!token.priceOracle || sameAddress(token.priceOracle, ZERO_ADDRESS)) {
    throw new TeamsWriteValidationError(
      `The selected Teams ${context} token has no trusted oracle binding.`
    );
  }
  return getAddress(token.priceOracle);
}

function getSelectedFeedApproval(
  feed: TeamsFeed,
  binding: TeamsFundingWriteBinding
): TeamsFeedFundingApproval {
  const approval = feed.fundingApprovals.find(
    (entry) =>
      BigInt(entry.id) === binding.approvalIdx &&
      sameAddress(entry.team, binding.team) &&
      sameAddress(entry.token, binding.token)
  );
  if (!approval) {
    throw new TeamsWriteValidationError(
      `Teams funding approval ${binding.approvalIdx} is not present for the selected team and token.`
    );
  }
  return approval;
}

function assertCurrentPeriod(
  currentPeriod: bigint,
  feed: TeamsFeed,
  label: string
): void {
  assertSameBigint(
    currentPeriod,
    BigInt(feed.periods.current),
    `${label} period`
  );
}

function assertSameBigint(
  actual: bigint,
  expected: bigint,
  label: string
): void {
  if (actual !== expected) {
    throw new TeamsWriteValidationError(
      `Teams ${label} does not match current protocol state.`
    );
  }
}

function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}
