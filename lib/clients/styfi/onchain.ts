import { type Address, type PublicClient, erc20Abi } from "viem";
import { getAccount, writeContract, readContract } from "wagmi/actions";
import { wagmiConfig } from "@/web3/wagmi";
import type { PreparedTransaction } from "@/lib/tx/types";
import type { StyfiAccountState, StyfiGlobalStats, EpochInfo } from "./types";
import type { StyfiClient, StyfiStakeMode } from "./client";
import {
  STYFI_ADDRESS,
  STYFIX_ADDRESS,
  YFI_ADDRESS,
  REWARD_CLAIMER_ADDRESS,
  REWARD_TOKEN_CONFIG,
  GENESIS,
} from "@/lib/constants";
import { StakedYfiAbi } from "@/lib/abis/StakedYfi";
import { DelegatedStakedYfiAbi } from "@/lib/abis/DelegatedStakedYfi";
import { RewardClaimerAbi } from "@/lib/abis/RewardClaimer";

const STREAM_DURATION = 14 * 24 * 60 * 60; // 14 days
const EPOCH_LENGTH = 14 * 24 * 60 * 60; // 14 days

export class OnchainStyfiClient implements StyfiClient {
  constructor(private publicClient: PublicClient) {}

  async getAccountState(address: Address): Promise<StyfiAccountState> {
    console.log(
      "Fetching Account State from Chain ID:",
      this.publicClient.chain?.id
    );

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
      } catch (e) {
        // Fallback for simulation failure (e.g. 0 rewards)
        claimableRewards = 0n;
      }

      // 3. Map Data
      const formatCooldown = (stream: readonly [bigint, bigint, bigint]) => {
        const [start, total, claimed] = stream;
        const remaining = total - claimed;
        if (remaining <= 0n) return null;

        return {
          amount: remaining,
          endsAt: Number(start) + STREAM_DURATION,
          totalAmount: total,
        };
      };

      const styfiCooldown = formatCooldown(styfiStream);
      const styfiXCooldown = formatCooldown(styfiXStream);

      // In the contracts, "streams" returns [start, total, claimed].
      // The "Active" amount in `balanceOf` is what is earning.
      // The "In Cooldown" is `total - claimed`.
      const styfiInCooldown = styfiStream[1] - styfiStream[2];
      const styfiXInCooldown = styfiXStream[1] - styfiXStream[2];

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

        epoch: await this.getEpochInfo(),
        earningWeight: styfiActive + styfiXActive,
        rewardToken: REWARD_TOKEN_CONFIG,
      };
    } catch (error) {
      console.error("Critical error fetching account state:", error);
      throw error;
    }
  }

  async getEpochInfo(): Promise<EpochInfo> {
    const now = Math.floor(Date.now() / 1000);
    const genesisTime = Number(GENESIS);

    // Calculate current epoch based on Genesis
    const timeSinceGenesis = Math.max(0, now - genesisTime);
    const currentEpoch = Math.floor(timeSinceGenesis / EPOCH_LENGTH);

    const epochStart = genesisTime + currentEpoch * EPOCH_LENGTH;
    const epochEnd = epochStart + EPOCH_LENGTH;

    return {
      currentEpoch,
      epochEnd,
      nextEpochStart: epochEnd,
    };
  }

  async getStats(): Promise<StyfiGlobalStats> {
    try {
      // FIX: Only fetch YFI Supply and stYFI Supply.
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
    // Dynamic APY calculation requires backend indexing of rewards/revenue.
    // For BR#1, we can return 0 or a placeholder, or fetch a "last week's APR" if stored on chain.
    // Currently no direct contract view for "Current APY".
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

      const contractAddress = mode === "stYFI" ? STYFI_ADDRESS : STYFIX_ADDRESS;
      const abi = mode === "stYFI" ? StakedYfiAbi : DelegatedStakedYfiAbi;

      const max = await readContract(wagmiConfig, {
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
