// web3/rainbowkit.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";
import { ReactNode } from "react";
import { QueryProviders } from "@/state/query-client";

export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      {/* QueryClientProvider must be inside WagmiProvider but outside RainbowKitProvider */}
      <QueryProviders>
        <RainbowKitProvider theme={darkTheme()}>{children}</RainbowKitProvider>
      </QueryProviders>
    </WagmiProvider>
  );
}
