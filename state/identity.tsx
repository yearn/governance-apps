// state/identity.tsx
"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useProtocol } from "./protocol";
import type { Address } from "viem";
import type { EpochInfo } from "@/lib/clients/styfi/types";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { useEpochClock } from "@/lib/hooks/useEpochClock";

type IdentityState = {
  address: Address | undefined;
  isConnected: boolean;
  yfiBalance: bigint;
  isBlacklisted: boolean;
  epoch: EpochInfo | undefined;
  isLoading: boolean;
};

const IdentityContext = createContext<IdentityState | null>(null);

export function IdentityProvider({ children }: { children: ReactNode }) {
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { styfi, publicClient, usesMockBackend } = useProtocol();
  const { epochInfo } = useEpochClock({ tickMs: 60_000 });
  const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
  const fallbackAddress =
    isE2E && usesMockBackend ? E2E_MOCK_ADDRESS : undefined;
  const address = wagmiAddress ?? fallbackAddress;
  const isConnected = wagmiConnected || !!fallbackAddress;

  const { data, isLoading } = useQuery({
    queryKey: ["protocol", "identity", address],
    queryFn: async () => {
      if (!address) return null;
      // StYFI client acts as the hub for identity and epoch timing
      const state = await styfi.getAccountState(address);
      return {
        yfiBalance: state.yfiBalance,
        isBlacklisted: state.isBlacklisted,
        epoch: state.epoch,
      };
    },
    enabled: !!address && (usesMockBackend || !!publicClient),
    staleTime: 5_000,
  });

  const value = useMemo(
    () => ({
      address,
      isConnected,
      yfiBalance: data?.yfiBalance ?? 0n,
      isBlacklisted: data?.isBlacklisted ?? false,
      epoch: epochInfo ?? data?.epoch,
      isLoading,
    }),
    [address, isConnected, data, isLoading]
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
