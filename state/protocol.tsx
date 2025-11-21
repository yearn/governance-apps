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

function createClients(preferMocks: boolean) {
  if (!preferMocks) {
    console.warn(
      "[Protocol] On-chain clients are not yet implemented; falling back to mocks. Set NEXT_PUBLIC_USE_MOCKS=true to silence this warning."
    );
  } else {
    console.log("🔌 [Protocol] Initializing MOCK clients");
  }

  return {
    styfi: createMockStyfiClient({ latencyMs: 800 }),
    veyfi: createMockVeyfiClient({ latencyMs: 800 }),
    isMock: true,
  };
}

export function ProtocolProvider({ children }: { children: ReactNode }) {
  // Default to on-chain (per docs); explicit opt-in for mocks.
  const preferMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

  const value = useMemo(() => {
    const { styfi, veyfi, isMock } = createClients(preferMocks);
    return {
      styfi,
      veyfi,
      isMock,
    };
  }, [preferMocks]);

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
