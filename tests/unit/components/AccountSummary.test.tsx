import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountSummary } from "@/app/styfi/components/AccountSummary";
import type { ExternalPosition } from "@/app/styfi/external-positions";

const emptyBalances = {
  styfi: {
    active: 0n,
    unstaking: 0n,
    withdrawable: 0n,
    total: 0n,
  },
  styfix: {
    active: 0n,
    unstaking: 0n,
    withdrawable: 0n,
    total: 0n,
  },
} as const;

const activeBalances = {
  styfi: {
    active: 25n * 10n ** 18n,
    unstaking: 0n,
    withdrawable: 0n,
    total: 25n * 10n ** 18n,
  },
  styfix: {
    active: 0n,
    unstaking: 0n,
    withdrawable: 0n,
    total: 0n,
  },
} as const;

const externalPositions: ExternalPosition[] = [
  {
    id: "veyfi",
    name: "veYFI",
    symbol: "veYFI",
    balanceYfi: 100n * 10n ** 18n,
    statusLabel: "Locked",
    boostMultiplier: 1.5,
    href: "/veyfi",
  },
];

function renderSummary(
  balances: {
    styfi: {
      active: bigint;
      unstaking: bigint;
      withdrawable: bigint;
      total: bigint;
    };
    styfix: {
      active: bigint;
      unstaking: bigint;
      withdrawable: bigint;
      total: bigint;
    };
  },
  external: ExternalPosition[]
) {
  return render(
    <AccountSummary
      selectedAsset="stYFIx"
      onSelectAsset={vi.fn()}
      balances={balances}
      externalPositions={external}
      isLoading={false}
      isConnected
      isWrongNetwork={false}
    />
  );
}

describe("AccountSummary", () => {
  it("renders ModeComparison only when balances are zero and no external positions exist", () => {
    renderSummary(emptyBalances, []);

    expect(screen.getByText("Compare stYFI and stYFIx")).toBeInTheDocument();
    expect(screen.getByText("Variable APY")).toBeInTheDocument();
    expect(screen.getByText("Maximized APY")).toBeInTheDocument();
    expect(screen.queryByTestId("styfi-position-row")).not.toBeInTheDocument();
    expect(screen.queryByTestId("external-position-row")).not.toBeInTheDocument();
  });

  it("renders external rows and ModeComparison in hybrid state", () => {
    renderSummary(emptyBalances, externalPositions);

    expect(screen.getByText("Your Governance Positions")).toBeInTheDocument();
    expect(screen.getByTestId("external-position-row")).toBeInTheDocument();
    expect(screen.getByText("Choose How to Stake")).toBeInTheDocument();
    expect(screen.getByText("Variable APY")).toBeInTheDocument();
    expect(screen.getByText("Maximized APY")).toBeInTheDocument();
    expect(screen.queryByTestId("styfi-position-row")).not.toBeInTheDocument();
  });

  it("renders stYFI rows and external rows in active state", () => {
    renderSummary(activeBalances, externalPositions);

    expect(screen.getByText("Staked YFI")).toBeInTheDocument();
    expect(screen.getByText("Other Governance Positions")).toBeInTheDocument();
    expect(screen.getAllByTestId("styfi-position-row")).toHaveLength(1);
    expect(screen.getAllByTestId("external-position-row")).toHaveLength(1);
    expect(
      screen.queryByText("Compare stYFI and stYFIx")
    ).not.toBeInTheDocument();
  });
});
