import { type Address, type PublicClient, parseAbi, erc20Abi } from "viem";
import { getAccount, writeContract, readContract } from "wagmi/actions";
import { wagmiConfig } from "@/web3/wagmi";
import type { PreparedTransaction } from "@/lib/tx/types";
import type {
  VeyfiAccountState,
  VeyfiGlobalStats,
  LlyfiTokenId,
  LlyfiTokenState,
  LlyfiGlobalInfo,
} from "./types";
import type { VeyfiClient } from "./client";
import {
  VEYFI_ADDRESS,
  VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
  TOTAL_SNAPSHOT_YFI,
  LIQUID_LOCKERS,
  LIQUID_LOCKER_REDEMPTION_ADDRESS,
  STREAM_DURATION,
} from "@/lib/constants";
import { VotingEscrowRewardDistributorAbi } from "@/lib/abis/VotingEscrowRewardDistributor";
import { LiquidLockerDepositorAbi } from "@/lib/abis/LiquidLockerDepositor";
import { LiquidLockerRedemptionAbi } from "@/lib/abis/LiquidLockerRedemption";

const LegacyVeYfiAbi = parseAbi([
  "function locked(address) view returns (int128 amount, uint256 end)",
  "function totalSupply() view returns (uint256)",
] as const);

interface LockInfo {
  amount: bigint;
  boost_epochs: bigint;
  unlock_time: bigint;
}

interface WeightInfo {
  weight: bigint;
  slope: bigint;
}

export class OnchainVeyfiClient implements VeyfiClient {
  constructor(private publicClient: PublicClient) {}

  async getAccountState(address: Address): Promise<VeyfiAccountState> {
    try {
      const [
        legacyLockResult,
        snapshotCheckResult,
        lockInfo,
        lastClaimed,
        currentEpochResult,
      ] = await this.publicClient.multicall({
        contracts: [
          {
            address: VEYFI_ADDRESS,
            abi: LegacyVeYfiAbi,
            functionName: "locked",
            args: [address],
          },
          {
            address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
            abi: VotingEscrowRewardDistributorAbi,
            functionName: "check_lock",
            args: [address],
          },
          {
            address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
            abi: VotingEscrowRewardDistributorAbi,
            functionName: "locks",
            args: [address],
          },
          {
            address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
            abi: VotingEscrowRewardDistributorAbi,
            functionName: "last_claimed",
            args: [address],
          },
          {
            address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
            abi: VotingEscrowRewardDistributorAbi,
            functionName: "epoch",
          },
        ],
        allowFailure: false,
      });

      const currentEpoch = Number(currentEpochResult);
      const boostRaw = 1 + Math.max(0, 104 - currentEpoch) / 104;

      const lockerCalls = LIQUID_LOCKERS.flatMap((locker) => [
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        },
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "balanceOf",
          args: [address],
        },
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "streams",
          args: [address],
        },
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "maxWithdraw",
          args: [address],
        },
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, locker.depositor],
        },
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, LIQUID_LOCKER_REDEMPTION_ADDRESS],
        },
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "totalSupply",
        },
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "totalAssets",
        },
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "capacity",
        },
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "totalSupply",
        },
      ]);

      const redemptionCalls = [
        {
          address: LIQUID_LOCKER_REDEMPTION_ADDRESS,
          abi: LiquidLockerRedemptionAbi,
          functionName: "fee",
        },
        {
          address: "0xD4c188F035793EEcaa53808Cc067099100b653Ba" as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [LIQUID_LOCKER_REDEMPTION_ADDRESS],
        },
      ];

      const lockerRedemptionCalls = LIQUID_LOCKERS.flatMap((locker) => [
        {
          address: LIQUID_LOCKER_REDEMPTION_ADDRESS,
          abi: LiquidLockerRedemptionAbi,
          functionName: "capacities",
          args: [BigInt(locker.index)],
        },
        {
          address: LIQUID_LOCKER_REDEMPTION_ADDRESS,
          abi: LiquidLockerRedemptionAbi,
          functionName: "used",
          args: [BigInt(locker.index)],
        },
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [LIQUID_LOCKER_REDEMPTION_ADDRESS],
        },
      ]);

      const results = await this.publicClient.multicall({
        contracts: [
          ...lockerCalls,
          ...redemptionCalls,
          ...lockerRedemptionCalls,
        ],
        allowFailure: false,
      });

      const legacyAmount = BigInt(legacyLockResult[0] as bigint);
      const snapshotAmount = (lockInfo as LockInfo).amount;
      const snapshotUnlockTime = (lockInfo as LockInfo).unlock_time;
      const isMigrated = (lastClaimed as bigint) > 0n;
      const snapshotValidAmount = (snapshotCheckResult as [bigint, bigint])[0];
      const isEligible =
        !isMigrated && snapshotAmount > 0n && snapshotValidAmount > 0n;

      const llyfiTokens: LlyfiTokenState[] = [];
      const PER_LOCKER_READS = 10;

      const redemptionStart = LIQUID_LOCKERS.length * PER_LOCKER_READS;
      const redemptionGlobalFee = results[redemptionStart] as bigint;
      const redemptionGlobalYfi = results[redemptionStart + 1] as bigint;
      const redemptionLockerStart = redemptionStart + 2;
      const PER_LOCKER_REDEMPTION_READS = 3;

      for (let i = 0; i < LIQUID_LOCKERS.length; i++) {
        const config = LIQUID_LOCKERS[i];
        const base = i * PER_LOCKER_READS;
        const redBase = redemptionLockerStart + i * PER_LOCKER_REDEMPTION_READS;

        const walletBalance = results[base] as bigint;
        const stakedBalanceShares = results[base + 1] as bigint;
        const streamData = results[base + 2] as unknown as [
          bigint,
          bigint,
          bigint
        ];
        const maxWithdrawAssets = results[base + 3] as bigint;
        const allowanceDepositor = results[base + 4] as bigint;
        const allowanceRedemption = results[base + 5] as bigint;
        const totalSupplyToken = results[base + 6] as bigint;
        const stakedAssets = results[base + 7] as bigint;
        const depositorCapacity = results[base + 8] as bigint;
        const depositorTotalSupply = results[base + 9] as bigint;

        const capacityRedemption = results[redBase] as bigint;
        const usedRedemption = results[redBase + 1] as bigint;
        const inventoryRedemption = results[redBase + 2] as bigint;

        const [start, totalShares, claimedShares] = streamData;
        const remainingShares = totalShares - claimedShares;

        const stakedBalanceAssets = stakedBalanceShares * config.scale;
        const remainingAssets = remainingShares * config.scale;
        const totalStreamAssets = totalShares * config.scale;

        const cooldown =
          remainingShares > 0n
            ? {
                amount: remainingAssets,
                endsAt: Number(start) + STREAM_DURATION,
                totalAmount: totalStreamAssets,
              }
            : null;

        const lockedYfi = totalSupplyToken / config.scale;

        llyfiTokens.push({
          symbol: config.symbol as LlyfiTokenId,
          name: config.name,
          address: config.token,
          depositorAddress: config.depositor,
          walletBalance,
          stakedBalance: stakedBalanceAssets,
          cooldownBalance: remainingAssets,
          withdrawable: maxWithdrawAssets,
          cooldown,
          allowance: allowanceDepositor,
          redemptionAllowance: allowanceRedemption,
          lockedYfi,
          veyfiBoost: boostRaw,
          totalSupply: totalSupplyToken,
          stakedAssets,
          depositorTotalSupply,
          depositorCapacity,
          exchangeRate: config.scale,
          redemption: {
            capacity: capacityRedemption,
            used: usedRedemption,
            inventory: inventoryRedemption,
            fee: redemptionGlobalFee,
          },
        });
      }

      return {
        address,
        veYfi: {
          legacyBalance: legacyAmount,
          lockedAmount: isMigrated ? snapshotAmount : 0n,
          migrationEligible: isEligible,
          migrated: isMigrated,
          unlockTime: Number(snapshotUnlockTime),
        },
        llyfiTokens,
        inventory: {
          availableYfi: redemptionGlobalYfi,
          feeBps: Number(redemptionGlobalFee) / 10 ** 14,
        },
      };
    } catch (error) {
      console.error("Error fetching veYFI account state:", error);
      return {
        address,
        veYfi: null,
        llyfiTokens: [],
        inventory: { availableYfi: 0n, feeBps: 0 },
      };
    }
  }

  async getGlobalStats(): Promise<VeyfiGlobalStats> {
    try {
      const currentEpoch = await this.publicClient.readContract({
        address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
        abi: VotingEscrowRewardDistributorAbi,
        functionName: "epoch",
      });

      const calls = [
        {
          address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
          abi: VotingEscrowRewardDistributorAbi,
          functionName: "total_weights",
          args: [currentEpoch],
        },
        {
          address: LIQUID_LOCKER_REDEMPTION_ADDRESS,
          abi: LiquidLockerRedemptionAbi,
          functionName: "fee",
        },
        {
          address: "0xD4c188F035793EEcaa53808Cc067099100b653Ba" as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [LIQUID_LOCKER_REDEMPTION_ADDRESS],
        },
        ...LIQUID_LOCKERS.flatMap((locker) => [
          {
            address: locker.depositor,
            abi: LiquidLockerDepositorAbi,
            functionName: "totalSupply",
          },
          {
            address: locker.depositor,
            abi: LiquidLockerDepositorAbi,
            functionName: "capacity",
          },
        ]),
        ...LIQUID_LOCKERS.flatMap((locker) => [
          {
            address: LIQUID_LOCKER_REDEMPTION_ADDRESS,
            abi: LiquidLockerRedemptionAbi,
            functionName: "capacities",
            args: [BigInt(locker.index)],
          },
          {
            address: LIQUID_LOCKER_REDEMPTION_ADDRESS,
            abi: LiquidLockerRedemptionAbi,
            functionName: "used",
            args: [BigInt(locker.index)],
          },
          {
            address: locker.token,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [LIQUID_LOCKER_REDEMPTION_ADDRESS],
          },
        ]),
      ];

      const results = await this.publicClient.multicall({
        contracts: calls,
        allowFailure: false,
      });

      const totalWeightResult = results[0] as unknown as WeightInfo;
      const migratedUnderlyingApprox = totalWeightResult.slope * 104n;

      const fee = results[1] as bigint;
      const globalYfi = results[2] as bigint;

      let totalStakedYfiEq = 0n;
      let totalCapacityYfiEq = 0n;

      const lockerStatsStart = 3;
      const redemptionStatsStart = lockerStatsStart + LIQUID_LOCKERS.length * 2;

      for (let i = 0; i < LIQUID_LOCKERS.length; i++) {
        const base = lockerStatsStart + i * 2;
        const supplyShares = results[base] as bigint;
        const capacityShares = results[base + 1] as bigint;

        totalStakedYfiEq += supplyShares;
        totalCapacityYfiEq += capacityShares;
      }

      const totalLlyfiStakedPercent =
        totalCapacityYfiEq > 0n
          ? Number((totalStakedYfiEq * 10000n) / totalCapacityYfiEq) / 10000
          : 0;

      const tokens: LlyfiGlobalInfo[] = [];
      for (let i = 0; i < LIQUID_LOCKERS.length; i++) {
        const config = LIQUID_LOCKERS[i];
        const redBase = redemptionStatsStart + i * 3;

        const capacity = results[redBase] as bigint;
        const used = results[redBase + 1] as bigint;
        const inventory = results[redBase + 2] as bigint;

        tokens.push({
          symbol: config.symbol as LlyfiTokenId,
          name: config.name,
          address: config.token,
          redemption: {
            capacity,
            used,
            inventory,
            fee,
          },
        });
      }

      const maxBoostMultiplier =
        1 + Math.max(0, 104 - Number(currentEpoch)) / 104;

      return {
        migratedYfi: migratedUnderlyingApprox,
        legacyYfiSupply: TOTAL_SNAPSHOT_YFI,
        maxBoostMultiplier,
        totalLlyfiStakedPercent,
        inventory: {
          availableYfi: globalYfi,
          feeBps: Number(fee) / 10 ** 14,
        },
        tokens,
      };
    } catch (e) {
      console.error("Failed to fetch veYFI global stats:", e);
      return {
        migratedYfi: 0n,
        legacyYfiSupply: 0n,
        maxBoostMultiplier: 0,
        totalLlyfiStakedPercent: 0,
        inventory: { availableYfi: 0n, feeBps: 0 },
        tokens: [],
      };
    }
  }

  async prepareMigrateVeYfi(): Promise<PreparedTransaction> {
    return async () => {
      const { address } = getAccount(wagmiConfig);
      if (!address) throw new Error("No account connected");

      return writeContract(wagmiConfig, {
        address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
        abi: VotingEscrowRewardDistributorAbi,
        functionName: "migrate",
      });
    };
  }

  private getLockerConfig(symbol: LlyfiTokenId) {
    const config = LIQUID_LOCKERS.find((l) => l.symbol === symbol);
    if (!config) throw new Error(`Unknown LLYFI token: ${symbol}`);
    return config;
  }

  async prepareStakeLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    return async () => {
      const config = this.getLockerConfig(symbol);
      const { address } = getAccount(wagmiConfig);
      if (!address) throw new Error("No account connected");

      return writeContract(wagmiConfig, {
        address: config.depositor,
        abi: LiquidLockerDepositorAbi,
        functionName: "deposit",
        args: [amount, address],
      });
    };
  }

  async prepareStartCooldownLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    return async () => {
      const config = this.getLockerConfig(symbol);
      const shares = amount / config.scale;

      return writeContract(wagmiConfig, {
        address: config.depositor,
        abi: LiquidLockerDepositorAbi,
        functionName: "unstake",
        args: [shares],
      });
    };
  }

  async prepareWithdrawLlyfi(
    symbol: LlyfiTokenId
  ): Promise<PreparedTransaction> {
    return async () => {
      const config = this.getLockerConfig(symbol);
      const { address } = getAccount(wagmiConfig);
      if (!address) throw new Error("No account connected");

      const maxAssets = await readContract(wagmiConfig, {
        address: config.depositor,
        abi: LiquidLockerDepositorAbi,
        functionName: "maxWithdraw",
        args: [address],
      });

      if (maxAssets === 0n) throw new Error("Nothing to withdraw");

      return writeContract(wagmiConfig, {
        address: config.depositor,
        abi: LiquidLockerDepositorAbi,
        functionName: "withdraw",
        args: [maxAssets, address, address],
      });
    };
  }

  async prepareRedeemLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    return async () => {
      const config = this.getLockerConfig(symbol);
      return writeContract(wagmiConfig, {
        address: LIQUID_LOCKER_REDEMPTION_ADDRESS,
        abi: LiquidLockerRedemptionAbi,
        functionName: "redeem",
        args: [BigInt(config.index), amount],
      });
    };
  }

  async prepareMintLlyfi(
    symbol: LlyfiTokenId,
    amount: bigint
  ): Promise<PreparedTransaction> {
    return async () => {
      const config = this.getLockerConfig(symbol);
      return writeContract(wagmiConfig, {
        address: LIQUID_LOCKER_REDEMPTION_ADDRESS,
        abi: LiquidLockerRedemptionAbi,
        functionName: "exchange",
        args: [BigInt(config.index), amount],
      });
    };
  }
}
