// lib/constants.ts
import { Address, parseUnits } from "viem";
import type { LlyfiTokenId } from "./clients/veyfi/types";
import deployment from "./deployment.json";

// Protocol Genesis Timestamp (from deployment.json)
export const GENESIS = BigInt(deployment.GENESIS);

// Time Constants
export const STREAM_DURATION = 14 * 24 * 60 * 60; // 14 days
export const EPOCH_LENGTH = 14 * 24 * 60 * 60; // 14 days

// --- StYFI Domain ---
export const STYFI_ADDRESS: Address = deployment.STYFI as Address;
export const STYFIX_ADDRESS: Address = deployment.STYFIX as Address;
export const YFI_ADDRESS: Address = deployment.YFI as Address;
export const REWARD_CLAIMER_ADDRESS: Address =
  deployment.REWARD_CLAIMER as Address;
export const REWARD_DISTRIBUTOR_ADDRESS: Address =
  deployment.REWARD_DISTRIBUTOR as Address;
export const STYFI_REWARD_DISTRIBUTOR_ADDRESS: Address =
  deployment.STYFI_REWARD_DISTRIBUTOR as Address;
export const STYFIX_REWARD_DISTRIBUTOR_ADDRESS: Address =
  deployment.STYFIX_REWARD_DISTRIBUTOR as Address;
export const STAKING_MIDDLEWARE: Address =
  deployment.STAKING_MIDDLEWARE as Address;

// --- VeYFI Domain ---
export const VEYFI_ADDRESS: Address = deployment.VEYFI as Address;
export const VEYFI_REWARD_DISTRIBUTOR_ADDRESS: Address =
  deployment.VEYFI_REWARD_DISTRIBUTOR as Address;

// Snapshot Total (Denominator)
// Kept constant as per spec.
export const TOTAL_SNAPSHOT_YFI = parseUnits("500", 18);

// Mocks for local dev (kept for fallback)
export const MOCK_STYFI_ADDRESS: Address =
  "0x1000000000000000000000000000000000000001";
export const MOCK_STYFIX_ADDRESS: Address =
  "0x1000000000000000000000000000000000000002";
export const MOCK_YFI_ADDRESS: Address =
  "0x0000000000000000000000000000000000000001";
export const E2E_MOCK_ADDRESS: Address =
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

// Spenders
export const SPENDER_STYFI = STYFI_ADDRESS;
export const SPENDER_STYFIX = STYFIX_ADDRESS;

// --- Reward Configuration ---
export const REWARD_TOKEN_CONFIG = {
  address: deployment.REWARD as Address,
  symbol: "yvUSDC-1",
  name: "Yearn yvUSDC-1 Vault",
  decimals: 18,
  vaultUrl:
    "https://yearn.fi/vaults/1/0xBe53A109B494E5c9f97b9Cd39Fe969BE68BF6204",
} as const;

// --- VeYFI / LLYFI Domain ---

const LIQUID_LOCKER_COLUMNS = deployment.LIQUID_LOCKERS;

// Liquid Lockers Configuration mapped from deployment.json arrays
export const LIQUID_LOCKERS: ReadonlyArray<{
  symbol: LlyfiTokenId;
  name: string;
  token: Address;
  depositor: Address;
  scale: bigint;
  capacity: bigint;
  index: number;
}> = LIQUID_LOCKER_COLUMNS.NAME.map((name, i) => {
  const symbolPrefix = LIQUID_LOCKER_COLUMNS.SYMBOL?.[i];
  if (!symbolPrefix) {
    throw new Error(`Missing liquid locker symbol prefix for: ${name}`);
  }

  return {
    symbol: `${symbolPrefix}YFI` as LlyfiTokenId,
    name,
    token: LIQUID_LOCKER_COLUMNS.TOKEN[i] as Address,
    depositor: LIQUID_LOCKER_COLUMNS.DEPOSITOR[i] as Address,
    scale: BigInt(LIQUID_LOCKER_COLUMNS.SCALE[i]),
    capacity: BigInt(LIQUID_LOCKER_COLUMNS.CAPACITY[i]),
    index: i,
  };
});

export const LIQUID_LOCKER_REDEMPTION_ADDRESS: Address =
  deployment.LIQUID_LOCKER_REDEMPTION as Address;

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
