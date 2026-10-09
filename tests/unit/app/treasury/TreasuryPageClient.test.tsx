import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreasuryDashboard } from "@/app/treasury/TreasuryPageClient";
import { createTreasuryMockFeed } from "@/lib/clients/treasury/mock";

const feed = createTreasuryMockFeed();

function show(props: Partial<React.ComponentProps<typeof TreasuryDashboard>> = {}) {
  return render(<TreasuryDashboard feed={feed} now={feed.generatedAt + 60} onRefresh={vi.fn()} {...props} />);
}

function holding(symbol: string) {
  return screen.getByRole("button", { name: new RegExp("^Position details — " + symbol + " at ") });
}

describe("treasury dashboard", () => {
  it("keeps snapshot coverage in Portfolio and closed history in Loans", async () => {
    const user = userEvent.setup();
    show({ feed: createTreasuryMockFeed("partial") });
    expect(screen.getByText("Snapshot details")).toBeVisible();
    expect(screen.queryByText("Closed positions")).not.toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Loans & allocations" }));
    expect(screen.queryByText("Snapshot details")).not.toBeInTheDocument();
    expect(screen.queryByText("6 tracked positions unpriced")).not.toBeInTheDocument();
    const history = screen.getByText("Closed positions").closest("details")!;
    expect(history).not.toHaveAttribute("open");
    await user.click(within(history).getByText("Closed positions"));
    expect(history).toHaveAttribute("open");
    await user.click(screen.getByRole("tab", { name: "Portfolio" }));
    expect(screen.queryByText("Closed positions")).not.toBeInTheDocument();
    expect(screen.getByText("Snapshot details")).toBeVisible();
  });

  it("keeps a large unpriced inventory unmounted until expanded and preserves meaningful positions", async () => {
    const user = userEvent.setup();
    const data = createTreasuryMockFeed("partial");
    data.holdings.push(...Array.from({ length: 350 }, (_, i) => ({
      ...data.holdings[0],
      id: "unknown-" + i,
      positionKey: null,
      purpose: "unspecified" as const,
      purposeNote: null,
      accountableTeamId: null,
      asset: { ...data.holdings[0].asset, symbol: "UNKNOWN" + i, name: "Unknown token " + i, address: "0x" + (i + 100).toString(16).padStart(40, "0") },
    })));
    data.summary.holdingCount += 350;
    data.summary.unpricedHoldingCount += 350;
    show({ feed: data });
    expect(holding("yvUSD")).toBeVisible();
    expect(screen.getByText("6 tracked positions unpriced")).toBeVisible();
    const other = screen.getByTestId("treasury-collapsed-ychad-other");
    expect(within(other).getByRole("button")).toHaveAttribute("aria-expanded", "false");
    expect(within(other).getByText("350")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Position details — UNKNOWN0 at/ })).not.toBeInTheDocument();
    expect(screen.getByText("356 holdings without a price.")).not.toBeVisible();
    await user.click(within(other).getByRole("button"));
    expect(holding("UNKNOWN0")).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox", { name: "Accountable team" }), "vaults");
    expect(screen.queryByTestId("treasury-collapsed-ychad-other")).not.toBeInTheDocument();
    expect(holding("yvUSD")).toBeVisible();
  });

  it("defaults to portfolio and changes the valuation without hiding YFI holdings", async () => {
    const user = userEvent.setup();
    show();
    expect(screen.getByRole("tab", { name: "Portfolio" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Example data")).toBeVisible();
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$8,974,236");
    expect(screen.getAllByRole("table")).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Exclude YFI" }));
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$2,974,236");
    expect(holding("YFI")).toBeVisible();
  });

  it("groups Robo custody together, omits empty accounts, and retains custody references", async () => {
    const user = userEvent.setup();
    const data = createTreasuryMockFeed();
    data.accounts.push(
      { ...data.accounts[2], id: "robo-auction", label: "Robo auction", kind: "robo-inventory", address: "0x1111111111111111111111111111111111111111" },
      { ...data.accounts[0], id: "empty", label: "Empty wallet", address: "0x2222222222222222222222222222222222222222" },
    );
    data.holdings.push({ ...data.holdings[4], id: "auction-weth", accountId: "robo-auction" });
    show({ feed: data });
    expect(screen.getAllByTestId(/^treasury-account-group-/)).toHaveLength(3);
    const select = screen.getByRole("combobox", { name: "Treasury address" });
    expect(within(select).getAllByRole("option")).toHaveLength(4);
    expect(within(select).queryByRole("option", { name: "Robo auction" })).not.toBeInTheDocument();
    expect(screen.queryByText("Empty wallet")).not.toBeInTheDocument();
    await user.selectOptions(select, "robo-treasury");
    expect(screen.getAllByRole("button", { name: /Position details — WETH at/ })).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Position details — WETH at Robo auction" }));
    expect(screen.getByRole("link", { name: "Robo auction ↗" })).toHaveAttribute("href", "https://etherscan.io/address/0x1111111111111111111111111111111111111111");
  });

  it("separates small priced balances from unknown prices, including small strategic assets", async () => {
    const user = userEvent.setup();
    const data = createTreasuryMockFeed();
    data.holdings.push(
      { ...data.holdings[0], id: "small", asset: { ...data.holdings[0].asset, symbol: "SMALL" }, valuation: { ...data.holdings[0].valuation, usdValue: "99.99", usdValueExcludingYfi: "0" } },
      { ...data.holdings[0], id: "unpriced", asset: { ...data.holdings[0].asset, symbol: "VALUABLE" }, valuation: { usdValue: null, usdValueExcludingYfi: null, source: null, asOf: null, status: "unavailable" } },
    );
    show({ feed: data });
    expect(holding("VALUABLE")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Position details — SMALL at/ })).not.toBeInTheDocument();
    const small = screen.getByTestId("treasury-collapsed-ychad-small");
    await user.click(within(small).getByRole("button", { name: /Small balances · below \$100/ }));
    expect(holding("SMALL")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Exclude YFI" }));
    expect(holding("SMALL")).toBeVisible();
  });

  it("filters by address and team while retaining the global headline", async () => {
    const user = userEvent.setup();
    show();
    await user.selectOptions(screen.getByRole("combobox", { name: "Treasury address" }), "treasury");
    await user.selectOptions(screen.getByRole("combobox", { name: "Accountable team" }), "vaults");
    expect(holding("yvUSD")).toBeVisible();
    expect(screen.queryByRole("button", { name: /Position details — YFI at/ })).not.toBeInTheDocument();
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$8,974,236");
    expect(screen.getByText("All treasury addresses")).toBeVisible();
  });

  it("keeps funded, current and pending amounts separate and never renders expected returns", async () => {
    const user = userEvent.setup();
    const data = createTreasuryMockFeed();
    const loan = data.allocations.find((item) => item.id === "aerodrome-liquidity-loan")!;
    loan.expectedReturn.note = "DO NOT DISPLAY EXPECTED RETURN";
    show({ feed: data });
    await user.click(screen.getByRole("tab", { name: "Loans & allocations" }));
    for (const name of ["Position", "Funded", "Current", "Team", "Reference"]) {
      expect(screen.getByRole("columnheader", { name })).toBeVisible();
    }
    const aerodrome = screen.getByTestId("treasury-allocation-aerodrome-liquidity-loan");
    expect(within(aerodrome).getAllByRole("listitem", { name: "33 YFI" })).toHaveLength(1);
    expect(within(aerodrome).getAllByRole("listitem", { name: "61 WETH" })).toHaveLength(1);
    expect(within(aerodrome).getByRole("img", { name: "Not available" })).toHaveTextContent("—");
    await user.click(within(aerodrome).getByRole("button"));
    expect(screen.queryByText("DO NOT DISPLAY EXPECTED RETURN")).not.toBeInTheDocument();
    expect(screen.queryByText("Provisional terms")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem", { name: "33 YFI" })).toHaveLength(1);
    const stonk = screen.getByTestId("treasury-allocation-stonk-usdg-allocation");
    expect(within(stonk).getAllByRole("img", { name: "Not available" })).toHaveLength(2);
    expect(screen.queryByRole("listitem", { name: "200,000 USDC" })).not.toBeInTheDocument();
    await user.click(within(stonk).getByRole("button"));
    expect(screen.getByText("Planned")).toBeVisible();
    expect(screen.getByRole("listitem", { name: "200,000 USDC" })).toBeVisible();
    expect(screen.getByText("Not yet funded.")).toBeVisible();
  });

  it("keeps accounting context in the expanded allocation only", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("tab", { name: "Loans & allocations" }));
    expect(screen.queryByText(/Repayments include interest/)).not.toBeInTheDocument();
    await user.click(within(screen.getByTestId("treasury-allocation-resupply-loan")).getByRole("button"));
    expect(screen.getByText(/Repayments include interest/)).toBeVisible();
  });

  it("uses fixed token icons with graceful fallback and exposes token identity", async () => {
    const user = userEvent.setup();
    show();
    const yfi = holding("YFI");
    const icon = yfi.querySelector("img")!;
    expect(icon.src).toMatch(/^https:\/\/raw\.githubusercontent\.com\/yearn\/tokenAssets\/[a-f0-9]{40}\/tokens\/1\/0x[0-9a-f]{40}\/logo-128\.png$/);
    fireEvent.error(icon);
    expect(yfi.querySelector("img")).toBeNull();
    expect(within(yfi).getByText("YF")).toBeVisible();
    await user.click(yfi);
    expect(screen.getByRole("link", { name: "Token contract: " + feed.holdings[0].asset.address })).toHaveAttribute("href", "https://etherscan.io/address/" + feed.holdings[0].asset.address);
  });

  it("uses accessible dashes for unknown prices and retains holdings after refresh failure", () => {
    show({ feed: createTreasuryMockFeed("partial"), failed: true });
    expect(within(screen.getByTestId("treasury-portfolio-value")).getByRole("img", { name: "Not available" })).toHaveTextContent("—");
    expect(screen.getByText(/Refresh unavailable/)).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Showing the last validated snapshot.");
    expect(holding("YFI")).toBeVisible();
    expect(screen.getByText("6 tracked positions unpriced")).toBeVisible();
    expect(screen.getByText("6 holdings without a price.")).not.toBeVisible();
  });

  it("shows stale observations without requiring a transport error", () => {
    show({ now: feed.generatedAt + 3600 });
    expect(screen.getByText(/Snapshot is out of date/)).toBeVisible();
  });

  it("shows loading and failure without fabricated balances", () => {
    const view = show({ feed: undefined, loading: true });
    expect(screen.getByText("Loading treasury snapshot…")).toBeVisible();
    expect(screen.queryByTestId("treasury-portfolio-value")).not.toBeInTheDocument();
    view.rerender(<TreasuryDashboard now={0} onRefresh={vi.fn()} failed />);
    expect(screen.getByRole("alert")).toHaveTextContent("Treasury snapshot unavailable");
  });
});
