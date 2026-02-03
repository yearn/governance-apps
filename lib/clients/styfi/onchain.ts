// lib/clients/styfi/onchain.ts
import { type Address, type PublicClient, erc20Abi } from "viem";
import { getAccount, writeContract } from "wagmi/actions";
import { wagmiConfig } from "@/web3/wagmi";
import type { PreparedTransaction } from "@/lib/tx/types";
import type { StyfiAccountState, StyfiGlobalStats, EpochInfo } from "./types";
import type { StyfiClient, StyfiStakeMode } from "./client";
import { getEpochInfo as getEpochInfoFromGenesis } from "@/lib/format";
import type { GlobalData } from "@/lib/schemas/global";
import {
  STYFI_ADDRESS,
  STYFIX_ADDRESS,
  YFI_ADDRESS,
  REWARD_CLAIMER_ADDRESS,
  REWARD_TOKEN_CONFIG,
  GENESIS,
  STREAM_DURATION,
  EPOCH_LENGTH,
} from "@/lib/constants";
import { deriveCooldownEndsAt } from "@/lib/clients/shared/cooldown";
import { nowSeconds } from "@/lib/mocks/time";
import { StakedYfiAbi } from "@/lib/abis/StakedYfi";
import { DelegatedStakedYfiAbi } from "@/lib/abis/DelegatedStakedYfi";
import { RewardClaimerAbi } from "@/lib/abis/RewardClaimer";

function toBigInt(value: string | number) {
  return typeof value === "number" ? BigInt(Math.trunc(value)) : BigInt(value);
}

export class OnchainStyfiClient implements StyfiClient {
  private rewardTokenDecimals: number | null = null;
  private chainTimeOffsetSeconds: number | null = null;
  private chainTimeLastFetch: number | null = null;

  constructor(
    private publicClient: PublicClient | null,
    private globalData: GlobalData | null
  ) {}

  private async getRewardTokenDecimals(): Promise<number> {
    if (this.rewardTokenDecimals !== null) return this.rewardTokenDecimals;
    if (!this.publicClient) return REWARD_TOKEN_CONFIG.decimals;

    try {
      const decimals = await this.publicClient.readContract({
        address: REWARD_TOKEN_CONFIG.address,
        abi: erc20Abi,
        functionName: "decimals",
      });
      const parsed =
        typeof decimals === "bigint" ? Number(decimals) : decimals;
      if (Number.isFinite(parsed)) {
        this.rewardTokenDecimals = parsed;
        return parsed;
      }
    } catch (error) {
      console.warn("Failed to fetch reward token decimals", error);
    }

    return REWARD_TOKEN_CONFIG.decimals;
  }

  private async getCanonicalNowSeconds(): Promise<number> {
    const localNow = nowSeconds();
    const maxAgeSeconds = 60;

    if (
      this.chainTimeOffsetSeconds !== null &&
      this.chainTimeLastFetch !== null &&
      localNow - this.chainTimeLastFetch < maxAgeSeconds
    ) {
      return localNow + this.chainTimeOffsetSeconds;
    }

    if (this.publicClient) {
      try {
        const block = await this.publicClient.getBlock({ blockTag: "latest" });
        const timestamp = Number(block.timestamp);
        if (Number.isFinite(timestamp)) {
          this.chainTimeOffsetSeconds = timestamp - localNow;
          this.chainTimeLastFetch = localNow;
          return localNow + this.chainTimeOffsetSeconds;
        }
      } catch (error) {
        console.warn("Failed to fetch chain time", error);
      }
    }

    return localNow;
  }

  async getAccountState(address: Address): Promise<StyfiAccountState> {
    if (!this.publicClient) {
      throw new Error("Wallet public client not available");
    }
    const commonStyfi = { abi: StakedYfiAbi, address: STYFI_ADDRESS } as const;
    const commonStyfix = {
      abi: DelegatedStakedYfiAbi,
      address: STYFIX_ADDRESS,
    } as const;
    const commonYfi = { abi: erc20Abi, address: YFI_ADDRESS } as const;

    try {
      // 1. Parallel Reads
      const [
        yfiBalance,
        styfiActive,
        styfiStream,
        styfiMaxWithdraw,
        styfiXActive,
        styfiXStream,
        styfiXMaxWithdraw,
        allowanceStyfi,
        allowanceStyfix,
      ] = await this.publicClient.multicall({
        contracts: [
          // Wallet
          { ...commonYfi, functionName: "balanceOf", args: [address] },

          // stYFI
          { ...commonStyfi, functionName: "balanceOf", args: [address] },
          { ...commonStyfi, functionName: "streams", args: [address] },
          { ...commonStyfi, functionName: "maxWithdraw", args: [address] },

          // stYFIx
          { ...commonStyfix, functionName: "balanceOf", args: [address] },
          { ...commonStyfix, functionName: "streams", args: [address] },
          { ...commonStyfix, functionName: "maxWithdraw", args: [address] },

          // Allowances
          {
            ...commonYfi,
            functionName: "allowance",
            args: [address, STYFI_ADDRESS],
          },
          {
            ...commonYfi,
            functionName: "allowance",
            args: [address, STYFIX_ADDRESS],
          },
        ],
        allowFailure: false,
      });

      // 2. Reward Simulation
      let claimableRewards = 0n;
      try {
        const { result } = await this.publicClient.simulateContract({
          address: REWARD_CLAIMER_ADDRESS,
          abi: RewardClaimerAbi,
          functionName: "claim",
          args: [address],
          account: address,
        });
        claimableRewards = result;
      } catch {
        // Fallback for simulation failure (e.g. 0 rewards)
        claimableRewards = 0n;
      }

      // 3. Map Data
      const now = await this.getCanonicalNowSeconds();
      const formatCooldown = (
        stream: readonly [bigint, bigint, bigint],
        withdrawable: bigint
      ) => {
        const [, total, claimed] = stream;
        const remaining = total - claimed;
        if (remaining <= 0n) return null;

        return {
          amount: remaining,
          endsAt: deriveCooldownEndsAt({
            total,
            claimed,
            withdrawable,
            durationSeconds: STREAM_DURATION,
            nowSecondsOverride: now,
          }),
          totalAmount: total,
        };
      };

      const styfiCooldown = formatCooldown(styfiStream, styfiMaxWithdraw);
      const styfiXCooldown = formatCooldown(styfiXStream, styfiXMaxWithdraw);
      const rewardTokenDecimals = await this.getRewardTokenDecimals();

      // In the contracts, "streams" returns [start, total, claimed].
      // The "Active" amount in `balanceOf` is what is earning.
      // The "In Cooldown" is `total - claimed`.
      const styfiInCooldown = styfiStream[1] - styfiStream[2];
      const styfiXInCooldown = styfiXStream[1] - styfiXStream[2];

      const { currentEpoch, epochEnd } = getEpochInfoFromGenesis(
        GENESIS,
        EPOCH_LENGTH,
        now
      );

      return {
        address,
        isBlacklisted: false,
        yfiBalance,

        styfiActive,
        styfiInCooldown,
        styfiUnlocked: 0n, // Covered by maxWithdraw usually
        styfiWithdrawable: styfiMaxWithdraw,
        styfiCooldown,

        styfiX: {
          sharesActive: styfiXActive,
          sharesInCooldown: styfiXInCooldown,
          assetsActive: styfiXActive, // 1:1 for stYFIx
          assetsInCooldown: styfiXInCooldown,
          assetsUnlocked: 0n,
          assetsWithdrawable: styfiXMaxWithdraw,
          cooldown: styfiXCooldown,
        },

        claimableGenericRewards: claimableRewards,
        claimableBoostedRewards: 0n,
        accruingGenericRewards: 0n,
        accruingBoostedRewards: 0n,

        allowances: {
          yfiToStyfi: allowanceStyfi,
          yfiToStyfiX: allowanceStyfix,
        },

        epoch: {
          currentEpoch,
          epochEnd,
          nextEpochStart: epochEnd,
        },
        rewardToken: {
          ...REWARD_TOKEN_CONFIG,
          decimals: rewardTokenDecimals,
        },
      };
    } catch (error) {
      console.error("Critical error fetching account state:", error);
      throw error;
    }
  }

  async getEpochInfo(): Promise<EpochInfo> {
    const now = await this.getCanonicalNowSeconds();
    const { currentEpoch, epochEnd } = getEpochInfoFromGenesis(
      GENESIS,
      EPOCH_LENGTH,
      now
    );

    return {
      currentEpoch,
      epochEnd,
      nextEpochStart: epochEnd,
    };
  }

  async getStats(): Promise<StyfiGlobalStats> {
    if (this.globalData?.global?.yfi && this.globalData?.styfi) {
      const totalSupply = this.globalData.global.yfi.totalSupply;
      // S3 staked excludes cooldown balances; do not add unstaking here.
      const totalStaked = BigInt(this.globalData.styfi.staked);
      return {
        totalSupply: BigInt(totalSupply),
        totalStaked,
      };
    }

    return this.getStatsFromChain();
  }

  async getStatsFromChain(): Promise<StyfiGlobalStats> {
    if (!this.publicClient) {
      return { totalSupply: 0n, totalStaked: 0n };
    }

    try {
      // Only fetch YFI Supply and stYFI Supply.
      // stYFI.totalSupply() includes the YFI staked via stYFIx (delegated).
      const [yfiSupply, styfiSupply] = await this.publicClient.multicall({
        contracts: [
          {
            abi: erc20Abi,
            address: YFI_ADDRESS,
            functionName: "totalSupply",
          },
          {
            abi: StakedYfiAbi,
            address: STYFI_ADDRESS,
            functionName: "totalSupply",
          },
        ],
        allowFailure: false,
      });

      return {
        totalSupply: yfiSupply,
        totalStaked: styfiSupply, // Fixed: removed double counting of stYFIx
      };
    } catch (e) {
      console.warn("Failed to fetch global stats", e);
      return { totalSupply: 0n, totalStaked: 0n };
    }
  }

  async getApy(): Promise<bigint> {
    const aprBps = this.globalData?.styfi?.current?.aprBps;
    if (aprBps !== undefined) {
      return toBigInt(aprBps);
    }

    // Dynamic APR calculation requires backend indexing of rewards/revenue.
    // Currently no direct contract view for "Current APR".
    return 0n;
  }

  async prepareStake(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction> {
    return async () => {
      const { address } = getAccount(wagmiConfig);
      if (!address) throw new Error("No account connected");

      const contractAddress = mode === "stYFI" ? STYFI_ADDRESS : STYFIX_ADDRESS;
      const abi = mode === "stYFI" ? StakedYfiAbi : DelegatedStakedYfiAbi;

      return writeContract(wagmiConfig, {
        address: contractAddress,
        abi,
        functionName: "deposit",
        args: [amount, address],
      });
    };
  }

  async prepareStartCooldown(
    mode: StyfiStakeMode,
    amount: bigint
  ): Promise<PreparedTransaction> {
    return async () => {
      const contractAddress = mode === "stYFI" ? STYFI_ADDRESS : STYFIX_ADDRESS;
      const abi = mode === "stYFI" ? StakedYfiAbi : DelegatedStakedYfiAbi;

      return writeContract(wagmiConfig, {
        address: contractAddress,
        abi,
        functionName: "unstake",
        args: [amount],
      });
    };
  }

  async prepareWithdraw(mode: StyfiStakeMode): Promise<PreparedTransaction> {
    return async () => {
      const { address } = getAccount(wagmiConfig);
      if (!address) throw new Error("No account connected");
      if (!this.publicClient) throw new Error("Wallet public client not available");

      const contractAddress = mode === "stYFI" ? STYFI_ADDRESS : STYFIX_ADDRESS;
      const abi = mode === "stYFI" ? StakedYfiAbi : DelegatedStakedYfiAbi;

      const max = await this.publicClient.readContract({
        address: contractAddress,
        abi,
        functionName: "maxWithdraw",
        args: [address],
      });

      if (max === 0n) throw new Error("Nothing to withdraw");

      return writeContract(wagmiConfig, {
        address: contractAddress,
        abi,
        functionName: "withdraw",
        args: [max, address, address],
      });
    };
  }

  async prepareClaimRewards(): Promise<PreparedTransaction> {
    return async () => {
      const { address } = getAccount(wagmiConfig);
      if (!address) throw new Error("No account connected");

      return writeContract(wagmiConfig, {
        address: REWARD_CLAIMER_ADDRESS,
        abi: RewardClaimerAbi,
        functionName: "claim",
        args: [address],
      });
    };
  }
}
