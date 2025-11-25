import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Address } from "viem";
import {
  createMockVeyfiClient,
  resetMockVeyfiStore,
} from "@/lib/clients/veyfi/mock";
import {
  MOCK_SDYFI_ADDRESS,
  MOCK_VEYFI_STAKER_ADDRESS,
} from "@/lib/constants";

describe("MockVeyfiClient", () => {
  const user = "0x000000000000000000000000000000000000bEEF" as Address;
  const defaultScenario = process.env.NEXT_PUBLIC_SCENARIO;

  beforeEach(() => {
    resetMockVeyfiStore();
    process.env.NEXT_PUBLIC_SCENARIO = "standard";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SCENARIO = defaultScenario;
  });

  it("throws when executing prepared tx without address context", async () => {
    const client = createMockVeyfiClient({ latencyMs: 0 });
    const prepared = await client.prepareStakeLlyfi("sdYFI", 1n);
    await expect(prepared()).rejects.toThrow(/No address context/i);
  });

  it("updates allowances via debugSetAllowance", async () => {
    const client = createMockVeyfiClient({ latencyMs: 0 });
    await client.getAccountState(user); // init

    client.debugSetAllowance?.(
      user,
      MOCK_SDYFI_ADDRESS,
      MOCK_VEYFI_STAKER_ADDRESS,
      7n
    );

    const state = await client.getAccountState(user);
    const sdToken = state.llyfiTokens.find((t) => t.symbol === "sdYFI");
    expect(sdToken?.allowance).toBe(7n);
  });

  it("enforces cooldown completion before withdraw", async () => {
    const client = createMockVeyfiClient({ latencyMs: 0 });
    await client.getAccountState(user);

    const stake = await client.prepareStakeLlyfi("sdYFI", 2n * 10n ** 18n);
    await stake();
    const startCooldown = await client.prepareStartCooldownLlyfi(
      "sdYFI",
      1n * 10n ** 18n
    );
    await startCooldown();

    const withdraw = await client.prepareWithdrawLlyfi("sdYFI");
    await expect(withdraw()).rejects.toThrow(/Cooldown not complete/i);
  });

  it("blocks redemption when caps are exhausted", async () => {
    process.env.NEXT_PUBLIC_SCENARIO = "caps-exhausted";
    const client = createMockVeyfiClient({ latencyMs: 0 });
    const state = await client.getAccountState(user);
    expect(state.redemptionCaps.globalUsed).toBe(state.redemptionCaps.globalLimit);

    const redeem = await client.prepareRedeemLlyfi("sdYFI", 1n);
    await expect(redeem()).rejects.toThrow(/cap/);
  });
});
