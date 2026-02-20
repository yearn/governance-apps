import { describe, expect, it } from "vitest";
import type { Address } from "viem";
import { deriveExternalPositions } from "@/app/styfi/external-positions";
import type { VeyfiAccountState } from "@/lib/clients/veyfi/types";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000001" as Address;
const SDYFI_ADDRESS = "0x0000000000000000000000000000000000000002" as Address;
const UPYFI_ADDRESS = "0x0000000000000000000000000000000000000003" as Address;
const COVEYFI_ADDRESS = "0x0000000000000000000000000000000000000004" as Address;

function buildAccount(overrides?: Partial<VeyfiAccountState>): VeyfiAccountState {
  const base: VeyfiAccountState = {
    address: ZERO_ADDRESS,
    veYfi: {
      legacyBalance: 0n,
      lockedAmount: 0n,
      migrationEligible: true,
      migrated: false,
      unlockTime: 0,
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
      },
    });

    const positions = deriveExternalPositions(account, 1_700_000_000);
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

    const positions = deriveExternalPositions(account, 1_700_000_000);
    const sdYfi = positions.find((position) => position.symbol === "sdYFI");
    const coveYfi = positions.find((position) => position.symbol === "coveYFI");
    const upYfi = positions.find((position) => position.symbol === "upYFI");

    expect(sdYfi?.balanceYfi).toBe(48n * 10n ** 18n);
    expect(coveYfi?.balanceYfi).toBe(2n * 10n ** 18n);
    expect(upYfi).toBeUndefined();
  });
});
