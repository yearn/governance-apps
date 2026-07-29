import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RevenueHistoryLedger } from "@/app/teams/components/RevenueDepositCard";
import type { RevenueHistoryEntry } from "@/lib/clients/teams";

const TRANSACTION_HASH =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const DEPOSITOR = "0x3333333333333333333333333333333333333333";
const CONVERTER = "0x7777777777777777777777777777777777777777";

const liveEntry: RevenueHistoryEntry = {
  id: `${TRANSACTION_HASH}-12`,
  txHash: TRANSACTION_HASH,
  logIndex: 12,
  period: 2,
  symbol: "USDC",
  amount: "123456789",
  creditedUsd: "123456789",
  convertedToSymbol: null,
  depositedBy: DEPOSITOR,
  createdAt: 1_770_250_000,
};

describe("Teams revenue history ledger", () => {
  it("uses a compact, wrapping layout for recent deposits", () => {
    const { container } = render(
      <RevenueHistoryLedger history={[liveEntry]} variant="compact" />
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText("123,456,789 USDC")).toHaveClass(
      "break-words",
      "[overflow-wrap:anywhere]"
    );
    expect(container.querySelector("article")).toHaveClass("min-w-0");
    expect(
      screen.getByRole("link", {
        name: `View Ethereum transaction ${TRANSACTION_HASH} on Etherscan`,
      })
    ).toHaveAttribute(
      "href",
      `https://etherscan.io/tx/${TRANSACTION_HASH}`
    );
  });

  it("shows transaction identity or an explicit local label instead of internal record IDs", () => {
    const localEntry: RevenueHistoryEntry = {
      ...liveEntry,
      id: "mock-platform-1770250000",
      txHash: undefined,
      logIndex: undefined,
    };

    render(<RevenueHistoryLedger history={[liveEntry, localEntry]} />);

    expect(screen.queryByText(liveEntry.id)).not.toBeInTheDocument();
    expect(screen.queryByText(localEntry.id)).not.toBeInTheDocument();
    expect(screen.getByText("Local preview")).toBeInTheDocument();
    expect(screen.getByText("Log #12")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", {
        name: `View Ethereum address ${DEPOSITOR} on Etherscan`,
      })
    ).toHaveLength(2);
    expect(screen.getAllByText("Feb 5, 2026")[0]).toHaveAttribute(
      "datetime",
      "2026-02-05T00:06:40.000Z"
    );
  });

  it("links converter contracts in history without inventing an output token", () => {
    const convertedEntry: RevenueHistoryEntry = {
      ...liveEntry,
      converterAddress: CONVERTER,
      convertedToSymbol: null,
    };

    render(<RevenueHistoryLedger history={[convertedEntry]} />);

    expect(screen.getByText("Via protocol converter")).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: `View Ethereum address ${CONVERTER} on Etherscan`,
      })
    ).toHaveAttribute("href", `https://etherscan.io/address/${CONVERTER}`);
    expect(screen.queryByText(/USDC ->/)).not.toBeInTheDocument();
  });
});
