"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet } from "wagmi/chains";
import { defineChain } from "viem";
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
// Define the chain explicitly to avoid any 'localhost' defaults from the foundry preset
const styfiFork = defineChain({
  id: 31337,
  name: "stYFI Fork",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://178.63.2.245/f/o/r/k"] },
    public: { http: ["http://178.63.2.245/f/o/r/k"] },
  },
  contracts: {
    multicall3: {
      address: "0xcA11bde05977b3631167028862bE2a173976CA11",
      blockCreated: 0,
    },
  },
  // This tells viem to automatically merge parallel readContracts into one Multicall
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
  // Put the fork FIRST so it is the default chain used by getPublicClient()
  chains: [styfiFork, mainnet],
  ssr: true,
});
