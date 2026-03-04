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

  it("renders ENS names for actor links when available", () => {
    const account = "0x1111111111111111111111111111111111111111";
    const receiver = "0x2222222222222222222222222222222222222222";
    const caller = "0x3333333333333333333333333333333333333333";
    const message = renderTelegramMessage(
      baseAction({
        kind: "staked",
        tokenSymbol: "stYFI",
        user: account,
        owner: account,
        receiver,
        caller,
        amounts: {
          assets: ONE,
          shares: ONE,
        },
      }),
      {
        ensNamesByAddress: new Map<string, string>([
          [account.toLowerCase(), "alice.eth"],
          [receiver.toLowerCase(), "vault.yfi.eth"],
          [caller.toLowerCase(), "keeper.yearn.eth"],
        ]),
      },
    );

    expect(message).toContain(
      "Account: <a href=\"https://etherscan.io/address/0x1111111111111111111111111111111111111111\">alice.eth</a>",
    );
    expect(message).toContain(
      "Receiver: <a href=\"https://etherscan.io/address/0x2222222222222222222222222222222222222222\">vault.yfi.eth</a>",
    );
    expect(message).toContain(
      "Caller: <a href=\"https://etherscan.io/address/0x3333333333333333333333333333333333333333\">keeper.yearn.eth</a>",
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

  it("treats redeem fee as rate and derives fee amount from gross YFI", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "redeem",
        tokenSymbol: "upYFI",
        amounts: {
          amount: 138_840n * ONE, // 2.00 YFI gross at 69420 scale
          fee: 50_000_000_000_000_000n, // 5.00% fee rate
        },
      }),
    );

    expect(message).toContain("Sold: <b>138.84K</b> supYFI");
    expect(message).toContain("Received: <b>1.90</b> YFI");
    expect(message).toContain("Fee: <b>0.10</b> YFI (5.00%)");
    expect(message).toContain("Impact basis: <b>2.00</b> YFI gross (net <b>1.90</b> YFI)");
  });

  it("keeps sdYFI and coveYFI redemption math at 1:1 scale", () => {
    for (const tokenSymbol of ["sdYFI", "coveYFI"] as const) {
      const message = renderTelegramMessage(
        baseAction({
          kind: "redeem",
          tokenSymbol,
          amounts: {
            amount: 2n * ONE,
            fee: 50_000_000_000_000_000n,
          },
        }),
      );

      expect(message).toContain(`Sold: <b>2.00</b> ${tokenSymbol}`);
      expect(message).toContain("Received: <b>1.90</b> YFI");
      expect(message).toContain("Fee: <b>0.10</b> YFI (5.00%)");
      expect(message).toContain("Impact basis: <b>2.00</b> YFI gross (net <b>1.90</b> YFI)");
    }
  });

  it("avoids impossible redeem fee percentages for low-supYFI redemptions", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "redeem",
        tokenSymbol: "upYFI",
        amounts: {
          amount: 107_440_522_061_066_280_034n,
          fee: 99_038_461_538_461_538n,
        },
      }),
    );

    expect(message).toContain("Sold: <b>107.44</b> supYFI");
    expect(message).toContain("Received: <b>0.0014</b> YFI");
    expect(message).toContain("Fee: <b>0.0002</b> YFI (9.90%)");
    expect(message).toContain("Impact basis: <b>0.0015</b> YFI gross (net <b>0.0014</b> YFI)");
    expect(message).not.toContain("6399.12%");
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

  it("renders yETH claimed-stayed alerts with impact basis, mix, debt, and footer", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "yeth_claimed_stayed",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotAmount: 20n * ONE,
          yethTotalSnapshotDebtEth: 10_000n * ONE,
          yethSnapshotExitedEth: 3_000n * ONE,
          yethSnapshotStayedEth: 5_620n * ONE,
          yethSnapshotUnclaimedEth: 1_380n * ONE,
          yethOutstandingDebtEth: 7_000n * ONE,
        },
      }),
      {
        blockTimestampSeconds: 1_800_000_000,
        yethYieldVaultAssetsEth: 2_240n * ONE,
      },
    );

    expect(message).toContain("<b>🐟 🟢 yETH Claimed &amp; Stayed</b>");
    expect(message).toContain("Impact: <b>▰▰▱▱▱ Fish</b> (<b>2/5</b>)");
    expect(message).toContain(
      "Impact basis: <b>0.20%</b> of total snapshot debt moved",
    );
    expect(message).toContain("Δ Mix: <b>Stayed +0.20%</b> • <b>Unclaimed -0.20%</b>");
    expect(message).toContain(
      "Snapshot mix: <b>Exited 30.00%</b> • <b>Stayed 56.20%</b> • <b>Unclaimed 13.80%</b>",
    );
    expect(message).toContain("Outstanding debt: <b>7.00K</b> ETH");
    expect(message).toContain(
      "Yield Vault assets: <b>2.24K</b> ETH (coverage <b>32.00%</b>)",
    );
    expect(message).toContain("<i>Block 1 • 2027-01-15 08:00 UTC</i>");
  });

  it("renders yETH withdraw whale alerts with full-share details", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "yeth_recovery_vault_withdraw",
        tokenSymbol: "yETH",
        yethWithdrawalType: "full",
        amounts: {
          yethSnapshotMoved: 1_240n * ONE,
          yethTotalSnapshotDebtEth: 10_000n * ONE,
          yethSnapshotExitedEth: 4_601n * ONE,
          yethSnapshotStayedEth: 4_099n * ONE,
          yethSnapshotUnclaimedEth: 1_300n * ONE,
          yethOutstandingDebtEth: 5_399n * ONE,
          yethSharesBurned: 1_240n * ONE,
          yethOwnerSharesBefore: 1_240n * ONE,
          yethOwnerSharesAfter: 0n,
        },
      }),
      {
        yethYieldVaultAssetsEth: 2_240n * ONE,
      },
    );

    expect(message).toContain("🚨 <b>WHALE MOVE</b>");
    expect(message).toContain("<b>🐋 💸 yETH Recovery Vault Withdraw</b>");
    expect(message).toContain("Impact: <b>▰▰▰▰▰ Whale</b> (<b>5/5</b>)");
    expect(message).toContain(
      "Impact basis: <b>12.40%</b> of total snapshot debt moved",
    );
    expect(message).toContain("Withdrawal type: <b>Full</b>");
    expect(message).toContain(
      "Shares burned: <b>1.24K</b> yswETH of <b>1.24K</b> yswETH (<b>100.00%</b>)",
    );
    expect(message).toContain("Shares remaining: <b>0.00</b> yswETH");
    expect(message).toContain("Snapshot moved to exited: <b>1.24K</b> ETH");
  });

  it("renders yETH debt-paid-down alerts without actor/tx noise", () => {
    const message = renderTelegramMessage(
      baseAction({
        kind: "yeth_debt_paid_down",
        tokenSymbol: "yETH",
        amounts: {
          yethPreviousOutstandingDebtEth: 2_910_440_000_000_000_000_000n,
          yethCurrentOutstandingDebtEth: 2_909_720_000_000_000_000_000n,
          yethPreviousRepaidPercentHundredths: 2_271n,
          yethCurrentRepaidPercentHundredths: 2_273n,
        },
      }),
    );

    expect(message).toContain("<b>🟢 yETH Debt Paid Down</b>");
    expect(message).toContain("Debt paid down: <b>0.72</b> ETH (trigger <b>0.50</b> ETH)");
    expect(message).toContain("Outstanding debt: <b>2.91K</b> → <b>2.91K</b> ETH");
    expect(message).toContain("Repaid since snapshot: <b>22.71%</b> → <b>22.73%</b>");
    expect(message).not.toContain("Impact:");
    expect(message).not.toContain("Account:");
    expect(message).not.toContain("Tx:");
  });

  it("renders yETH recovery/yield progress alerts with yETH-prefixed titles", () => {
    const recoveryMessage = renderTelegramMessage(
      baseAction({
        kind: "yeth_recovery_progress",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotStayedEth: 2_630n * ONE,
          yethPreviousRecoveryShortfallEth: 1_204_600_000_000_000_000_000n,
          yethCurrentRecoveryShortfallEth: 1_168_100_000_000_000_000_000n,
          yethPreviousRecoveryCoverageHundredths: 5_420n,
          yethCurrentRecoveryCoverageHundredths: 5_543n,
          yethCurrentRecoveryVaultAssetsEth: 1_461_900_000_000_000_000_000n,
          yethRecoveryNetFlowEth: 10n * ONE,
          yethRecoveryOrganicDeltaEth: 26_500_000_000_000_000_000n,
        },
      }),
    );
    const yieldMessage = renderTelegramMessage(
      baseAction({
        kind: "yeth_yield_capacity_down",
        tokenSymbol: "yETH",
        amounts: {
          yethOutstandingDebtEth: 2_910n * ONE,
          yethPreviousYieldVaultAssetsEth: 1_740n * ONE,
          yethCurrentYieldVaultAssetsEth: 1_660n * ONE,
          yethPreviousYieldCoverageHundredths: 5_980n,
          yethCurrentYieldCoverageHundredths: 5_704n,
          yethYieldNetFlowEth: -50n * ONE,
          yethYieldOrganicDeltaEth: -30n * ONE,
        },
      }),
    );

    expect(recoveryMessage).toContain("<b>🟢 yETH Recovery Progress</b>");
    expect(recoveryMessage).toContain("Recovery Vault assets: <b>1.46K</b> ETH");
    expect(recoveryMessage).toContain(
      "Drivers: Net user flow <b>+10.00</b> ETH • Yield/fees/donations <b>+26.50</b> ETH",
    );
    expect(yieldMessage).toContain("<b>🔻 yETH Yield Capacity Down</b>");
    expect(yieldMessage).toContain(
      "Net claim flow: <b>-50.00</b> ETH • Organic delta (yield/loss): <b>-30.00</b> ETH",
    );
  });

  it("labels first-baseline yETH recovery/yield transitions as initialized", () => {
    const recoveryMessage = renderTelegramMessage(
      baseAction({
        kind: "yeth_recovery_setback",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotStayedEth: 661_330_000_000_000_000_000n,
          yethPreviousRecoveryShortfallEth: 0n,
          yethCurrentRecoveryShortfallEth: 449_960_000_000_000_000_000n,
          yethPreviousRecoveryCoverageHundredths: 0n,
          yethCurrentRecoveryCoverageHundredths: 3_196n,
          yethCurrentRecoveryVaultAssetsEth: 211_370_000_000_000_000_000n,
          yethRecoveryNetFlowEth: 661_330_000_000_000_000_000n,
          yethRecoveryOrganicDeltaEth: -449_960_000_000_000_000_000n,
        },
      }),
    );
    const yieldMessage = renderTelegramMessage(
      baseAction({
        kind: "yeth_yield_capacity_up",
        tokenSymbol: "yETH",
        amounts: {
          yethOutstandingDebtEth: 2_910n * ONE,
          yethPreviousYieldVaultAssetsEth: 0n,
          yethCurrentYieldVaultAssetsEth: 2_440n * ONE,
          yethPreviousYieldCoverageHundredths: 0n,
          yethCurrentYieldCoverageHundredths: 8_368n,
          yethYieldNetFlowEth: -661_330_000_000_000_000_000n,
          yethYieldOrganicDeltaEth: 3_101_330_000_000_000_000_000n,
        },
      }),
    );

    expect(recoveryMessage).toContain("<b>ℹ️ yETH Recovery Initialized</b>");
    expect(recoveryMessage).toContain(
      "Recovery baseline: shortfall <b>0.00</b> → <b>449.96</b> ETH",
    );
    expect(yieldMessage).toContain("<b>ℹ️ yETH Yield Capacity Initialized</b>");
    expect(yieldMessage).toContain(
      "Yield Vault baseline: assets <b>0.00</b> → <b>2.44K</b> ETH",
    );
  });

  it("applies yETH impact tiers with whale at >=10%", () => {
    const totalSnapshotDebt = 10_000n * ONE;
    const info = classifyActionImpact(
      baseAction({
        kind: "yeth_claimed_exited",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotAmount: 0n,
          yethTotalSnapshotDebtEth: totalSnapshotDebt,
        },
      }),
    );
    const shrimp = classifyActionImpact(
      baseAction({
        kind: "yeth_claimed_exited",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotAmount: ONE,
          yethTotalSnapshotDebtEth: totalSnapshotDebt,
        },
      }),
    );
    const fish = classifyActionImpact(
      baseAction({
        kind: "yeth_claimed_exited",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotAmount: 10n * ONE,
          yethTotalSnapshotDebtEth: totalSnapshotDebt,
        },
      }),
    );
    const dolphin = classifyActionImpact(
      baseAction({
        kind: "yeth_claimed_exited",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotAmount: 50n * ONE,
          yethTotalSnapshotDebtEth: totalSnapshotDebt,
        },
      }),
    );
    const shark = classifyActionImpact(
      baseAction({
        kind: "yeth_claimed_exited",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotAmount: 200n * ONE,
          yethTotalSnapshotDebtEth: totalSnapshotDebt,
        },
      }),
    );
    const whale = classifyActionImpact(
      baseAction({
        kind: "yeth_claimed_exited",
        tokenSymbol: "yETH",
        amounts: {
          yethSnapshotAmount: 1_000n * ONE,
          yethTotalSnapshotDebtEth: totalSnapshotDebt,
        },
      }),
    );

    expect(info.tier.label).toBe("Info");
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
