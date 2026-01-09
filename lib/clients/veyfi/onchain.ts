import { type Address, type PublicClient, parseAbi } from "viem";
import { getAccount, writeContract } from "wagmi/actions";
import { wagmiConfig } from "@/web3/wagmi";
import type { PreparedTransaction } from "@/lib/tx/types";
import type {
  VeyfiAccountState,
  VeyfiGlobalStats,
  LlyfiTokenId,
} from "./types";
import type { VeyfiClient } from "./client";
import {
  VEYFI_ADDRESS,
  VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
  TOTAL_SNAPSHOT_YFI,
} from "@/lib/constants";
import { VotingEscrowRewardDistributorAbi } from "@/lib/abis/VotingEscrowRewardDistributor";

// Minimal ABI for Legacy veYFI (Vyper 0.2.x/0.3.x style)
const LegacyVeYfiAbi = parseAbi([
  "function locked(address) view returns (int128 amount, uint256 end)",
  "function totalSupply() view returns (uint256)",
] as const);

// Explicit types for the structs returned by the new contracts
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
    console.log(
      "Fetching veYFI Account State from Chain ID:",
      this.publicClient.chain?.id
    );

    try {
      // Parallel Reads for veYFI Migration State
      const [
        legacyLockResult, // Returns [bigint, bigint]
        snapshotCheckResult, // Returns [bigint, bigint]
        lockInfo, // Returns Struct Object
        lastClaimed, // Returns bigint
      ] = await Promise.all([
        // 1. Legacy veYFI State
        this.publicClient.readContract({
          address: VEYFI_ADDRESS,
          abi: LegacyVeYfiAbi,
          functionName: "locked",
          args: [address],
        }),
        // 2. Snapshot Validity Check (Active legacy lock?)
        this.publicClient.readContract({
          address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
          abi: VotingEscrowRewardDistributorAbi,
          functionName: "check_lock",
          args: [address],
        }),
        // 3. Snapshot Data (Is user seeded?)
        this.publicClient.readContract({
          address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
          abi: VotingEscrowRewardDistributorAbi,
          functionName: "locks",
          args: [address],
        }) as Promise<LockInfo>,
        // 4. Migration Status (Has migrated?)
        this.publicClient.readContract({
          address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
          abi: VotingEscrowRewardDistributorAbi,
          functionName: "last_claimed",
          args: [address],
        }),
      ]);

      // Parse Legacy Lock (Legacy ABI returns array)
      const legacyAmount = BigInt(legacyLockResult[0]);

      // Parse Snapshot/Migration (New ABI returns Object)
      const snapshotAmount = lockInfo.amount;
      const snapshotUnlockTime = lockInfo.unlock_time;

      const isMigrated = lastClaimed > 0n;
      // Eligible if:
      // 1. Not yet migrated
      // 2. Has a snapshot seed (amount > 0)
      // 3. The underlying legacy lock is still valid (check_lock returns > 0)
      const snapshotValidAmount = snapshotCheckResult[0];
      const isEligible =
        !isMigrated && snapshotAmount > 0n && snapshotValidAmount > 0n;

      return {
        address,
        veYfi: {
          legacyBalance: legacyAmount,
          lockedAmount: isMigrated ? snapshotAmount : 0n,
          migrationEligible: isEligible,
          migrated: isMigrated,
          unlockTime: Number(snapshotUnlockTime),
        },
        // LLYFI Support is currently stubbed until contracts are deployed/configured
        llyfiTokens: [],
        inventory: {
          availableYfi: 0n,
          feeBps: 0,
        },
      };
    } catch (error) {
      console.error("Error fetching veYFI account state:", error);
      // Return safe default on error to prevent UI crash
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
      // 1. Get Epoch from Distributor
      const currentEpoch = await this.publicClient.readContract({
        address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
        abi: VotingEscrowRewardDistributorAbi,
        functionName: "epoch",
      });

      // 2. Fetch Total Weights
      // Returns Struct Object { weight, slope }
      const totalWeightResult = (await this.publicClient.readContract({
        address: VEYFI_REWARD_DISTRIBUTOR_ADDRESS,
        abi: VotingEscrowRewardDistributorAbi,
        functionName: "total_weights",
        args: [currentEpoch],
      })) as WeightInfo;

      // 3. Calculate "Underlying YFI Migrated" using the Slope Trick
      // slope = amount // 104
      // migrated ≈ slope * 104
      const migratedUnderlyingApprox = totalWeightResult.slope * 104n;

      return {
        migratedYfi: migratedUnderlyingApprox,
        legacyYfiSupply: TOTAL_SNAPSHOT_YFI,
        maxBoostMultiplier: 2.0,
        totalLlyfiStakedPercent: 0,
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

  // --- LLYFI Stubs ---
  async prepareStakeLlyfi(
    _symbol: LlyfiTokenId,
    _amount: bigint
  ): Promise<PreparedTransaction> {
    throw new Error("LLYFI Staking not yet enabled on this network");
  }

  async prepareStartCooldownLlyfi(
    _symbol: LlyfiTokenId,
    _amount: bigint
  ): Promise<PreparedTransaction> {
    throw new Error("LLYFI Cooldown not yet enabled on this network");
  }

  async prepareWithdrawLlyfi(
    _symbol: LlyfiTokenId
  ): Promise<PreparedTransaction> {
    throw new Error("LLYFI Withdraw not yet enabled on this network");
  }

  async prepareRedeemLlyfi(
    _symbol: LlyfiTokenId,
    _amount: bigint
  ): Promise<PreparedTransaction> {
    throw new Error("LLYFI Redemption not yet enabled on this network");
  }

  async prepareMintLlyfi(
    _symbol: LlyfiTokenId,
    _amount: bigint
  ): Promise<PreparedTransaction> {
    throw new Error("LLYFI Minting not yet enabled on this network");
  }
}
