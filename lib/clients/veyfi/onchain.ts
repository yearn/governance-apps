import { type Address, type PublicClient, parseAbi, erc20Abi } from "viem";
import { getAccount, writeContract, readContract } from "wagmi/actions";
import { wagmiConfig } from "@/web3/wagmi";
import type { PreparedTransaction } from "@/lib/tx/types";
import type {
  VeyfiAccountState,
  VeyfiGlobalStats,
  LlyfiTokenId,
  LlyfiTokenState,
} from "./types";
import type { VeyfiClient } from "./client";
import {
  VEYFI_ADDRESS,
  VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
  TOTAL_SNAPSHOT_YFI,
  LIQUID_LOCKERS,
  LIQUID_LOCKER_REDEMPTION_ADDRESS,
  GENESIS,
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

const STREAM_DURATION = 14 * 24 * 60 * 60;
const EPOCH_LENGTH = 14 * 24 * 60 * 60;

export class OnchainVeyfiClient implements VeyfiClient {
  constructor(private publicClient: PublicClient) {}

  async getAccountState(address: Address): Promise<VeyfiAccountState> {
    try {
      // 1. Calculate Current Boost (Algorithmic)
      const now = Math.floor(Date.now() / 1000);
      const genesisTime = Number(GENESIS);
      const timeSinceGenesis = Math.max(0, now - genesisTime);
      const currentEpoch = Math.floor(timeSinceGenesis / EPOCH_LENGTH);
      // Boost formula: 1 + (104 - epoch) / 104
      // Clamped to 1.0x minimum
      const boostRaw = 1 + Math.max(0, 104 - currentEpoch) / 104;

      // 2. Fetch Legacy veYFI & Migration State
      const [legacyLockResult, snapshotCheckResult, lockInfo, lastClaimed] =
        await this.publicClient.multicall({
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
          ],
          allowFailure: false,
        });

      // 3. Fetch LLYFI Token Data
      // IMPORTANT: Keep PER_LOCKER_READS in sync with the number of calls here (10)
      const lockerCalls = LIQUID_LOCKERS.flatMap((locker) => [
        // 0: Wallet Balance
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [address],
        },
        // 1: Staked Balance (Shares)
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "balanceOf",
          args: [address],
        },
        // 2: Cooldown Stream
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "streams",
          args: [address],
        },
        // 3: Max Withdraw (Assets)
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "maxWithdraw",
          args: [address],
        },
        // 4: Allowance Depositor
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, locker.depositor],
        },
        // 5: Allowance Redemption
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, LIQUID_LOCKER_REDEMPTION_ADDRESS],
        },
        // 6: Token Total Supply
        {
          address: locker.token,
          abi: erc20Abi,
          functionName: "totalSupply",
        },
        // 7: Depositor Total Assets (LL Tokens held)
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "totalAssets",
        },
        // 8: Depositor Capacity (Shares)
        {
          address: locker.depositor,
          abi: LiquidLockerDepositorAbi,
          functionName: "capacity",
        },
        // 9: Depositor Total Supply (Shares)
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

      // --- Parsing ---
      const legacyAmount = BigInt(legacyLockResult[0] as bigint);
      const snapshotAmount = (lockInfo as LockInfo).amount;
      const snapshotUnlockTime = (lockInfo as LockInfo).unlock_time;
      const isMigrated = (lastClaimed as bigint) > 0n;
      const snapshotValidAmount = (snapshotCheckResult as [bigint, bigint])[0];
      const isEligible =
        !isMigrated && snapshotAmount > 0n && snapshotValidAmount > 0n;

      const llyfiTokens: LlyfiTokenState[] = [];
      const PER_LOCKER_READS = 10; // Must match lockerCalls length

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

        // Fix: Double cast to satisfy TypeScript tuple requirements
        const streamData = results[base + 2] as unknown as [
          bigint,
          bigint,
          bigint
        ];

        const maxWithdrawAssets = results[base + 3] as bigint;
        const allowanceDepositor = results[base + 4] as bigint;
        const allowanceRedemption = results[base + 5] as bigint;
        const totalSupplyToken = results[base + 6] as bigint;
        const stakedAssets = results[base + 7] as bigint; // Total Assets in Depositor
        const depositorCapacity = results[base + 8] as bigint; // Max Shares
        const depositorTotalSupply = results[base + 9] as bigint; // Current Shares

        const capacityRedemption = results[redBase] as bigint;
        const usedRedemption = results[redBase + 1] as bigint;
        const inventoryRedemption = results[redBase + 2] as bigint;

        const [start, totalShares, claimedShares] = streamData;
        const remainingShares = totalShares - claimedShares;

        // Normalize Shares -> Assets
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

        // Locked YFI approx = Token Total Supply / Scale
        const scale = config.scale || 1n;
        const lockedYfi = totalSupplyToken / scale;

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
      // 1. Get Epoch
      const currentEpoch = await this.publicClient.readContract({
        address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
        abi: VotingEscrowRewardDistributorAbi,
        functionName: "epoch",
      });

      // 2. Prepare calls for Total Weights (Migrated) and Locker Stats (Staked %)
      // We read TotalSupply (Shares) and Capacity (Shares) for each locker
      const calls = [
        // Total Weights
        {
          address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
          abi: VotingEscrowRewardDistributorAbi,
          functionName: "total_weights",
          args: [currentEpoch],
        },
        // Locker Stats (totalSupply, capacity) x 3
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
      ];

      const results = await this.publicClient.multicall({
        contracts: calls,
        allowFailure: false,
      });

      // 3. Process Migrated YFI
      // Fix: Double cast to handle multicall return type
      const totalWeightResult = results[0] as unknown as WeightInfo;
      const migratedUnderlyingApprox = totalWeightResult.slope * 104n;

      // 4. Process Locker Staked % (Global Ratio)
      // Weighted average of filled capacity across all lockers (normalized to YFI)
      let totalStakedYfiEq = 0n;
      let totalCapacityYfiEq = 0n;

      // Results start at index 1. Each locker has 2 calls.
      for (let i = 0; i < LIQUID_LOCKERS.length; i++) {
        const base = 1 + i * 2;
        // totalSupply is SHARES (YFI Equivalent)
        const supplyShares = results[base] as bigint;
        // capacity is SHARES (YFI Equivalent)
        const capacityShares = results[base + 1] as bigint;

        // FIX: Sum Shares directly (YFI equivalents), do NOT multiply by scale.
        // This ensures 1 YFI worth of upYFI is weighted the same as 1 YFI worth of sdYFI.
        totalStakedYfiEq += supplyShares;
        totalCapacityYfiEq += capacityShares;
      }

      const totalLlyfiStakedPercent =
        totalCapacityYfiEq > 0n
          ? Number((totalStakedYfiEq * 10000n) / totalCapacityYfiEq) / 10000
          : 0;

      // 5. Calculate Boost
      const maxBoostMultiplier =
        1 + Math.max(0, 104 - Number(currentEpoch)) / 104;

      return {
        migratedYfi: migratedUnderlyingApprox,
        legacyYfiSupply: TOTAL_SNAPSHOT_YFI,
        maxBoostMultiplier,
        totalLlyfiStakedPercent,
      };
    } catch (e) {
      console.error("Failed to fetch veYFI global stats:", e);
      return {
        migratedYfi: 0n,
        legacyYfiSupply: 0n,
        maxBoostMultiplier: 0,
        totalLlyfiStakedPercent: 0,
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

      // Deposit into the Depositor contract
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
