import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Tabs } from "@/components/ui/Tabs";

describe("Tabs", () => {
  it("does not trigger onChange when clicking a disabled tab", () => {
    const onChange = vi.fn();

    render(
      <Tabs
        activeTab="stake"
        onChange={onChange}
        variant="line"
        tabs={[
          { id: "stake", label: "Stake" },
          { id: "trade", label: "Trade", disabled: true },
        ]}
      />
    );

    const tradeTab = screen.getByRole("tab", { name: /trade/i });
    expect(tradeTab).toBeDisabled();

    fireEvent.click(tradeTab);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows tooltip text for disabled tab", async () => {
    render(
      <Tabs
        activeTab="stake"
        onChange={() => undefined}
        variant="line"
        tabs={[
          { id: "stake", label: "Stake" },
          {
            id: "trade",
            label: "Trade",
            disabled: true,
            tooltip: "Available once redemption requirements are met.",
          },
        ]}
      />
    );

    const tradeTab = screen.getByRole("tab", { name: /trade/i });
    fireEvent.mouseEnter(tradeTab);
    expect(
      await screen.findByText("Available once redemption requirements are met.")
    ).toBeInTheDocument();
  });
});
