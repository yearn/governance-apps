"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useProtocol } from "@/state/protocol";
import { LlyfiTokenId, type LlyfiTokenState } from "@/lib/clients/veyfi";
import { useTx } from "@/lib/tx/useTx";
import { E2E_MOCK_ADDRESS, LIQUID_LOCKERS } from "@/lib/constants";

function toNumber(value?: string | number | null) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
}

function toBigInt(value?: string | number | null, fallback = 0n) {
  if (value === null || value === undefined) return fallback;
  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

// --- Query Keys ---
export const veyfiKeys = {
  all: ["veyfi"] as const,
  account: (address?: string) =>
    [...veyfiKeys.all, "account", address] as const,
  stats: () => [...veyfiKeys.all, "stats"] as const,
};

// --- Read Hooks ---

export function useVeyfiAccount() {
  const { veyfi, publicClient, usesMockBackend } = useProtocol();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  return useQuery({
    queryKey: veyfiKeys.account(address),
    queryFn: async () => {
      if (!address) return null;
      return veyfi.getAccountState(address);
    },
    enabled: !!address && (usesMockBackend || !!publicClient),
    // Poll every 30s to update caps, inventory, and token status
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });
}

export function useVeyfiStats() {
  const { veyfi, publicClient, usesMockBackend, globalData } = useProtocol();
  const connected = usesMockBackend || !!publicClient;
  const globalVersion = globalData?.meta?.timestamp ?? null;
  const chainId = publicClient?.chain?.id ?? null;

  return useQuery({
    queryKey: [...veyfiKeys.stats(), connected, globalVersion, chainId] as const,
    queryFn: () => veyfi.getGlobalStats(),
    // Global stats (Migration %, Boost)
    refetchInterval: 60_000,
    staleTime: 60_000,
  });
}

/**
 * Selector hook for LLYFI tokens (Balances & Metadata)
 */
export function useLlyfiTokens() {
  const { data } = useVeyfiAccount();
  const { globalData } = useProtocol();
  if (data?.llyfiTokens?.length) return data.llyfiTokens;
  if (!globalData?.global?.veyfi || !globalData?.llyfi) return [];

  const feeBps = toNumber(globalData.global.veyfi.inventory.feeBps) ?? 0;
  const fee = BigInt(Math.trunc(feeBps)) * 10n ** 14n;
  const maxBoostBps = toNumber(globalData.global.maxBoostBps) ?? 0;
  const maxBoost = maxBoostBps > 0 ? maxBoostBps / 10000 : 1;

  const redemptionMap = new Map(
    globalData.global.veyfi.tokens.map((token) => [
      token.symbol,
      token.redemption,
    ])
  );
  const llyfiMap = new Map(
    globalData.llyfi.map((token) => [token.symbol, token])
  );

  return LIQUID_LOCKERS.map((locker) => {
    const redemption = redemptionMap.get(locker.symbol);
    const llyfi = llyfiMap.get(locker.symbol);
    const capacity = redemption
      ? toBigInt(redemption.capacity, locker.capacity)
      : locker.capacity;
    const used = redemption ? toBigInt(redemption.used) : 0n;
    const inventory = redemption ? toBigInt(redemption.inventory) : 0n;
    const stakedYfi = llyfi
      ? toBigInt(llyfi.staked) + toBigInt(llyfi.unstaking)
      : 0n;

    return {
      symbol: locker.symbol,
      name: locker.name,
      address: locker.token,
      depositorAddress: locker.depositor,
      walletBalance: 0n,
      stakedBalance: 0n,
      cooldownBalance: 0n,
      withdrawable: 0n,
      cooldown: null,
      allowance: 0n,
      redemptionAllowance: 0n,
      lockedYfi: capacity,
      veyfiBoost: maxBoost,
      totalSupply: 0n,
      stakedAssets: stakedYfi * locker.scale,
      depositorTotalSupply: stakedYfi,
      depositorCapacity: capacity,
      exchangeRate: locker.scale,
      redemption: {
        capacity,
        used,
        inventory,
        fee,
      },
    } satisfies LlyfiTokenState;
  });
}

/**
 * Selector hook for Protocol Inventory availability
 */
export function useVeyfiInventory() {
  const { data } = useVeyfiAccount();
  return data?.inventory ?? null;
}

// --- Write Hooks ---

export function useVeyfiMigration() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async () => {
    const prepare = await veyfi.prepareMigrateVeYfi();

    await execute(prepare, {
      invalidate: async () => {
        // Invalidate Account State (to update card to "Migrated" state)
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
        // Invalidate Global Stats (to update "Migrated veYFI" top bar)
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.stats(),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiStake() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareStakeLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiStartCooldown() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareStartCooldownLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiWithdraw() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async (symbol: LlyfiTokenId) => {
    const prepare = await veyfi.prepareWithdrawLlyfi(symbol);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiRedeem() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareRedeemLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        // Important: Invalidate identity for YFI balance updates
        await queryClient.invalidateQueries({
          queryKey: ["protocol", "identity"],
        });
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}

export function useLlyfiMint() {
  const { veyfi, usesMockBackend } = useProtocol();
  const { execute, state } = useTx();
  const queryClient = useQueryClient();
  const { address: wagmiAddress } = useAccount();
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const address =
    wagmiAddress ?? (isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined);

  const write = async (symbol: LlyfiTokenId, amount: bigint) => {
    const prepare = await veyfi.prepareMintLlyfi(symbol, amount);

    await execute(prepare, {
      invalidate: async () => {
        await queryClient.invalidateQueries({
          queryKey: ["protocol", "identity"],
        });
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
      },
      skipWaitForReceipt: usesMockBackend,
    });
  };

  return { write, state };
}
