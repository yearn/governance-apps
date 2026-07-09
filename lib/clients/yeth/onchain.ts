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
import { YETH_MANUAL_RECOVERY_CLAIM_URL } from "./links";

const ONE = 10n ** 18n;
const MIN_REASONABLE_DEADLINE_UNIX_SECONDS = 1_577_836_800; // 2020-01-01 00:00:00 UTC

const YETH_YIP_URL = "https://gov.yearn.fi";

const STATIC_YIELD_SOURCES = [
  "Strategy yield forwarded from Yield Vault to Recovery Vault via performance fees",
  "External donations (including stYFI revenue share)",
] as const;

const STATIC_RISKS = [
  "Smart-contract risk",
  "Strategy and protocol risk",
  "Market events and depegs",
] as const;

type WarnKey =
  | "yeth-global-overlay"
  | "yeth-account-read"
  | "yeth-invalid-deadline";

type MulticallResult =
  | {
      status: "success";
      result: unknown;
    }
  | {
      status: "failure";
      error: unknown;
    };

function getSuccessfulResult(entry: unknown): unknown | null {
  if (!entry || typeof entry !== "object") return null;
  const result = entry as Partial<MulticallResult>;
  if (result.status !== "success") return null;
  return "result" in result ? result.result : null;
}

function getSuccessfulBigInt(entry: unknown): bigint | null {
  const result = getSuccessfulResult(entry);
  return typeof result === "bigint" ? result : null;
}

function normalizeDeadline(value: unknown): number | null {
  const candidate =
    typeof value === "bigint"
      ? value > BigInt(Number.MAX_SAFE_INTEGER)
        ? NaN
        : Number(value)
      : typeof value === "number"
        ? value
        : NaN;
  if (!Number.isFinite(candidate)) return null;
  const normalized = Math.trunc(candidate);
  if (normalized < MIN_REASONABLE_DEADLINE_UNIX_SECONDS) return null;
  return normalized;
}

export class OnchainYethClient implements YethClient {
  private warned = new Set<WarnKey>();
  private lastValidClaimDeadline: number | null = null;
  private lastGlobalState: YethGlobalState | null = null;
  private lastKnownAccounts = new Map<Address, YethAccountState>();

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
    const cachedGlobal = this.lastGlobalState;
    const feedDeadline = normalizeDeadline(this.globalData?.claim.closesAt);
    let closesAt =
      feedDeadline ??
      this.lastValidClaimDeadline ??
      normalizeDeadline(cachedGlobal?.claimWindow.closesAt);
    let recoveryVaultPps = this.globalData
      ? BigInt(this.globalData.recoveryVault.pps)
      : cachedGlobal?.recoveryVault.pps ?? 0n;
    let recoveryVaultTotalAssetsEth = this.globalData
      ? BigInt(this.globalData.recoveryVault.totalAssetsEth)
      : cachedGlobal?.recoveryVault.totalAssetsEth ?? 0n;
    let recoveryVaultTotalShares = this.globalData
      ? BigInt(this.globalData.recoveryVault.totalShares)
      : cachedGlobal?.recoveryVault.totalShares ?? 0n;
    let yieldVaultTvlEth = this.globalData
      ? BigInt(this.globalData.yieldVault.tvlEth)
      : cachedGlobal?.yieldVault.tvlEth ?? 0n;
    let yieldVaultPps = this.globalData?.yieldVault.pps
      ? BigInt(this.globalData.yieldVault.pps)
      : cachedGlobal?.yieldVault.pps ?? 0n;
    let yieldVaultTotalShares = this.globalData?.yieldVault.totalShares
      ? BigInt(this.globalData.yieldVault.totalShares)
      : cachedGlobal?.yieldVault.totalShares ?? 0n;
    let asOf = this.globalData?.generatedAt ?? cachedGlobal?.asOf ?? fallbackNow;

    if (this.publicClient) {
      try {
        const [
          deadlineResult,
          recoveryPpsResult,
          recoveryTotalAssetsResult,
          recoveryTotalSupplyResult,
          yieldPpsResult,
          yieldTotalAssetsResult,
          yieldTotalSupplyResult,
        ] = (await this.publicClient.multicall({
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
          allowFailure: true,
        })) as MulticallResult[];

        const chainDeadline = normalizeDeadline(getSuccessfulResult(deadlineResult));
        if (chainDeadline !== null) {
          if (feedDeadline !== null && chainDeadline < feedDeadline) {
            this.warnOnce(
              "yeth-invalid-deadline",
              "Ignoring yETH chain deadline earlier than feed deadline.",
              { chainDeadline, feedDeadline }
            );
          } else {
            closesAt = chainDeadline;
          }
        } else if (getSuccessfulResult(deadlineResult) !== null) {
          this.warnOnce(
            "yeth-invalid-deadline",
            "Ignoring invalid yETH claim deadline from chain read.",
            getSuccessfulResult(deadlineResult)
          );
        }

        const recoveryPps = getSuccessfulBigInt(recoveryPpsResult);
        if (recoveryPps !== null) recoveryVaultPps = recoveryPps;

        const recoveryTotalAssets = getSuccessfulBigInt(recoveryTotalAssetsResult);
        if (recoveryTotalAssets !== null) {
          recoveryVaultTotalAssetsEth = recoveryTotalAssets;
        }

        const recoveryTotalSupply = getSuccessfulBigInt(recoveryTotalSupplyResult);
        if (recoveryTotalSupply !== null) recoveryVaultTotalShares = recoveryTotalSupply;

        const yieldPps = getSuccessfulBigInt(yieldPpsResult);
        if (yieldPps !== null) yieldVaultPps = yieldPps;

        const yieldTotalAssets = getSuccessfulBigInt(yieldTotalAssetsResult);
        if (yieldTotalAssets !== null) yieldVaultTvlEth = yieldTotalAssets;

        const yieldTotalSupply = getSuccessfulBigInt(yieldTotalSupplyResult);
        if (yieldTotalSupply !== null) yieldVaultTotalShares = yieldTotalSupply;

        asOf = fallbackNow;
      } catch (error) {
        this.warnOnce(
          "yeth-global-overlay",
          "Failed to overlay yETH vault metrics/deadline from chain; using feed values.",
          error
        );
      }
    }

    if (closesAt !== null) {
      this.lastValidClaimDeadline = closesAt;
    } else if (this.globalData?.claim.closesAt !== undefined) {
      this.warnOnce(
        "yeth-invalid-deadline",
        "Ignoring invalid yETH claim deadline from feed data.",
        this.globalData.claim.closesAt
      );
    }

    const next: YethGlobalState = {
      asOf,
      claimWindow: { closesAt: closesAt ?? 0 },
      approvedYipUrl: YETH_YIP_URL,
      manualLateClaimUrl: YETH_MANUAL_RECOVERY_CLAIM_URL,
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
    this.lastGlobalState = next;
    return next;
  }

  async getAccountState(address: Address): Promise<YethAccountState> {
    const cached = this.lastKnownAccounts.get(address);
    if (!this.publicClient) {
      return cached ?? {
        address,
        snapshotLossEth: 0n,
        claimableNowEth: 0n,
        recoveryVaultShares: 0n,
      };
    }

    let snapshotLossEth = cached?.snapshotLossEth ?? 0n;
    let claimableNowEth = cached?.claimableNowEth ?? 0n;
    let recoveryVaultShares = cached?.recoveryVaultShares ?? 0n;

    try {
      const [claimableRawResult, recoveryRateResult, recoveryVaultSharesResult] =
        (await this.publicClient.multicall({
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
          allowFailure: true,
        })) as MulticallResult[];

      const claimableRaw = getSuccessfulBigInt(claimableRawResult);
      const recoveryRate = getSuccessfulBigInt(recoveryRateResult);
      const parsedRecoveryVaultShares = getSuccessfulBigInt(recoveryVaultSharesResult);

      if (claimableRaw !== null) {
        snapshotLossEth = claimableRaw;
      }
      if (claimableRaw !== null && recoveryRate !== null) {
        claimableNowEth = (claimableRaw * recoveryRate) / ONE;
      }
      if (parsedRecoveryVaultShares !== null) {
        recoveryVaultShares = parsedRecoveryVaultShares;
      }

      const next: YethAccountState = {
        address,
        snapshotLossEth,
        claimableNowEth,
        recoveryVaultShares,
      };
      this.lastKnownAccounts.set(address, next);
      return next;
    } catch (error) {
      this.warnOnce(
        "yeth-account-read",
        "Failed to fetch yETH account state; using last known values when available.",
        error
      );
      return cached ?? {
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
