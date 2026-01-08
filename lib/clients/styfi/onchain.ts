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
} from "@/lib/constants";
import { StakedYfiAbi } from "@/lib/abis/StakedYfi";
import { DelegatedStakedYfiAbi } from "@/lib/abis/DelegatedStakedYfi";
import { RewardClaimerAbi } from "@/lib/abis/RewardClaimer";

const STREAM_DURATION = 14 * 24 * 60 * 60;

export class OnchainStyfiClient implements StyfiClient {
  constructor(private publicClient: PublicClient) {}

  async getAccountState(address: Address): Promise<StyfiAccountState> {
    // Debug: Check which chain we are querying
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
      ] = await Promise.all([
        // Wallet
        this.publicClient.readContract({
          ...commonYfi,
          functionName: "balanceOf",
          args: [address],
        }),

        // stYFI
        this.publicClient.readContract({
          ...commonStyfi,
          functionName: "balanceOf",
          args: [address],
        }),
        this.publicClient.readContract({
          ...commonStyfi,
          functionName: "streams",
          args: [address],
        }),
        this.publicClient.readContract({
          ...commonStyfi,
          functionName: "maxWithdraw",
          args: [address],
        }),

        // stYFIx
        this.publicClient.readContract({
          ...commonStyfix,
          functionName: "balanceOf",
          args: [address],
        }),
        this.publicClient.readContract({
          ...commonStyfix,
          functionName: "streams",
          args: [address],
        }),
        this.publicClient.readContract({
          ...commonStyfix,
          functionName: "maxWithdraw",
          args: [address],
        }),

        // Allowances
        this.publicClient.readContract({
          ...commonYfi,
          functionName: "allowance",
          args: [address, STYFI_ADDRESS],
        }),
        this.publicClient.readContract({
          ...commonYfi,
          functionName: "allowance",
          args: [address, STYFIX_ADDRESS],
        }),
      ]);

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
        };
      };

      const styfiCooldown = formatCooldown(styfiStream);
      const styfiXCooldown = formatCooldown(styfiXStream);

      const styfiInCooldown = styfiStream[1] - styfiStream[2];
      const styfiXInCooldown = styfiXStream[1] - styfiXStream[2];

      return {
        address,
        isBlacklisted: false,
        yfiBalance,

        styfiActive,
        styfiInCooldown,
        styfiUnlocked: 0n,
        styfiWithdrawable: styfiMaxWithdraw,
        styfiCooldown,

        styfiX: {
          sharesActive: styfiXActive,
          sharesInCooldown: styfiXInCooldown,
          assetsActive: styfiXActive,
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
    return {
      currentEpoch: 0,
      epochEnd: now + 86400,
      nextEpochStart: now + 86400,
    };
  }

  async getStats(): Promise<StyfiGlobalStats> {
    try {
      const [yfiSupply, styfiSupply, styfiXSupply] = await Promise.all([
        this.publicClient.readContract({
          abi: erc20Abi,
          address: YFI_ADDRESS,
          functionName: "totalSupply",
        }),
        this.publicClient.readContract({
          abi: StakedYfiAbi,
          address: STYFI_ADDRESS,
          functionName: "totalSupply",
        }),
        this.publicClient.readContract({
          abi: DelegatedStakedYfiAbi,
          address: STYFIX_ADDRESS,
          functionName: "totalSupply",
        }),
      ]);

      return {
        totalSupply: yfiSupply,
        totalStaked: styfiSupply + styfiXSupply,
      };
    } catch (e) {
      console.warn("Failed to fetch global stats", e);
      return { totalSupply: 0n, totalStaked: 0n };
    }
  }

  async getApy(): Promise<bigint> {
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
