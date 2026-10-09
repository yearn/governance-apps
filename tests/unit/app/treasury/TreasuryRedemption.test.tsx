import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreasuryDashboard } from "@/app/treasury/TreasuryPageClient";
import { createTreasuryMockFeed } from "@/lib/clients/treasury/mock";

const contract = "0x4707c855323545223fa2ba4150a83950f6f53b6e";

function show(scenario: "redemption" | "redemption-funded" = "redemption") {
  const feed = createTreasuryMockFeed(scenario);
  render(<TreasuryDashboard feed={feed} now={feed.generatedAt + 60} onRefresh={vi.fn()} />);
  const button = screen.getByRole("button", { name: "Position details — dYFI at ychad.eth" });
  return { button, row: button.closest("tr")! };
}

describe("dYFI redemption reference", () => {
  it("qualifies the included value and shows exact funding details without treating inventory as proceeds", async () => {
    const user = userEvent.setup();
    const { button, row } = show();
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$2,977,236");
    expect(screen.getByText("Includes redemption reference")).toBeVisible();
    expect(within(row).getByText("$3,000")).toBeVisible();
    expect(within(row).getByText("Redemption reference")).toBeVisible();
    expect(within(row).getByText("Awaiting YFI funding")).toBeVisible();
    expect(screen.queryByText("ETH payment")).not.toBeInTheDocument();
    await user.click(button);
    expect(screen.getByText("1.250000000000000001 ETH")).toBeVisible();
    expect(screen.getByText("0 YFI")).toBeVisible();
    expect(screen.getByRole("link", { name: "Redemption contract: " + contract })).toHaveAttribute("href", "https://etherscan.io/address/" + contract);
  });

  it("removes the reference qualifier when excluding YFI while preserving the holding and funding state", async () => {
    const user = userEvent.setup();
    const { button, row } = show();
    await user.click(screen.getByRole("button", { name: "Exclude YFI" }));
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$2,974,236");
    expect(screen.queryByText("Includes redemption reference")).not.toBeInTheDocument();
    expect(screen.queryByText("Redemption reference", { exact: true })).not.toBeInTheDocument();
    expect(within(row).getByText("$0")).toBeVisible();
    expect(within(row).getByText("Awaiting YFI funding")).toBeVisible();
    expect(button).toBeVisible();
    await user.click(button);
    expect(screen.getByText("1.250000000000000001 ETH")).toBeVisible();
  });

  it("shows available funding for the exact held balance and retains the global reference note through filters", async () => {
    const user = userEvent.setup();
    const { button, row } = show("redemption-funded");
    expect(within(row).getByText("Redemption reference")).toBeVisible();
    expect(screen.queryByText("Awaiting YFI funding")).not.toBeInTheDocument();
    await user.click(button);
    expect(screen.getByText("YFI funding available")).toBeVisible();
    expect(screen.getByText("12 YFI")).toBeVisible();
    await user.selectOptions(screen.getByRole("combobox", { name: "Treasury address" }), "treasury");
    expect(screen.queryByRole("button", { name: "Position details — dYFI at ychad.eth" })).not.toBeInTheDocument();
    expect(screen.getByText("Includes redemption reference")).toBeVisible();
    expect(screen.getByTestId("treasury-portfolio-value")).toHaveTextContent("$2,977,236");
  });
});
