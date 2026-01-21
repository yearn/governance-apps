import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnstakePanel } from "@/components/domain/UnstakePanel";

const baseProps = {
  availableBalance: 100n * 10n ** 18n,
  totalExiting: 0n,
  liquidEstimate: 0n,
  streamingEstimate: 0n,
  tokenSymbol: "YFI",
  cooldown: null,
  variant: "styfi" as const,
  onStartCooldown: vi.fn(async () => {}),
  onWithdraw: vi.fn(async () => {}),
  isSubmitting: false,
  canWithdraw: true,
  canStart: true,
  amount: 0n,
  isValid: true,
  insufficientBalance: false,
  onAmountChange: vi.fn(),
  inputValue: "",
};

describe("UnstakePanel", () => {
  it("shows withdraw button when liquid is available", () => {
    render(
      <UnstakePanel
        {...baseProps}
        totalExiting={10n * 10n ** 18n}
        liquidEstimate={5n * 10n ** 18n}
      />
    );

    expect(screen.getByRole("button", { name: /Withdraw/i })).toBeVisible();
  });

  it("shows start cooldown input when no liquid is available", () => {
    render(<UnstakePanel {...baseProps} />);

    expect(screen.getByText(/Start new cooldown/i)).toBeVisible();
  });

  it("calls onWithdraw when withdraw is clicked", async () => {
    const user = userEvent.setup();
    const onWithdraw = vi.fn(async () => {});

    render(
      <UnstakePanel
        {...baseProps}
        totalExiting={10n * 10n ** 18n}
        liquidEstimate={5n * 10n ** 18n}
        onWithdraw={onWithdraw}
      />
    );

    await user.click(screen.getByRole("button", { name: /Withdraw/i }));
    expect(onWithdraw).toHaveBeenCalledTimes(1);
  });
});
