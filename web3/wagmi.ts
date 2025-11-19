// web3/wagmi.ts
"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

if (!projectId) {
  // Not fatal in dev, but useful to see
  console.warn(
    "NEXT_PUBLIC_WC_PROJECT_ID is not set. WalletConnect may fail to initialize."
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "Yearn Governance Apps",
  projectId: projectId || "demo-project-id",
  chains: [mainnet],
  ssr: true, // Next.js App Router, SSR enabled
  // you can add `transports` later if you want custom RPCs
});
