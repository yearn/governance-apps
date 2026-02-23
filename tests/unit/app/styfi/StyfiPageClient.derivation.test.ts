import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { deriveExternalPositions } from "@/app/styfi/external-positions";
import type { VeyfiAccountState } from "@/lib/clients/veyfi/types";
import { LIQUID_LOCKERS } from "@/lib/constants";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000001" as Address;
const SDYFI_ADDRESS = "0x0000000000000000000000000000000000000002" as Address;
const UPYFI_ADDRESS = "0x0000000000000000000000000000000000000003" as Address;
const COVEYFI_ADDRESS = "0x0000000000000000000000000000000000000004" as Address;
const UPYFI_SCALE =
  LIQUID_LOCKERS.find((locker) => locker.symbol === "upYFI")?.scale ?? 1n;

function buildAccount(overrides?: Partial<VeyfiAccountState>): VeyfiAccountState {
  const base: VeyfiAccountState = {
    address: ZERO_ADDRESS,
    veYfi: {
      legacyBalance: 0n,
      lockedAmount: 0n,
      migrationEligible: true,
      migrated: false,
      unlockTime: 0,
      boostEpochs: 0,
    },
    llyfiTokens: [
      {
        symbol: "sdYFI",
        name: "StakeDAO",
        address: SDYFI_ADDRESS,
        depositorAddress: ZERO_ADDRESS,
        walletBalance: 0n,
        stakedBalance: 0n,
        cooldownBalance: 0n,
        withdrawable: 0n,
        cooldown: null,
        allowance: 0n,
        redemptionAllowance: 0n,
        lockedYfi: 0n,
        veyfiBoost: 1.3,
        totalSupply: 0n,
        stakedAssets: 0n,
        depositorTotalSupply: 0n,
        depositorCapacity: 0n,
        exchangeRate: 10n ** 18n,
        redemption: {
          enabled: true,
          capacity: 0n,
          used: 0n,
          inventory: 0n,
          fee: 0n,
        },
      },
      {
        symbol: "upYFI",
        name: "1UP",
        address: UPYFI_ADDRESS,
        depositorAddress: ZERO_ADDRESS,
        walletBalance: 0n,
        stakedBalance: 0n,
        cooldownBalance: 0n,
        withdrawable: 0n,
        cooldown: null,
        allowance: 0n,
        redemptionAllowance: 0n,
        lockedYfi: 0n,
        veyfiBoost: 1.8,
        totalSupply: 0n,
        stakedAssets: 0n,
        depositorTotalSupply: 0n,
        depositorCapacity: 0n,
        exchangeRate: 10n ** 18n,
        redemption: {
          enabled: true,
          capacity: 0n,
          used: 0n,
          inventory: 0n,
          fee: 0n,
        },
      },
      {
        symbol: "coveYFI",
        name: "Cove",
        address: COVEYFI_ADDRESS,
        depositorAddress: ZERO_ADDRESS,
        walletBalance: 0n,
        stakedBalance: 0n,
        cooldownBalance: 0n,
        withdrawable: 0n,
        cooldown: null,
        allowance: 0n,
        redemptionAllowance: 0n,
        lockedYfi: 0n,
        veyfiBoost: 1.1,
        totalSupply: 0n,
        stakedAssets: 0n,
        depositorTotalSupply: 0n,
        depositorCapacity: 0n,
        exchangeRate: 10n ** 18n,
        redemption: {
          enabled: true,
          capacity: 0n,
          used: 0n,
          inventory: 0n,
          fee: 0n,
        },
      },
    ],
    inventory: {
      availableYfi: 0n,
      feeBps: 0,
    },
  };

  return {
    ...base,
    ...overrides,
    veYfi: overrides?.veYfi ?? base.veYfi,
    llyfiTokens: overrides?.llyfiTokens ?? base.llyfiTokens,
    inventory: overrides?.inventory ?? base.inventory,
  };
}

describe("deriveExternalPositions", () => {
  it("ignores veYFI lockedAmount when migrated is false", () => {
    const account = buildAccount({
      veYfi: {
        legacyBalance: 0n,
        lockedAmount: 100n * 10n ** 18n,
        migrationEligible: true,
        migrated: false,
        unlockTime: 1_800_000_000,
        boostEpochs: 95,
      },
    });

    const positions = deriveExternalPositions(account, 1);
    expect(positions).toHaveLength(0);
  });

  it("aggregates staked+cooldown+withdrawable and filters zero-balance tokens", () => {
    const account = buildAccount({
      veYfi: {
        legacyBalance: 0n,
        lockedAmount: 0n,
        migrationEligible: true,
        migrated: true,
        unlockTime: 1_800_000_000,
        boostEpochs: 95,
      },
      llyfiTokens: [
        {
          ...buildAccount().llyfiTokens[0],
          stakedBalance: 40n * 10n ** 18n,
          cooldownBalance: 5n * 10n ** 18n,
          withdrawable: 3n * 10n ** 18n,
        },
        {
          ...buildAccount().llyfiTokens[1],
          stakedBalance: 0n,
          cooldownBalance: 0n,
          withdrawable: 0n,
        },
        {
          ...buildAccount().llyfiTokens[2],
          stakedBalance: 0n,
          cooldownBalance: 2n * 10n ** 18n,
          withdrawable: 0n,
        },
      ],
    });

    const positions = deriveExternalPositions(account, 1);
    const sdYfi = positions.find((position) => position.symbol === "sdYFI");
    const coveYfi = positions.find((position) => position.symbol === "coveYFI");
    const upYfi = positions.find((position) => position.symbol === "upYFI");

    expect(sdYfi?.symbol).toBe("sdYFI");
    expect(sdYfi?.subLabel).toBe("StakeDAO");
    expect(sdYfi?.activeYfi).toBe(40n * 10n ** 18n);
    expect(sdYfi?.unstakingYfi).toBe(5n * 10n ** 18n);
    expect(sdYfi?.withdrawableYfi).toBe(3n * 10n ** 18n);
    expect(sdYfi?.balanceYfi).toBe(48n * 10n ** 18n);
    expect(coveYfi?.symbol).toBe("coveYFI");
    expect(coveYfi?.subLabel).toBe("Cove");
    expect(coveYfi?.activeYfi).toBe(0n);
    expect(coveYfi?.unstakingYfi).toBe(2n * 10n ** 18n);
    expect(coveYfi?.withdrawableYfi).toBe(0n);
    expect(coveYfi?.balanceYfi).toBe(2n * 10n ** 18n);
    expect(upYfi).toBeUndefined();
  });

  it("converts supYFI totals to YFI equivalents using scale", () => {
    const supYfiAmount = 4_760_257_9691n * 10n ** 14n;
    const account = buildAccount({
      veYfi: {
        legacyBalance: 0n,
        lockedAmount: 0n,
        migrationEligible: true,
        migrated: true,
        unlockTime: 1_800_000_000,
        boostEpochs: 95,
      },
      llyfiTokens: [
        {
          ...buildAccount().llyfiTokens[0],
          stakedBalance: 0n,
          cooldownBalance: 0n,
          withdrawable: 0n,
        },
        {
          ...buildAccount().llyfiTokens[1],
          stakedBalance: supYfiAmount,
          cooldownBalance: 0n,
          withdrawable: 0n,
        },
        {
          ...buildAccount().llyfiTokens[2],
          stakedBalance: 0n,
          cooldownBalance: 0n,
          withdrawable: 0n,
        },
      ],
    });

    const positions = deriveExternalPositions(account, 1);
    const upYfi = positions.find((position) => position.symbol === "upYFI");

    expect(upYfi?.activeYfi).toBe(supYfiAmount);
    expect(upYfi?.balanceYfi).toBe(supYfiAmount / UPYFI_SCALE);
  });

  it("maps migrated veYFI with unlock time metadata", () => {
    const unlockTime = 1_800_000_000;
    const account = buildAccount({
      veYfi: {
        legacyBalance: 0n,
        lockedAmount: 100n * 10n ** 18n,
        migrationEligible: true,
        migrated: true,
        unlockTime,
        boostEpochs: 95,
      },
    });

    const positions = deriveExternalPositions(account, 1);
    const veyfi = positions.find((position) => position.id === "veyfi");

    expect(veyfi?.symbol).toBe("veYFI");
    expect(veyfi?.subLabel).toBe("Migrated lock");
    expect(veyfi?.activeYfi).toBe(100n * 10n ** 18n);
    expect(veyfi?.unstakingYfi).toBe(0n);
    expect(veyfi?.withdrawableYfi).toBe(0n);
    expect(veyfi?.unlockTime).toBe(unlockTime);
    expect(veyfi?.balanceYfi).toBe(100n * 10n ** 18n);
    expect(veyfi?.boostMultiplier).toBeCloseTo(1.9038461538, 10);
  });

  it("floors migrated veYFI boost at 1.00x after boost epochs are exhausted", () => {
    const account = buildAccount({
      veYfi: {
        legacyBalance: 0n,
        lockedAmount: 50n * 10n ** 18n,
        migrationEligible: true,
        migrated: true,
        unlockTime: 1_800_000_000,
        boostEpochs: 20,
      },
    });

    const positions = deriveExternalPositions(account, 40);
    const veyfi = positions.find((position) => position.id === "veyfi");

    expect(veyfi?.boostMultiplier).toBe(1);
  });

  it("places veYFI below all LLYFI rows", () => {
    const unlockTime = 1_800_000_000;
    const account = buildAccount({
      veYfi: {
        legacyBalance: 0n,
        lockedAmount: 100n * 10n ** 18n,
        migrationEligible: true,
        migrated: true,
        unlockTime,
        boostEpochs: 95,
      },
      llyfiTokens: [
        {
          ...buildAccount().llyfiTokens[0],
          stakedBalance: 1n * 10n ** 18n,
        },
        {
          ...buildAccount().llyfiTokens[1],
          stakedBalance: 2n * 10n ** 18n,
        },
        {
          ...buildAccount().llyfiTokens[2],
          stakedBalance: 3n * 10n ** 18n,
        },
      ],
    });

    const positions = deriveExternalPositions(account, 1);

    expect(positions.map((position) => position.symbol)).toEqual([
      "sdYFI",
      "upYFI",
      "coveYFI",
      "veYFI",
    ]);
  });
});
