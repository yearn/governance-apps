// state/protocol.tsx
"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { StyfiClient } from "@/lib/clients/styfi";
import { VeyfiClient } from "@/lib/clients/veyfi";
import { createMockStyfiClient } from "@/lib/clients/styfi/mock";
import { createMockVeyfiClient } from "@/lib/clients/veyfi/mock";
import { OnchainStyfiClient } from "@/lib/clients/styfi/onchain";
import { OnchainVeyfiClient } from "@/lib/clients/veyfi/onchain"; // [New]
import { useWalletClient } from "wagmi";
import { createPublicClient, custom, type PublicClient } from "viem";
import { mainnet } from "wagmi/chains";
import { TestBridgeListener } from "@/components/TestBridgeListener";
import { useGlobalData } from "@/lib/hooks/useGlobalData";
import type { GlobalData } from "@/lib/schemas/global";

type ProtocolContextValue = {
  styfi: StyfiClient;
  veyfi: VeyfiClient;
  isMock: boolean;
  usesMockBackend: boolean;
  publicClient: PublicClient | null;
  globalData: GlobalData | null;
};

const ProtocolContext = createContext<ProtocolContextValue | null>(null);

export function ProtocolProvider({ children }: { children: ReactNode }) {
  const preferMocks =
    process.env.NEXT_PUBLIC_USE_MOCKS === "true" ||
    process.env.NEXT_PUBLIC_E2E === "true";

  const mockClients = useMemo(
    () => ({
      styfi: createMockStyfiClient({ latencyMs: 600 }),
      veyfi: createMockVeyfiClient({ latencyMs: 600 }),
    }),
    []
  );

  const { data: globalData } = useGlobalData();
  const { data: walletClient } = useWalletClient();

  const publicClient = useMemo<PublicClient | null>(() => {
    if (!walletClient?.chain) return null;
    if (walletClient.chain.id !== mainnet.id) return null;
    return createPublicClient({
      chain: walletClient.chain,
      transport: custom({
        request: walletClient.request.bind(walletClient),
      }),
      batch: { multicall: true },
    });
  }, [walletClient]);

  const value = useMemo(() => {
    // If user wants mocks, ignore the public client
    if (preferMocks) {
      return {
        styfi: mockClients.styfi,
        veyfi: mockClients.veyfi,
        isMock: true,
        usesMockBackend: true,
        publicClient: null,
        globalData: null,
      };
    }

    return {
      styfi: new OnchainStyfiClient(publicClient, globalData ?? null),
      veyfi: new OnchainVeyfiClient(publicClient, globalData ?? null),
      isMock: false,
      usesMockBackend: false,
      publicClient,
      globalData: globalData ?? null,
    };
  }, [preferMocks, publicClient, globalData, mockClients]);

  return (
    <ProtocolContext.Provider value={value}>
      {children}
      <TestBridgeListener
        styfi={value.styfi}
        veyfi={value.veyfi}
        enabled={process.env.NEXT_PUBLIC_E2E === "true"}
      />
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
