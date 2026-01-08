import { Address } from "viem";

// --- StYFI Domain ---
export const STYFI_ADDRESS: Address =
  "0x3F5b310B78Bb18961A5D8a7Eef2E065560a61108";
export const STYFIX_ADDRESS: Address =
  "0xf22CCE6C874868dAc2753fC760926b89bc58382f";
export const YFI_ADDRESS: Address =
  "0xD4c188F035793EEcaa53808Cc067099100b653Ba";
export const REWARD_CLAIMER_ADDRESS: Address =
  "0x6bdC8B4A0Da7Cb8191c1e4c28c8931162A67eF86";

// Mocks for local dev (kept for fallback)
export const MOCK_STYFI_ADDRESS: Address =
  "0x1000000000000000000000000000000000000001";
export const MOCK_STYFIX_ADDRESS: Address =
  "0x1000000000000000000000000000000000000002";
export const MOCK_YFI_ADDRESS: Address =
  "0x0000000000000000000000000000000000000001";

// Spenders
export const SPENDER_STYFI = STYFI_ADDRESS;
export const SPENDER_STYFIX = STYFIX_ADDRESS;

// --- Reward Configuration ---
export const REWARD_TOKEN_CONFIG = {
  // REWARD token from deployment.json
  address: "0x4FeC571e38EB31ae8c8C51B8b6Bcb404514dC822" as Address,
  symbol: "yvUSDC", // Assuming REWARD maps to yvUSDC per standard
  name: "Yearn yvUSDC-1 Vault",
  decimals: 18,
} as const;

// --- VeYFI / LLYFI Domain ---
// Mock Tokens
export const MOCK_SDYFI_ADDRESS: Address =
  "0x2000000000000000000000000000000000000001";
export const MOCK_UPYFI_ADDRESS: Address =
  "0x2000000000000000000000000000000000000002";
export const MOCK_COVEYFI_ADDRESS: Address =
  "0x2000000000000000000000000000000000000003";

// Map Address -> Symbol for Mock Logic
export const MOCK_LLYFI_MAP: Record<string, "sdYFI" | "upYFI" | "coveYFI"> = {
  [MOCK_SDYFI_ADDRESS.toLowerCase()]: "sdYFI",
  [MOCK_UPYFI_ADDRESS.toLowerCase()]: "upYFI",
  [MOCK_COVEYFI_ADDRESS.toLowerCase()]: "coveYFI",
};

export const MOCK_VEYFI_STAKER_ADDRESS: Address =
  "0x3000000000000000000000000000000000000001";
export const SPENDER_LLYFI_STAKER = MOCK_VEYFI_STAKER_ADDRESS;
