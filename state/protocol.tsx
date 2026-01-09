// state/protocol.tsx
"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { StyfiClient } from "@/lib/clients/styfi";
import { VeyfiClient } from "@/lib/clients/veyfi";
import { createMockStyfiClient } from "@/lib/clients/styfi/mock";
import { createMockVeyfiClient } from "@/lib/clients/veyfi/mock";
import { OnchainStyfiClient } from "@/lib/clients/styfi/onchain";
import { OnchainVeyfiClient } from "@/lib/clients/veyfi/onchain"; // [New]
import { usePublicClient } from "wagmi";

type ProtocolContextValue = {
  styfi: StyfiClient;
  veyfi: VeyfiClient;
  isMock: boolean;
  usesMockBackend: boolean;
};

const ProtocolContext = createContext<ProtocolContextValue | null>(null);

export function ProtocolProvider({ children }: { children: ReactNode }) {
  const preferMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

  // This hook is reactive. It updates when the connected chain changes.
  const publicClient = usePublicClient();

  const value = useMemo(() => {
    // If user wants mocks, ignore the public client
    if (preferMocks) {
      return {
        styfi: createMockStyfiClient({ latencyMs: 600 }),
        veyfi: createMockVeyfiClient({ latencyMs: 600 }),
        isMock: true,
        usesMockBackend: true,
      };
    }

    // If we have a valid public client, use it for on-chain interactions
    if (publicClient) {
      console.log(
        "Initializing Onchain Clients with Chain ID:",
        publicClient.chain.id
      );
      return {
        styfi: new OnchainStyfiClient(publicClient),
        veyfi: new OnchainVeyfiClient(publicClient), // [Updated] Use real client
        isMock: false,
        usesMockBackend: false,
      };
    }

    // Fallback if no client available yet (should be rare with default chains)
    return {
      styfi: createMockStyfiClient({ latencyMs: 600 }),
      veyfi: createMockVeyfiClient({ latencyMs: 600 }),
      isMock: true,
      usesMockBackend: true,
    };
  }, [preferMocks, publicClient]);

  return (
    <ProtocolContext.Provider value={value}>
      {children}
    </ProtocolContext.Provider>
  );
}

export function useProtocol() {
  const context = useContext(ProtocolContext);
  if (!context) {
    throw new Error("useProtocol must be used within a ProtocolProvider");
  }
  return context;
}
