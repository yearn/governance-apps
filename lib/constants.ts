// lib/constants.ts
import { Address, parseUnits } from "viem";

// Protocol Genesis Timestamp (Thu Jan 01 2026 00:00:00 GMT+0000)
export const GENESIS = 1767225600n;

// Time Constants
export const STREAM_DURATION = 14 * 24 * 60 * 60; // 14 days
export const EPOCH_LENGTH = 14 * 24 * 60 * 60; // 14 days

// --- StYFI Domain ---
export const STYFI_ADDRESS: Address =
  "0x83e7E1DB75aB8906d9C65494eD8C8FdE26bc2cD6";
export const STYFIX_ADDRESS: Address =
  "0x2C67B814Ab161fdcf5740b569e51488A141cE216";
export const YFI_ADDRESS: Address =
  "0xD4c188F035793EEcaa53808Cc067099100b653Ba";
export const REWARD_CLAIMER_ADDRESS: Address =
  "0x3F5b310B78Bb18961A5D8a7Eef2E065560a61108";

// --- VeYFI Domain ---
export const VEYFI_ADDRESS: Address =
  "0x0687C5969De745c05Ce339ceeE1614e39502819D";
export const VEYFI_REWARD_DISTRIBUTOR_ADDRESS: Address =
  "0x9972f931d914eaEFA95aff0bF132bB3D428508E9";

// Snapshot Total (Denominator)
export const TOTAL_SNAPSHOT_YFI = parseUnits("500", 18);

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

// Liquid Lockers Configuration
export const LIQUID_LOCKERS = [
  {
    symbol: "sdYFI",
    name: "StakeDAO",
    token: "0xfD7A9D25013f5F692D2f302EFe9aFfb68177331f" as Address,
    depositor: "0x39E7768d2907D8351d4ec13eE663C3847421A6A6" as Address,
    scale: 1n,
    capacity: 236764578940037056317n,
    index: 0,
  },
  {
    symbol: "upYFI",
    name: "1UP",
    token: "0x349cAeD9fB87824edecE5085384C6BC3b1ede0ae" as Address,
    depositor: "0x17e1A1823A0B636aed997C9A1C6711C71752577c" as Address,
    scale: 69420n,
    capacity: 206323123369248430382n,
    index: 1,
  },
  {
    symbol: "coveYFI",
    name: "Cove",
    token: "0xc13613E24dFD63BE001545A8D874f84932EDc560" as Address,
    depositor: "0xFdf71Ab59341d37e2978590cbe3D28482a1f68DC" as Address,
    scale: 1n,
    capacity: 75870020320465005479n,
    index: 2,
  },
] as const;

export const LIQUID_LOCKER_REDEMPTION_ADDRESS: Address =
  "0xe1cbB5567e96333258518c825aB15011B216F4f1";

// Constants for Spenders in VeYFI domain (dynamic based on locker)
export const SPENDER_REDEMPTION = LIQUID_LOCKER_REDEMPTION_ADDRESS;

// Legacy Mocks (kept to prevent breakage in mock-mode, though unused in on-chain)
export const MOCK_SDYFI_ADDRESS: Address =
  "0x2000000000000000000000000000000000000001";
export const MOCK_UPYFI_ADDRESS: Address =
  "0x2000000000000000000000000000000000000002";
export const MOCK_COVEYFI_ADDRESS: Address =
  "0x2000000000000000000000000000000000000003";

export const MOCK_LLYFI_MAP: Record<string, "sdYFI" | "upYFI" | "coveYFI"> = {
  [MOCK_SDYFI_ADDRESS.toLowerCase()]: "sdYFI",
  [MOCK_UPYFI_ADDRESS.toLowerCase()]: "upYFI",
  [MOCK_COVEYFI_ADDRESS.toLowerCase()]: "coveYFI",
};

export const MOCK_VEYFI_STAKER_ADDRESS: Address =
  "0x3000000000000000000000000000000000000001";
export const SPENDER_LLYFI_STAKER = MOCK_VEYFI_STAKER_ADDRESS;

export const MOCK_REDEMPTION_ADDRESS: Address =
  "0x9999000000000000000000000000000000000001";
