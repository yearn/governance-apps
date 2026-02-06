import { describe, it, expect, beforeEach } from "vitest";
import type { Address } from "viem";
import {
  createMockVeyfiClient,
  resetMockVeyfiStore,
} from "@/lib/clients/veyfi/mock";
import { GLOBAL_WORLD_STATE } from "@/lib/mocks/world-state";
import { setFixedNow } from "@/lib/mocks/time";
import { STREAM_DURATION } from "@/lib/constants";

describe("MockVeyfiClient", () => {
  const user = "0x000000000000000000000000000000000000bEEF" as Address;

  beforeEach(() => {
    resetMockVeyfiStore();
  });

  it("marks legacy position as migrated", async () => {
    const client = createMockVeyfiClient({ latencyMs: 0 });
    await client.getAccountState(user);

    const migrate = await client.prepareMigrateVeYfi();
    await migrate();

    const state = await client.getAccountState(user);
    expect(state.veYfi?.migrated).toBe(true);
  });

  it("throws when token caps are exceeded", async () => {
    const client = createMockVeyfiClient({ latencyMs: 0 });
    await client.getAccountState(user);

    client.debugSetLlyfiBalance?.(user, "sdYFI", 1000n * 10n ** 18n);

    const redeem = await client.prepareRedeemLlyfi(
      "sdYFI",
      900n * 10n ** 18n
    );
    await expect(redeem()).rejects.toThrow(/cap/i);
  });

  it("throws when global inventory is exhausted", async () => {
    const client = createMockVeyfiClient({ latencyMs: 0 });
    await client.getAccountState(user);

    client.debugSetLlyfiBalance?.(user, "sdYFI", 1000n * 10n ** 18n);

    const redeem = await client.prepareRedeemLlyfi(
      "sdYFI",
      700n * 10n ** 18n
    );
    await expect(redeem()).rejects.toThrow(/inventory/i);
  });

  it("calculates net YFI output based on redemption fee", async () => {
    const client = createMockVeyfiClient({ latencyMs: 0 });
    await client.getAccountState(user);

    const startingYfi = GLOBAL_WORLD_STATE.get(user).yfiBalance;
    const redeem = await client.prepareRedeemLlyfi(
      "sdYFI",
      10n * 10n ** 18n
    );
    await redeem();

    const endingYfi = GLOBAL_WORLD_STATE.get(user).yfiBalance;
    const delta = endingYfi - startingYfi;
    expect(delta).toBe(95n * 10n ** 17n);
  });

  it("re-locks liquid llyfi when starting a new cooldown", async () => {
    const client = createMockVeyfiClient({ latencyMs: 0 });
    const baseAmount = 10n * 10n ** 18n;
    const addAmount = 10n * 10n ** 18n;
    const start = 3_000_000;

    setFixedNow(start);
    await client.getAccountState(user);
    client.debugSetLlyfiBalance?.(user, "sdYFI", baseAmount + addAmount);

    const stake = await client.prepareStakeLlyfi("sdYFI", baseAmount + addAmount);
    await stake();

    const firstCooldown = await client.prepareStartCooldownLlyfi(
      "sdYFI",
      baseAmount
    );
    await firstCooldown();

    const relockAt = start + STREAM_DURATION / 2;
    setFixedNow(relockAt);

    let state = await client.getAccountState(user);
    let token = state.llyfiTokens.find((x) => x.symbol === "sdYFI");
    expect(token?.withdrawable).toBe(baseAmount / 2n);

    const secondCooldown = await client.prepareStartCooldownLlyfi(
      "sdYFI",
      addAmount
    );
    await secondCooldown();

    state = await client.getAccountState(user);
    token = state.llyfiTokens.find((x) => x.symbol === "sdYFI");
    expect(token?.cooldownBalance).toBe(baseAmount + addAmount);
    expect(token?.withdrawable).toBe(0n);
    expect(token?.walletBalance).toBe(0n);
    expect(token?.cooldown?.amount).toBe(baseAmount + addAmount);
    expect(token?.cooldown?.endsAt).toBe(relockAt + STREAM_DURATION);
  });
});
