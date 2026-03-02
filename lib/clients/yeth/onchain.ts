import { type Address, type PublicClient } from "viem";
import { getAccount } from "wagmi/actions";
import { Erc4626Abi } from "@/lib/abis/Erc4626";
import { YethClaimAbi } from "@/lib/abis/YethClaim";
import type { PreparedTransaction } from "@/lib/tx/types";
import type { YethGlobalData } from "@/lib/schemas/yeth-global";
import { nowSeconds } from "@/lib/mocks/time";
import { assertMainnetAccount, MAINNET_CHAIN_ID } from "@/lib/tx/network";
import { simulateThenWrite } from "@/lib/tx/simulateWrite";
import { wagmiConfig } from "@/web3/wagmi";
import type { YethClient } from "./client";
import type { YethAccountState, YethGlobalState } from "./types";
import {
  YETH_CLAIM,
  YETH_RECOVERY_VAULT,
  YETH_YIELD_VAULT,
} from "./deployment";

const ONE = 10n ** 18n;

const YETH_YIP_URL = "https://gov.yearn.fi";
const YETH_MANUAL_LATE_CLAIM_URL = "https://gov.yearn.fi";

const STATIC_YIELD_SOURCES = [
  "Strategy yield forwarded from Yield Vault to Recovery Vault via performance fees",
  "External donations (including stYFI revenue share)",
] as const;

const STATIC_RISKS = [
  "Smart-contract risk",
  "Strategy and protocol risk",
  "Market events and depegs",
] as const;

type WarnKey = "yeth-global-overlay" | "yeth-account-read";

export class OnchainYethClient implements YethClient {
  private warned = new Set<WarnKey>();

  constructor(
    private publicClient: PublicClient | null,
    private globalData: YethGlobalData | null
  ) {}

  private warnOnce(key: WarnKey, message: string, error: unknown) {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    console.warn(message, error);
  }

  async getGlobalState(): Promise<YethGlobalState> {
    const fallbackNow = nowSeconds();
    let closesAt = this.globalData?.claim.closesAt ?? fallbackNow;
    let recoveryVaultPps = this.globalData
      ? BigInt(this.globalData.recoveryVault.pps)
      : 0n;
    let recoveryVaultTotalAssetsEth = this.globalData
      ? BigInt(this.globalData.recoveryVault.totalAssetsEth)
      : 0n;
    let recoveryVaultTotalShares = this.globalData
      ? BigInt(this.globalData.recoveryVault.totalShares)
      : 0n;
    let yieldVaultTvlEth = this.globalData
      ? BigInt(this.globalData.yieldVault.tvlEth)
      : 0n;
    let yieldVaultPps = this.globalData?.yieldVault.pps
      ? BigInt(this.globalData.yieldVault.pps)
      : 0n;
    let yieldVaultTotalShares = this.globalData?.yieldVault.totalShares
      ? BigInt(this.globalData.yieldVault.totalShares)
      : 0n;
    let asOf = this.globalData?.generatedAt ?? fallbackNow;

    if (this.publicClient) {
      try {
        const [
          deadline,
          recoveryPps,
          recoveryTotalAssets,
          recoveryTotalSupply,
          yieldPps,
          yieldTotalAssets,
          yieldTotalSupply,
        ] = await this.publicClient.multicall({
          contracts: [
            {
              address: YETH_CLAIM,
              abi: YethClaimAbi,
              functionName: "deadline",
            },
            {
              address: YETH_RECOVERY_VAULT,
              abi: Erc4626Abi,
              functionName: "convertToAssets",
              args: [ONE],
            },
            {
              address: YETH_RECOVERY_VAULT,
              abi: Erc4626Abi,
              functionName: "totalAssets",
            },
            {
              address: YETH_RECOVERY_VAULT,
              abi: Erc4626Abi,
              functionName: "totalSupply",
            },
            {
              address: YETH_YIELD_VAULT,
              abi: Erc4626Abi,
              functionName: "convertToAssets",
              args: [ONE],
            },
            {
              address: YETH_YIELD_VAULT,
              abi: Erc4626Abi,
              functionName: "totalAssets",
            },
            {
              address: YETH_YIELD_VAULT,
              abi: Erc4626Abi,
              functionName: "totalSupply",
            },
          ],
          allowFailure: false,
        });

        closesAt = Number(deadline);
        recoveryVaultPps = recoveryPps;
        recoveryVaultTotalAssetsEth = recoveryTotalAssets;
        recoveryVaultTotalShares = recoveryTotalSupply;
        yieldVaultPps = yieldPps;
        yieldVaultTvlEth = yieldTotalAssets;
        yieldVaultTotalShares = yieldTotalSupply;
        asOf = fallbackNow;
      } catch (error) {
        this.warnOnce(
          "yeth-global-overlay",
          "Failed to overlay yETH vault metrics/deadline from chain; using feed values.",
          error
        );
      }
    }

    return {
      asOf,
      claimWindow: { closesAt },
      approvedYipUrl: YETH_YIP_URL,
      manualLateClaimUrl: YETH_MANUAL_LATE_CLAIM_URL,
      contracts: {
        claimContract: YETH_CLAIM,
        recoveryVault: YETH_RECOVERY_VAULT,
        yieldVault: YETH_YIELD_VAULT,
      },
      recoveryVault: {
        pps: recoveryVaultPps,
        totalAssetsEth: recoveryVaultTotalAssetsEth,
        totalShares: recoveryVaultTotalShares,
        hasStrategies: false,
      },
      yieldVault: {
        tvlEth: yieldVaultTvlEth,
        pps: yieldVaultPps,
        totalShares: yieldVaultTotalShares,
        feeRecipient: YETH_RECOVERY_VAULT,
      },
      yieldSources: [...STATIC_YIELD_SOURCES],
      risks: [...STATIC_RISKS],
    };
  }

  async getAccountState(address: Address): Promise<YethAccountState> {
    if (!this.publicClient) {
      return {
        address,
        snapshotLossEth: 0n,
        claimableNowEth: 0n,
        recoveryVaultShares: 0n,
      };
    }

    try {
      const [claimableRaw, recoveryRate, recoveryVaultShares] =
        await this.publicClient.multicall({
          contracts: [
            {
              address: YETH_CLAIM,
              abi: YethClaimAbi,
              functionName: "claimable",
              args: [address],
            },
            {
              address: YETH_CLAIM,
              abi: YethClaimAbi,
              functionName: "recovery_rate",
            },
            {
              address: YETH_RECOVERY_VAULT,
              abi: Erc4626Abi,
              functionName: "balanceOf",
              args: [address],
            },
          ],
          allowFailure: false,
        });

      return {
        address,
        snapshotLossEth: claimableRaw,
        claimableNowEth: (claimableRaw * recoveryRate) / ONE,
        recoveryVaultShares,
      };
    } catch (error) {
      this.warnOnce(
        "yeth-account-read",
        "Failed to fetch yETH account state; returning safe fallback.",
        error
      );
      return {
        address,
        snapshotLossEth: 0n,
        claimableNowEth: 0n,
        recoveryVaultShares: 0n,
      };
    }
  }

  async prepareClaimAndExit(): Promise<PreparedTransaction> {
    return async () => {
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: YETH_CLAIM,
        abi: YethClaimAbi,
        functionName: "claim",
        args: [true] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "yETH claim and exit");
    };
  }

  async prepareClaimAndStay(): Promise<PreparedTransaction> {
    return async () => {
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);
      const request = {
        address: YETH_CLAIM,
        abi: YethClaimAbi,
        functionName: "claim",
        args: [false] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "yETH claim and stay");
    };
  }

  async prepareRedeemToEth(): Promise<PreparedTransaction> {
    return async () => {
      const account = getAccount(wagmiConfig);
      const address = assertMainnetAccount(account);

      if (!this.publicClient) {
        throw new Error("Wallet public client not available");
      }

      const shares = await this.publicClient.readContract({
        address: YETH_RECOVERY_VAULT,
        abi: Erc4626Abi,
        functionName: "balanceOf",
        args: [address],
      });

      if (shares <= 0n) {
        throw new Error("No recovery vault shares to redeem");
      }

      const request = {
        address: YETH_RECOVERY_VAULT,
        abi: Erc4626Abi,
        functionName: "redeem",
        args: [shares, address, address] as const,
        account: address,
        chainId: MAINNET_CHAIN_ID,
      };
      return simulateThenWrite(request, request, "yETH redeem to ETH");
    };
  }
}
