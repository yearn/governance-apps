// state/protocol.tsx
"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { StyfiClient } from "@/lib/clients/styfi";
import { VeyfiClient } from "@/lib/clients/veyfi";
import { createMockStyfiClient } from "@/lib/clients/styfi/mock";
import { createMockVeyfiClient } from "@/lib/clients/veyfi/mock";

type ProtocolContextValue = {
  styfi: StyfiClient;
  veyfi: VeyfiClient;
  isMock: boolean;
};

const ProtocolContext = createContext<ProtocolContextValue | null>(null);

function createClients(useMocks: boolean) {
  if (useMocks) {
    console.log("🔌 [Protocol] Initializing MOCK clients");
    return {
      styfi: createMockStyfiClient({ latencyMs: 800 }),
      veyfi: createMockVeyfiClient({ latencyMs: 800 }),
    };
  }

  throw new Error(
    "On-chain clients are not yet implemented. Please set NEXT_PUBLIC_USE_MOCKS=true"
  );
}

export function ProtocolProvider({ children }: { children: ReactNode }) {
  const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

  const value = useMemo(() => {
    const { styfi, veyfi } = createClients(useMocks);
    return {
      styfi,
      veyfi,
      isMock: useMocks,
    };
  }, [useMocks]);

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
