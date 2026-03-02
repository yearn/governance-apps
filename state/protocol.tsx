// state/protocol.tsx
"use client";

import {
  createContext,
  useContext,
  useMemo,
  ReactNode,
} from "react";
import { StyfiClient } from "@/lib/clients/styfi";
import { VeyfiClient } from "@/lib/clients/veyfi";
import { YethClient } from "@/lib/clients/yeth";
import { createMockStyfiClient } from "@/lib/clients/styfi/mock";
import { createMockVeyfiClient } from "@/lib/clients/veyfi/mock";
import { createMockYethClient } from "@/lib/clients/yeth/mock";
import { OnchainStyfiClient } from "@/lib/clients/styfi/onchain";
import { OnchainVeyfiClient } from "@/lib/clients/veyfi/onchain"; // [New]
import { OnchainYethClient } from "@/lib/clients/yeth/onchain";
import { usePublicClient, useWalletClient } from "wagmi";
import type { PublicClient } from "viem";
import { mainnet } from "wagmi/chains";
import { TestBridgeListener } from "@/components/TestBridgeListener";
import { useGlobalData } from "@/lib/hooks/useGlobalData";
import { useYethGlobalData } from "@/lib/hooks/useYethGlobalData";
import type { GlobalData } from "@/lib/schemas/global";
import type { YethGlobalData } from "@/lib/schemas/yeth-global";
import { assertProductionRuntimeInvariants } from "@/lib/runtime/invariants";

assertProductionRuntimeInvariants("state/protocol");

type ProtocolContextValue = {
  styfi: StyfiClient;
  veyfi: VeyfiClient;
  yeth: YethClient;
  isMock: boolean;
  usesMockBackend: boolean;
  yethUsesMockBackend: boolean;
  publicClient: PublicClient | null;
  globalData: GlobalData | null;
  yethGlobalData: YethGlobalData | null;
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
      yeth: createMockYethClient({ latencyMs: 300 }),
    }),
    []
  );

  const { data: globalData } = useGlobalData();
  const { data: yethGlobalData } = useYethGlobalData(!preferMocks);
  const { data: walletClient } = useWalletClient();
  const rpcPublicClient = usePublicClient({ chainId: mainnet.id });
  const walletChainId = walletClient?.chain?.id;

  const publicClient = useMemo<PublicClient | null>(() => {
    if (walletChainId !== mainnet.id) return null;
    return rpcPublicClient ?? null;
  }, [rpcPublicClient, walletChainId]);

  const value = useMemo(() => {
    // If user wants mocks, ignore the public client
    if (preferMocks) {
      return {
        styfi: mockClients.styfi,
        veyfi: mockClients.veyfi,
        yeth: mockClients.yeth,
        isMock: true,
        usesMockBackend: true,
        yethUsesMockBackend: true,
        publicClient: null,
        globalData: null,
        yethGlobalData: null,
      };
    }

    return {
      styfi: new OnchainStyfiClient(publicClient, globalData ?? null),
      veyfi: new OnchainVeyfiClient(publicClient, globalData ?? null),
      yeth: new OnchainYethClient(publicClient, yethGlobalData ?? null),
      isMock: false,
      usesMockBackend: false,
      yethUsesMockBackend: false,
      publicClient,
      globalData: globalData ?? null,
      yethGlobalData: yethGlobalData ?? null,
    };
  }, [preferMocks, publicClient, globalData, yethGlobalData, mockClients]);

  return (
    <ProtocolContext.Provider value={value}>
      {children}
      <TestBridgeListener
        styfi={value.styfi}
        veyfi={value.veyfi}
        yeth={value.yeth}
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

export function useOptionalProtocol() {
  return useContext(ProtocolContext);
}
