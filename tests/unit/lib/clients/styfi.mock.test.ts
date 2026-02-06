import { describe, it, expect, beforeEach } from "vitest";
import type { Address } from "viem";
import {
  createMockStyfiClient,
  resetMockStyfiStore,
} from "@/lib/clients/styfi/mock";
import { STREAM_DURATION } from "@/lib/constants";
import { setFixedNow } from "@/lib/mocks/time";

describe("MockStyfiClient", () => {
  const user = "0x000000000000000000000000000000000000dEaD" as Address;

  beforeEach(() => {
    resetMockStyfiStore();
  });

  it("reset clears account state", async () => {
    const client = createMockStyfiClient({ latencyMs: 0 });
    await client.getAccountState(user);

    const stake = await client.prepareStake("stYFI", 10n * 10n ** 18n);
    await stake();

    let state = await client.getAccountState(user);
    expect(state.styfiActive).toBe(10n * 10n ** 18n);

    resetMockStyfiStore();
    state = await client.getAccountState(user);
    expect(state.styfiActive).toBe(0n);
    expect(state.styfiInCooldown).toBe(0n);
  });

  it("streams withdrawable linearly over the cooldown window", async () => {
    const client = createMockStyfiClient({ latencyMs: 0 });
    const amount = 100n * 10n ** 18n;
    const start = 1_000_000;

    setFixedNow(start);
    await client.getAccountState(user);

    const stake = await client.prepareStake("stYFI", amount);
    await stake();
    const startCooldown = await client.prepareStartCooldown("stYFI", amount);
    await startCooldown();

    let state = await client.getAccountState(user);
    expect(state.styfiWithdrawable).toBe(0n);

    setFixedNow(start + STREAM_DURATION / 2);
    state = await client.getAccountState(user);
    expect(state.styfiWithdrawable).toBe(amount / 2n);

    setFixedNow(start + STREAM_DURATION);
    state = await client.getAccountState(user);
    expect(state.styfiWithdrawable).toBe(amount);
  });

  it("re-locks liquid funds when starting a new cooldown", async () => {
    const client = createMockStyfiClient({ latencyMs: 0 });
    const amount = 100n * 10n ** 18n;
    const addAmount = 10n * 10n ** 18n;
    const start = 2_000_000;

    setFixedNow(start);
    await client.getAccountState(user);

    const stake = await client.prepareStake("stYFI", amount + addAmount);
    await stake();

    const startCooldown = await client.prepareStartCooldown("stYFI", amount);
    await startCooldown();

    const relockAt = start + STREAM_DURATION / 2;
    setFixedNow(relockAt);
    const beforeRelock = await client.getAccountState(user);
    expect(beforeRelock.styfiWithdrawable).toBe(amount / 2n);

    const secondCooldown = await client.prepareStartCooldown(
      "stYFI",
      addAmount
    );
    await secondCooldown();

    const state = await client.getAccountState(user);
    expect(state.styfiUnlocked).toBe(0n);
    expect(state.styfiInCooldown).toBe(amount + addAmount);
    expect(state.styfiWithdrawable).toBe(0n);
    expect(state.styfiCooldown?.amount).toBe(amount + addAmount);
    expect(state.styfiCooldown?.endsAt).toBe(relockAt + STREAM_DURATION);
  });
});
