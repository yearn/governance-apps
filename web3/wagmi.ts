"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import { defineChain } from "viem";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

// Define the fork chain overriding Mainnet (Chain ID 1)
const mainnetFork = defineChain({
  ...mainnet,
  id: 1,
  name: "Mainnet Fork",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://178.63.2.245/mainnet/f/o/r/k"] },
    public: { http: ["http://178.63.2.245/mainnet/f/o/r/k"] },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
  batch: {
    multicall: true,
  },
});

if (!projectId) {
  console.warn("NEXT_PUBLIC_WC_PROJECT_ID is not set.");
}

export const wagmiConfig = getDefaultConfig({
  appName: "Yearn Governance Apps",
  projectId: projectId || "demo-project-id",
  // Using the fork definition for Chain ID 1
  chains: [mainnetFork],
  ssr: true,
});
