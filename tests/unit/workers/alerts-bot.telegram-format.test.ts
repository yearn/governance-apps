import { describe, expect, it } from "vitest";
import { formatAmount, shortAddress } from "@/workers/alerts-bot/src/format";
import {
  classifyActionImpact,
  renderTelegramMessage,
  shouldPersistSkippedAction,
} from "@/workers/alerts-bot/src/messages";
import type { NormalizedAction } from "@/workers/alerts-bot/src/types";

const ONE = 10n ** 18n;

function baseAction(overrides: Partial<NormalizedAction>): NormalizedAction {
  return {
    kind: "staked",
    tokenSymbol: "stYFI",
    user: "0x1111111111111111111111111111111111111111",
    amounts: {},
    txHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    blockNumber: 1,
    logIndex: 0,
    ...overrides,
  };
}

describe("alerts-bot format utilities", () => {
  it("formats values with two decimals and suffixes", () => {
    expect(formatAmount(12_345_678_900_000_000_000n)).toBe("12.35");
    expect(formatAmount(1_200n * ONE)).toBe("1.20K");
    expect(formatAmount(2_500_000n * ONE)).toBe("2.50M");
    expect(formatAmount(9_900_000_000n * ONE)).toBe("9.90B");
  });

  it("shortens addresses for display", () => {
    expect(shortAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe(
      "0x1234...5678",
    );
  });
});

describe("alerts-bot Telegram rendering", () => {
  it("renders stYFI stake notifications with etherscan links", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "staked",
        tokenSymbol: "stYFI",
        owner: "0x1111111111111111111111111111111111111111",
        receiver: "0x2222222222222222222222222222222222222222",
        caller: "0x3333333333333333333333333333333333333333",
        amounts: {
          assets: 12_345n * ONE,
          shares: 12_345n * ONE,
        },
      }),
    );

    expect(message).toContain("<b>🐋 🟢 stYFI Staked</b>");
    expect(message).toContain("Impact: <b>▰▰▰▰▰ Whale</b> (<b>5/5</b>)");
    expect(message).not.toContain("Impact basis:");
    expect(message).toContain("Staked: <b>12.35K</b> YFI");
    expect(message).not.toContain("Received:");
    expect(message).toContain(
      "Receiver: <a href=\"https://etherscan.io/address/0x2222222222222222222222222222222222222222\">",
    );
    expect(message).toContain(
      "Tx: <a href=\"https://etherscan.io/tx/0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\">",
    );
  });

  it("renders upYFI redemption using supYFI labels and fee line", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "redeem",
        tokenSymbol: "upYFI",
        amounts: {
          amount: 69_420n * ONE,
          fee: 50_000_000_000_000_000n,
        },
      }),
    );

    expect(message).toContain("<b>🐟 💸 Redeemed supYFI for YFI</b>");
    expect(message).toContain("Impact: <b>▰▰▱▱▱ Fish</b> (<b>2/5</b>)");
    expect(message).toContain("Sold: <b>69.42K</b> supYFI");
    expect(message).toContain("Received: <b>0.95</b> YFI");
    expect(message).toContain("Fee: <b>0.05</b> YFI (5.00%)");
    expect(message).toContain("Impact basis: <b>1.00</b> YFI gross (net <b>0.95</b> YFI)");
  });

  it("renders lock updates with explicit delta amount line", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "update",
        tokenSymbol: "veYFI",
        amounts: {
          amount: 8n * ONE,
          locktime: 2_100_000n,
          previousAmount: 5n * ONE,
          previousLocktime: 2_000_000n,
        },
      }),
    );

    expect(message).toContain("<b>🐟 🗓️ Legacy veYFI Lock Updated</b>");
    expect(message).toContain("Δ Locked: <b>+3.00</b> YFI");
    expect(message).toContain("Unlock was: <b>1970-01-24 03:33 UTC</b>");
    expect(message).not.toContain("Previous:");
  });

  it("skips duplicate penalty-only legacy events", () => {
    const action = baseAction({
      kind: "penalty",
      tokenSymbol: "veYFI",
      amounts: { amount: ONE / 2n },
    });
    const message = renderTelegramMessage(action);

    expect(message).toBeNull();
    expect(shouldPersistSkippedAction(action)).toBe(true);
  });

  it("does not persist unknown null-rendered templates", () => {
    const action = baseAction({
      kind: "redeem",
      tokenSymbol: "unknown(0x1234)",
      amounts: { amount: ONE },
    });
    expect(renderTelegramMessage(action)).toBeNull();
    expect(shouldPersistSkippedAction(action)).toBe(false);
  });

  it("uses the updated YFI impact thresholds for sizing tiers", () => {
    const shrimp = classifyActionImpact(
      baseAction({
        kind: "staked",
        tokenSymbol: "stYFI",
        amounts: { assets: ONE / 2n },
      }),
    );
    const fish = classifyActionImpact(
      baseAction({
        kind: "staked",
        tokenSymbol: "stYFI",
        amounts: { assets: ONE },
      }),
    );
    const dolphin = classifyActionImpact(
      baseAction({
        kind: "staked",
        tokenSymbol: "stYFI",
        amounts: { assets: 5n * ONE },
      }),
    );
    const shark = classifyActionImpact(
      baseAction({
        kind: "staked",
        tokenSymbol: "stYFI",
        amounts: { assets: 15n * ONE },
      }),
    );
    const whale = classifyActionImpact(
      baseAction({
        kind: "staked",
        tokenSymbol: "stYFI",
        amounts: { assets: 40n * ONE },
      }),
    );

    expect(shrimp.tier.label).toBe("Shrimp");
    expect(fish.tier.label).toBe("Fish");
    expect(dolphin.tier.label).toBe("Dolphin");
    expect(shark.tier.label).toBe("Shark");
    expect(whale.tier.label).toBe("Whale");
  });

  it("shows cove redemption facility balances for cove buy/sell alerts", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "redeem",
        tokenSymbol: "coveYFI",
        amounts: {
          amount: 2n * ONE,
          fee: 0n,
        },
      }),
      {
        redemptionFacilitySnapshot: {
          yfiBalance: 120n * ONE,
          tokenBalance: 450n * ONE,
          tokenSymbol: "coveYFI",
        },
      },
    );

    expect(message).toContain("Facility after: <b>120.00</b> YFI / <b>450.00</b> coveYFI");
  });

  it("shows USD on sdYFI and coveYFI stake lines without conversion line", () => {
    for (const tokenSymbol of ["sdYFI", "coveYFI"] as const) {
      const message = renderTelegramMessage(
        baseAction({
          kind: "staked",
          tokenSymbol,
          amounts: {
            assets: 2n * ONE,
            shares: 2n * ONE,
          },
        }),
        {
          yfiPriceCents: 1_000_000n,
        },
      );

      expect(message).toContain(`Staked: <b>2.00</b> ${tokenSymbol} (<b>$20,000.00</b>)`);
      expect(message).not.toContain("≈ <b>2.00</b> YFI");
    }
  });
});
