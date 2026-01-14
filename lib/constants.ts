// lib/constants.ts
import { Address, parseUnits } from "viem";

// Protocol Genesis Timestamp (Updated from deployment.json)
export const GENESIS = 1769040000n;

// Time Constants
export const STREAM_DURATION = 14 * 24 * 60 * 60; // 14 days
export const EPOCH_LENGTH = 14 * 24 * 60 * 60; // 14 days

// --- StYFI Domain ---
export const STYFI_ADDRESS: Address =
  "0x103248602C1380A26005CC3700f6a9f1cE760cda";
export const STYFIX_ADDRESS: Address =
  "0x48ceeF6d610486a8E00e3Fcb5e57a25D5c5D0ACC";
export const YFI_ADDRESS: Address =
  "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e"; // From deployment.json YFI
export const REWARD_CLAIMER_ADDRESS: Address =
  "0x4FeC571e38EB31ae8c8C51B8b6Bcb404514dC822"; // From deployment.json REWARD_CLAIMER

// --- VeYFI Domain ---
export const VEYFI_ADDRESS: Address =
  "0x90c1f9220d90d3966FbeE24045EDd73E1d588aD5";
export const VEYFI_REWARD_DISTRIBUTOR_ADDRESS: Address =
  "0xa5C35df4d2F971fa57C682D2573e2caC3c9b6996";

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

// Spenders
export const SPENDER_STYFI = STYFI_ADDRESS;
export const SPENDER_STYFIX = STYFIX_ADDRESS;

// --- Reward Configuration ---
export const REWARD_TOKEN_CONFIG = {
  // REWARD token from deployment.json
  address: "0xBe53A109B494E5c9f97b9Cd39Fe969BE68BF6204" as Address,
  symbol: "yvUSDC",
  name: "Yearn yvUSDC-1 Vault",
  decimals: 18,
} as const;

// --- VeYFI / LLYFI Domain ---

// Liquid Lockers Configuration mapped from deployment.json arrays
export const LIQUID_LOCKERS = [
  {
    symbol: "sdYFI",
    name: "StakeDAO", // Index 0
    token: "0x97983236bE88107Cc8998733Ef73D8d969c52E37" as Address,
    depositor: "0x517Da5a6b71422CA8cA717c28aB6E61237116512" as Address,
    scale: 1n,
    capacity: 236764578940037056317n,
    index: 0,
  },
  {
    symbol: "upYFI",
    name: "1UP", // Index 1
    token: "0xCb7DCe63aBE175cA354Dcca9cc10554D255777Ee" as Address,
    depositor: "0x2da16981490b26aCE74bd517054889EFaF9053b8" as Address,
    scale: 69420n,
    capacity: 206323123369248430382n,
    index: 1,
  },
  {
    symbol: "coveYFI",
    name: "Cove", // Index 2
    token: "0xFf71841EeFca78a64421db28060855036765c248" as Address,
    depositor: "0x349cAeD9fB87824edecE5085384C6BC3b1ede0ae" as Address,
    scale: 1n,
    capacity: 75870020320465005479n,
    index: 2,
  },
] as const;

export const LIQUID_LOCKER_REDEMPTION_ADDRESS: Address =
  "0x08E3E4a84d82fF00FEc9e8103583Ed56AE5151A9";

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
