import { vi } from "vitest";
import {
  getAddress,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import {
  TEAMS_MAINNET_DEPLOYMENT,
  type TeamsWritePublicClient,
} from "@/lib/clients/teams";
import type { TeamsFeed } from "@/lib/schemas/teams-feed";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const TEAMS_CURRENT_BLOCK = 25_300_000n;
export const TEAMS_CURRENT_BLOCK_HASH =
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" as Hash;
export const TEAMS_CANONICAL_TEAM_RUNTIME =
  "0x363d3d373d3d3d363d73a59b34c87f97bdf95ab3e532fd9b7d1fcd23bf435af43d82803e903d91602b57fd5bf3" as Hex;

export type TeamsCurrentReadOverrides = {
  blockHash?: Hash;
  blockTimestamp?: bigint;
  bonusAccountant?: string;
  bonusCursor?: bigint;
  bonusPendingPeriod?: bigint;
  bonusToken?: string;
  bonusYbcRecipient?: string;
  chainMetadataId?: number | null;
  claimable?: bigint;
  cost?: readonly [bigint, bigint];
  fundingAccountant?: string;
  fundingOracle?: string;
  fundingPeriod?: bigint;
  fundingRegistry?: string;
  fundingVestingFactory?: string;
  fundingVestingOwner?: string;
  indexedTeam?: string;
  latestBlocks?: readonly {
    number: bigint;
    hash: Hash;
    timestamp?: bigint;
  }[];
  numApprovals?: bigint;
  recheckBlockHash?: Hash;
  recheckBlockHashes?: readonly Hash[];
  registered?: boolean;
  revenueAccountant?: string;
  revenueConverter?: string;
  revenueKilled?: boolean;
  revenueOracle?: string;
  revenuePeriod?: bigint;
  revenueRegistry?: string;
  rpcChainId?: number;
  teamName?: string;
  teamOwner?: string;
  teamImplementationBytecode?: Hex;
  teamProxyBytecode?: Hex;
  teamRegistry?: string;
  tokenDecimals?: number;
  tokenName?: string;
  tokenSymbol?: string;
  approval?: readonly [Address, bigint, Address, bigint, bigint, bigint];
  approvalToken?: string;
  registryFundingDistributor?: string;
  registryImplementation?: string;
  registryRevenueRecipient?: string;
  withoutCode?: string;
};

export function createTeamsWritePublicClient(
  feed: TeamsFeed,
  overrides: TeamsCurrentReadOverrides = {}
) {
  const blockHash = overrides.blockHash ?? TEAMS_CURRENT_BLOCK_HASH;
  const getChainId = vi
    .fn()
    .mockResolvedValue(overrides.rpcChainId ?? MAINNET_CHAIN_ID);
  let blockRecheckIndex = 0;
  let latestBlockIndex = 0;
  const observedBlockHashes = new Map<bigint, Hash>();
  const observedBlockTimestamps = new Map<bigint, bigint>();
  const getBlock = vi.fn(
    async ({
      blockNumber,
    }: {
      blockNumber?: bigint;
      blockTag?: "latest";
    }) => {
      const defaultTimestamp =
        overrides.blockTimestamp ?? BigInt(feed.generatedAt);
      if (blockNumber === undefined) {
        const configuredBlocks =
          overrides.latestBlocks && overrides.latestBlocks.length > 0
            ? overrides.latestBlocks
            : null;
        const latest =
          configuredBlocks?.[
            Math.min(latestBlockIndex++, configuredBlocks.length - 1)
          ];
        const number = latest?.number ?? TEAMS_CURRENT_BLOCK;
        const hash = latest?.hash ?? blockHash;
        const timestamp = latest?.timestamp ?? defaultTimestamp;
        observedBlockHashes.set(number, hash);
        observedBlockTimestamps.set(number, timestamp);
        return { number, hash, timestamp };
      }

      return {
        number: blockNumber,
        hash:
          overrides.recheckBlockHashes?.[blockRecheckIndex++] ??
          overrides.recheckBlockHash ??
          observedBlockHashes.get(blockNumber) ??
          blockHash,
        timestamp:
          observedBlockTimestamps.get(blockNumber) ?? defaultTimestamp,
      };
    }
  );
  const withoutCode = overrides.withoutCode?.toLowerCase() ?? null;
  const getBytecode = vi.fn(
    async ({ address }: { address: Address; blockNumber?: bigint }) => {
      const normalizedAddress = address.toLowerCase();
      if (normalizedAddress === withoutCode) {
        return "0x";
      }
      if (
        feed.teams.some(
          (team) => team.address.toLowerCase() === normalizedAddress
        )
      ) {
        return (
          overrides.teamProxyBytecode ??
          TEAMS_CANONICAL_TEAM_RUNTIME
        );
      }
      if (
        normalizedAddress ===
        TEAMS_MAINNET_DEPLOYMENT.teamImplementation.toLowerCase()
      ) {
        return overrides.teamImplementationBytecode ?? "0x6000";
      }
      return "0x6000";
    }
  );
  const readContract = vi.fn(
    async ({
      address,
      functionName,
      args = [],
    }: {
      address: Address;
      functionName: string;
      args?: readonly unknown[];
      blockNumber?: bigint;
    }) => {
      const normalizedAddress = address.toLowerCase();
      const registry = TEAMS_MAINNET_DEPLOYMENT.teamRegistry.toLowerCase();
      const revenueRecipient =
        TEAMS_MAINNET_DEPLOYMENT.revenueRecipient.toLowerCase();
      const fundingDistributor =
        TEAMS_MAINNET_DEPLOYMENT.fundingDistributor.toLowerCase();
      const bonusDistributor =
        TEAMS_MAINNET_DEPLOYMENT.bonusDistributor.toLowerCase();

      if (normalizedAddress === registry) {
        if (functionName === "num_teams") {
          return BigInt(
            Math.max(0, ...feed.teams.map((team) => team.index + 1))
          );
        }
        if (functionName === "teams") {
          const team = feed.teams.find(
            (entry) => entry.index === Number(args[0])
          );
          return overrides.indexedTeam ?? team?.address ?? ZERO_ADDRESS;
        }
        if (functionName === "is_team") {
          return overrides.registered ?? true;
        }
        if (functionName === "implementation") {
          return (
            overrides.registryImplementation ??
            TEAMS_MAINNET_DEPLOYMENT.teamImplementation
          );
        }
        if (functionName === "revenue_recipient") {
          return (
            overrides.registryRevenueRecipient ??
            TEAMS_MAINNET_DEPLOYMENT.revenueRecipient
          );
        }
        if (functionName === "funding_distributor") {
          return (
            overrides.registryFundingDistributor ??
            TEAMS_MAINNET_DEPLOYMENT.fundingDistributor
          );
        }
      }

      const team = feed.teams.find(
        (entry) => entry.address.toLowerCase() === normalizedAddress
      );
      if (team) {
        if (functionName === "name") {
          return overrides.teamName ?? team.name;
        }
        if (functionName === "owner") {
          return overrides.teamOwner ?? team.owner;
        }
        if (functionName === "registry") {
          return (
            overrides.teamRegistry ??
            TEAMS_MAINNET_DEPLOYMENT.teamRegistry
          );
        }
      }

      const token = Object.values(feed.tokens).find(
        (entry) => entry.address.toLowerCase() === normalizedAddress
      );
      if (token) {
        if (functionName === "symbol") {
          return overrides.tokenSymbol ?? token.symbol;
        }
        if (functionName === "name") {
          return overrides.tokenName ?? token.name ?? "";
        }
        if (functionName === "decimals") {
          return overrides.tokenDecimals ?? token.decimals;
        }
      }

      if (normalizedAddress === revenueRecipient) {
        if (functionName === "accountant") {
          return (
            overrides.revenueAccountant ??
            TEAMS_MAINNET_DEPLOYMENT.teamAccountant
          );
        }
        if (functionName === "registry") {
          return (
            overrides.revenueRegistry ??
            TEAMS_MAINNET_DEPLOYMENT.teamRegistry
          );
        }
        if (functionName === "killed") {
          return overrides.revenueKilled ?? false;
        }
        if (functionName === "period") {
          return overrides.revenuePeriod ?? BigInt(feed.periods.current);
        }
        if (functionName === "oracles") {
          const selectedToken = getFeedToken(feed, String(args[0]));
          return (
            overrides.revenueOracle ??
            selectedToken?.priceOracle ??
            ZERO_ADDRESS
          );
        }
        if (functionName === "converters") {
          const selectedToken = getFeedToken(feed, String(args[0]));
          return (
            overrides.revenueConverter ??
            selectedToken?.converter ??
            ZERO_ADDRESS
          );
        }
      }

      if (normalizedAddress === fundingDistributor) {
        if (functionName === "accountant") {
          return (
            overrides.fundingAccountant ??
            TEAMS_MAINNET_DEPLOYMENT.teamAccountant
          );
        }
        if (functionName === "vesting_factory") {
          return (
            overrides.fundingVestingFactory ??
            TEAMS_MAINNET_DEPLOYMENT.fundingVestingFactory
          );
        }
        if (functionName === "vesting_owner") {
          return (
            overrides.fundingVestingOwner ??
            TEAMS_MAINNET_DEPLOYMENT.fundingVestingOwner
          );
        }
        if (functionName === "registry") {
          return (
            overrides.fundingRegistry ??
            TEAMS_MAINNET_DEPLOYMENT.teamRegistry
          );
        }
        if (functionName === "period") {
          return overrides.fundingPeriod ?? BigInt(feed.periods.current);
        }
        if (functionName === "num_approvals") {
          return (
            overrides.numApprovals ??
            BigInt(
              Math.max(
                0,
                ...feed.fundingApprovals.map((approval) => approval.id + 1)
              )
            )
          );
        }
        if (functionName === "oracles") {
          const selectedToken = getFeedToken(feed, String(args[0]));
          return (
            overrides.fundingOracle ??
            selectedToken?.priceOracle ??
            ZERO_ADDRESS
          );
        }
        if (functionName === "costs") {
          return overrides.cost ?? getFundingCost(feed, args);
        }

        const approval = feed.fundingApprovals.find(
          (entry) => entry.id === Number(args[0])
        );
        if (!approval) {
          throw new Error(
            `Unexpected funding approval read: ${String(args[0])}.`
          );
        }
        if (functionName === "approvals") {
          return (
            overrides.approval ??
            ([
              getAddress(approval.team),
              BigInt(approval.period),
              getAddress(approval.token),
              BigInt(approval.amount),
              BigInt(approval.durationSeconds),
              BigInt(approval.used),
            ] as const)
          );
        }
        if (functionName === "token") {
          return overrides.approvalToken ?? approval.token;
        }
        if (functionName === "claimable") {
          return overrides.claimable ?? BigInt(approval.claimable);
        }
      }

      if (normalizedAddress === bonusDistributor) {
        if (functionName === "accountant") {
          return (
            overrides.bonusAccountant ??
            TEAMS_MAINNET_DEPLOYMENT.teamAccountant
          );
        }
        if (functionName === "ybc_recipient") {
          return (
            overrides.bonusYbcRecipient ??
            TEAMS_MAINNET_DEPLOYMENT.ybcBonusRecipient
          );
        }
        if (functionName === "bonus_token") {
          return overrides.bonusToken ?? TEAMS_MAINNET_DEPLOYMENT.yfi;
        }
        if (functionName === "pending_period") {
          return (
            overrides.bonusPendingPeriod ??
            BigInt(feed.bonus.pendingPeriod)
          );
        }
        if (functionName === "pending_claims") {
          const selectedTeam = feed.teams.find(
            (entry) =>
              entry.address.toLowerCase() === String(args[0]).toLowerCase()
          );
          return (
            overrides.bonusCursor ??
            BigInt(selectedTeam?.claimCursor.nextBonusPeriod ?? 0)
          );
        }
      }

      throw new Error(
        `Unexpected Teams read ${functionName} at ${address}.`
      );
    }
  );

  return {
    chain:
      overrides.chainMetadataId === null
        ? undefined
        : {
            id:
              overrides.chainMetadataId ??
              MAINNET_CHAIN_ID,
          },
    getBlock,
    getBytecode,
    getChainId,
    readContract,
  } as unknown as TeamsWritePublicClient & {
    getBlock: typeof getBlock;
    getBytecode: typeof getBytecode;
    getChainId: typeof getChainId;
    readContract: typeof readContract;
  };
}

function getFeedToken(feed: TeamsFeed, address: string) {
  return Object.values(feed.tokens).find(
    (token) => token.address.toLowerCase() === address.toLowerCase()
  );
}

function getFundingCost(
  feed: TeamsFeed,
  args: readonly unknown[]
): readonly [bigint, bigint] {
  const [team, period, token] = args;
  const matching = feed.fundingApprovals.filter(
    (approval) =>
      approval.team.toLowerCase() === String(team).toLowerCase() &&
      approval.period === Number(period) &&
      approval.token.toLowerCase() === String(token).toLowerCase()
  );
  const claimedRaw = matching.reduce(
    (total, approval) =>
      total +
      approval.claims.reduce(
        (sum, claim) => sum + BigInt(claim.amount),
        0n
      ),
    0n
  );
  const returnedRaw = matching.reduce(
    (total, approval) =>
      total +
      approval.returns.reduce(
        (sum, entry) => sum + BigInt(entry.amount),
        0n
      ),
    0n
  );
  const price =
    matching.find((approval) => approval.averageCostPriceUsd !== null)
      ?.averageCostPriceUsd ?? "0";
  return [
    claimedRaw > returnedRaw ? claimedRaw - returnedRaw : 0n,
    BigInt(price),
  ];
}
