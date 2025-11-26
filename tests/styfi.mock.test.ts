import { describe, it, expect, beforeEach } from "vitest";
import type { Address } from "viem";
import {
  createMockStyfiClient,
  resetMockStyfiStore,
} from "@/lib/clients/styfi/mock";
import {
  MOCK_YFI_ADDRESS,
  SPENDER_STYFI,
  SPENDER_STYFIX,
} from "@/lib/constants";

describe("MockStyfiClient", () => {
  const user = "0x000000000000000000000000000000000000dEaD" as Address;

  beforeEach(() => {
    resetMockStyfiStore();
    process.env.NEXT_PUBLIC_SCENARIO = "standard";
  });

  it("throws when executing prepared tx without address context", async () => {
    const client = createMockStyfiClient({ latencyMs: 0 });
    const prepared = await client.prepareStake("stYFI", 1n);
    await expect(prepared()).rejects.toThrow(/No address context/i);
  });

  it("updates allowances via debugSetAllowance for stYFI and stYFIx", async () => {
    const client = createMockStyfiClient({ latencyMs: 0 });
    await client.getAccountState(user); // ensure store exists

    client.debugSetAllowance?.(user, MOCK_YFI_ADDRESS, SPENDER_STYFI, 5n);
    client.debugSetAllowance?.(user, MOCK_YFI_ADDRESS, SPENDER_STYFIX, 6n);

    const state = await client.getAccountState(user);
    expect(state.allowances.yfiToStyfi).toBe(5n);
    expect(state.allowances.yfiToStyfiX).toBe(6n);
  });

  it("enforces cooldown completion before withdraw", async () => {
    const client = createMockStyfiClient({ latencyMs: 0 });
    await client.getAccountState(user);

    const stake = await client.prepareStake("stYFI", 10n);
    await stake();

    const startCooldown = await client.prepareStartCooldown("stYFI", 5n);
    await startCooldown();

    const withdraw = await client.prepareWithdraw("stYFI");
    await expect(withdraw()).rejects.toThrow(/Cooldown not complete/i);
  });
});
