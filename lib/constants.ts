import { Address } from "viem";

// --- StYFI Domain ---
export const MOCK_STYFI_ADDRESS: Address =
  "0x1000000000000000000000000000000000000001";
export const MOCK_STYFI_PLUS_ADDRESS: Address =
  "0x1000000000000000000000000000000000000002";
export const MOCK_YFI_ADDRESS: Address =
  "0x0000000000000000000000000000000000000001";

export const SPENDER_STYFI = MOCK_STYFI_ADDRESS;
export const SPENDER_STYFI_PLUS = MOCK_STYFI_PLUS_ADDRESS;

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

// Mock Spenders
// In the FRD, we stake LLYFI into a contract. Let's define a mock "Staker" address.
export const MOCK_VEYFI_STAKER_ADDRESS: Address =
  "0x3000000000000000000000000000000000000001";
export const SPENDER_LLYFI_STAKER = MOCK_VEYFI_STAKER_ADDRESS;
