import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreasuryDashboard } from "@/app/treasury/TreasuryPageClient";
import { createTreasuryMockFeed } from "@/lib/clients/treasury/mock";

const feed = createTreasuryMockFeed();
function show(props: Partial<React.ComponentProps<typeof TreasuryDashboard>> = {}) {
  return render(<TreasuryDashboard feed={feed} now={feed.generatedAt + 60} onRefresh={vi.fn()} {...props} />);
}

describe("treasury dashboard", () => {
  it("keeps large unpriced inventories collapsed while preserving curated positions", async () => {
    const user = userEvent.setup();
    const data = createTreasuryMockFeed("partial");
    data.holdings.push(...Array.from({ length: 350 }, (_, i) => ({ ...data.holdings[0], id: "unknown-" + i, positionKey: null, purpose: "unspecified" as const, accountableTeamId: null, asset: { ...data.holdings[0].asset, symbol: "UNKNOWN" + i, name: "Unknown token " + i, address: "0x" + (i + 100).toString(16).padStart(40, "0") } })));
    show({ feed: data });
    expect(screen.getByRole("heading", { name: "yvUSD" })).toBeVisible();
    const other = screen.getByTestId("treasury-other-holdings");
    expect(other).not.toHaveAttribute("open");
    expect(within(other).getByText("350")).toBeVisible();
    expect(screen.getByRole("heading", { name: "UNKNOWN0" })).not.toBeVisible();
    await user.click(within(other).getByText("Other unpriced holdings"));
    expect(screen.getByRole("heading", { name: "UNKNOWN0" })).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox", { name: "Accountable team" }), "vaults");
    expect(screen.queryByTestId("treasury-other-holdings")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "yvUSD" })).toBeVisible();
  });

  it("defaults to portfolio, labels examples and exposes YFI views without changing holdings", async () => {
    const user = userEvent.setup();
    show();
    expect(screen.getByRole("tab", { name: "Portfolio" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Example snapshot")).toBeVisible();
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$8,974,236");
    await user.click(screen.getByRole("button", { name: "Exclude YFI" }));
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$2,974,236");
    expect(screen.getByRole("heading", { name: "YFI" })).toBeVisible();
  });

  it("filters by address and team and explains that headline values are global", async () => {
    const user = userEvent.setup();
    show();
    await user.selectOptions(screen.getByRole("combobox", { name: "Treasury address" }), "treasury");
    await user.selectOptions(screen.getByRole("combobox", { name: "Accountable team" }), "vaults");
    expect(screen.getByRole("heading", { name: "yvUSD" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "YFI" })).not.toBeInTheDocument();
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$8,974,236");
    expect(screen.getByText("All treasury addresses. Filters below change the list only.")).toBeVisible();
  });

  it("keeps original assets, provisional returns and pending funding separate", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("tab", { name: "Loans & allocations" }));
    const aerodrome = screen.getByTestId("treasury-allocation-aerodrome-liquidity-loan");
    expect(within(aerodrome).getAllByText("33 YFI")).toHaveLength(2);
    expect(within(aerodrome).getAllByText("61 WETH")).toHaveLength(2);
    expect(within(aerodrome).getByText("Provisional terms")).toBeVisible();
    const stonk = screen.getByTestId("treasury-allocation-stonk-usdg-allocation");
    expect(within(stonk).getByText("Planned funding")).toBeVisible();
    expect(within(stonk).queryByText("Original funding")).not.toBeInTheDocument();
    expect(within(stonk).getByText("Pending funding")).toBeVisible();
  });

  it("does not replace unknown prices with zero, and retains data on refresh failure", () => {
    show({ feed: createTreasuryMockFeed("partial"), failed: true });
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("Unavailable");
    expect(screen.getByText("Refresh unavailable")).toBeVisible();
    expect(screen.getByRole("heading", { name: "YFI" })).toBeVisible();
    expect(screen.getByText("6 holdings without a current price.")).toBeVisible();
  });

  it("shows stale observations even without a transport error", () => {
    show({ now: feed.generatedAt + 3600 });
    expect(screen.getByText("Snapshot is out of date")).toBeVisible();
  });

  it("shows explicit loading and failure states without fabricated balances", () => {
    const view = show({ feed: undefined, loading: true });
    expect(screen.getByText("Loading treasury snapshot…")).toBeVisible();
    expect(screen.queryByTestId("treasury-portfolio-value")).not.toBeInTheDocument();
    view.rerender(<TreasuryDashboard now={0} onRefresh={vi.fn()} failed />);
    expect(screen.getByRole("alert")).toHaveTextContent("Treasury snapshot unavailable");
  });
});
