import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { LlyfiRowCockpit } from "@/app/veyfi/components/LlyfiRowCockpit";
import { type LlyfiTokenState } from "@/lib/clients/veyfi";

vi.mock("@/lib/hooks/useEpochCountdown", () => ({
  useEpochCountdown: () => ({
    timeRemaining: "--",
    isComplete: false,
    progress: 0,
  }),
}));

vi.mock("@/app/veyfi/components/tabs/LlyfiStakeTab", () => ({
  LlyfiStakeTab: () => <div>Stake panel</div>,
}));

vi.mock("@/app/veyfi/components/tabs/LlyfiUnstakeTab", () => ({
  LlyfiUnstakeTab: () => <div>Unstake panel</div>,
}));

vi.mock("@/app/veyfi/components/tabs/LlyfiTradeTab", () => ({
  LlyfiTradeTab: () => <div>Trade panel</div>,
}));

const ONE = 10n ** 18n;

const TOKEN: LlyfiTokenState = {
  symbol: "sdYFI",
  name: "StakeDAO",
  address: "0x1111111111111111111111111111111111111111",
  depositorAddress: "0x2222222222222222222222222222222222222222",
  walletBalance: 0n,
  stakedBalance: 0n,
  cooldownBalance: 0n,
  withdrawable: 0n,
  cooldown: null,
  allowance: 0n,
  redemptionAllowance: 0n,
  lockedYfi: 0n,
  veyfiBoost: 1,
  totalSupply: 0n,
  stakedAssets: 0n,
  depositorTotalSupply: 0n,
  depositorCapacity: 0n,
  exchangeRate: ONE,
  redemption: {
    enabled: true,
    capacity: 0n,
    used: 0n,
    inventory: 0n,
    fee: 0n,
  },
};

describe("LlyfiRowCockpit info tab", () => {
  it("shows token and depositor contract links when Info tab is selected", () => {
    render(<LlyfiRowCockpit token={TOKEN} />);

    expect(screen.getByText("Stake panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Info" }));

    expect(screen.getByText("sdYFI Token")).toBeInTheDocument();
    expect(screen.getByText("Depositor Contract")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "0x1111...1111" }),
    ).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x1111111111111111111111111111111111111111",
    );
    expect(
      screen.getByRole("link", { name: "0x2222...2222" }),
    ).toHaveAttribute(
      "href",
      "https://etherscan.io/address/0x2222222222222222222222222222222222222222",
    );
  });
});
