"use client";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  ledgerWallet,
  metaMaskWallet,
  rabbyWallet,
  rainbowWallet,
  safeWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, mock } from "wagmi";
import { mainnet } from "wagmi/chains";
import { defineChain, http, fallback } from "viem";
import { E2E_MOCK_ADDRESS } from "@/lib/constants";
import { assertProductionRuntimeInvariants } from "@/lib/runtime/invariants";

assertProductionRuntimeInvariants("web3/wagmi");

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;
const rawRpcUrls = (process.env.NEXT_PUBLIC_RPC_URLS ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
const isProd = process.env.NODE_ENV === "production";
if (isProd && rawRpcUrls.length === 0) {
  throw new Error(
    "NEXT_PUBLIC_RPC_URLS must include at least one non-empty RPC URL in production."
  );
}
const rpcUrls =
  rawRpcUrls.length > 0 ? rawRpcUrls : mainnet.rpcUrls.default.http;

if (!isProd && rawRpcUrls.length === 0) {
  console.warn(
    "NEXT_PUBLIC_RPC_URLS is not set. Falling back to default mainnet RPC."
  );
}
if (!isProd && rpcUrls.length === 0) {
  console.warn("No RPC URLs configured. Wallet RPC will be required for reads.");
}

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
    default: { http: rpcUrls },
    public: { http: rpcUrls },
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

const isE2E = process.env.NEXT_PUBLIC_E2E === "true";
const httpTransport = (url: string) =>
  http(url, {
    retryCount: 1,
  });
const transports = {
  [mainnetFork.id]:
    rpcUrls.length > 1
      ? fallback(rpcUrls.map((url) => httpTransport(url)))
      : httpTransport(rpcUrls[0]),
};

export const wagmiConfig = isE2E
  ? createConfig({
      chains: [mainnetFork],
      transports,
      ssr: true,
      connectors: [
        mock({
          accounts: [E2E_MOCK_ADDRESS],
          features: {
            defaultConnected: true,
            reconnect: true,
          },
        }),
      ],
    })
  : getDefaultConfig({
      appName: "Yearn Governance Apps",
      projectId: projectId || "demo-project-id",
      wallets: [
        {
          groupName: "Popular",
          wallets: [
            metaMaskWallet,
            coinbaseWallet,
            rainbowWallet,
            walletConnectWallet,
          ],
        },
        {
          groupName: "Other",
          wallets: [safeWallet, rabbyWallet, ledgerWallet],
        },
      ],
      // Using the fork definition for Chain ID 1
      chains: [mainnetFork],
      transports,
      ssr: true,
    });
