// state/identity.tsx
"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useProtocol } from "./protocol";
import type { Address } from "viem";
import type { EpochInfo } from "@/lib/clients/styfi/types";
import type { BlacklistStatus } from "@/lib/clients/styfi/types";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { useEpochClock } from "@/lib/hooks/useEpochClock";
import { MAINNET_CHAIN_ID } from "@/lib/tx/network";

type IdentityState = {
  address: Address | undefined;
  isWalletConnected: boolean;
  isConnected: boolean;
  canTransact: boolean;
  isWrongNetwork: boolean;
  isMainnet: boolean;
  chainId: number | undefined;
  yfiBalance: bigint;
  isBlacklisted: boolean;
  blacklistStatus: BlacklistStatus;
  isBlacklistStatusKnown: boolean;
  epoch: EpochInfo | undefined;
  isLoading: boolean;
};

const IdentityContext = createContext<IdentityState | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const {
    address: wagmiAddress,
    isConnected: wagmiConnected,
    chainId: wagmiChainId,
  } = useAccount();
  const { styfi, publicClient, usesMockBackend } = useProtocol();
  const { epochInfo } = useEpochClock({ tickMs: 60_000 });
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const fallbackAddress =
    isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined;
  const address = wagmiAddress ?? fallbackAddress;
  const chainId = wagmiChainId ?? (fallbackAddress ? MAINNET_CHAIN_ID : undefined);
  const isWalletConnected = wagmiConnected || !!fallbackAddress;
  const isMainnet = chainId === MAINNET_CHAIN_ID;
  const isWrongNetwork = !!wagmiConnected && !fallbackAddress && !isMainnet;
  const canTransact = (wagmiConnected && isMainnet) || !!fallbackAddress;

  const { data, isLoading } = useQuery({
    queryKey: ["protocol", "identity", address],
    queryFn: async () => {
      if (!address) return null;
      // StYFI client acts as the hub for identity and epoch timing
      const state = await styfi.getAccountState(address);
      return {
        yfiBalance: state.yfiBalance,
        isBlacklisted: state.isBlacklisted,
        blacklistStatus: state.blacklistStatus,
        epoch: state.epoch,
      };
    },
    enabled: !!address && (usesMockBackend || !!publicClient),
    staleTime: 5_000,
    refetchInterval: (query) =>
      query.state.data?.blacklistStatus === "unknown" ? 10_000 : 30_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
  });

  const value = useMemo(
    () => {
      const blacklistStatus: BlacklistStatus =
        data?.blacklistStatus ?? (address ? "unknown" : "clear");
      return {
        address,
        isWalletConnected,
        isConnected: isWalletConnected,
        canTransact,
        isWrongNetwork,
        isMainnet,
        chainId,
        yfiBalance: data?.yfiBalance ?? 0n,
        isBlacklisted: blacklistStatus === "blocked",
        blacklistStatus,
        isBlacklistStatusKnown: blacklistStatus !== "unknown",
        epoch: epochInfo ?? data?.epoch,
        isLoading,
      };
    },
    [
      address,
      isWalletConnected,
      canTransact,
      isWrongNetwork,
      isMainnet,
      chainId,
      data,
      epochInfo,
      isLoading,
    ]
  );

  return (
    <IdentityContext.Provider value={value}>
      {children}
    </IdentityContext.Provider>
  );
}

export const useIdentity = () => {
  const context = useContext(IdentityContext);
  if (!context)
    throw new Error("useIdentity must be used within IdentityProvider");
  return context;
};
