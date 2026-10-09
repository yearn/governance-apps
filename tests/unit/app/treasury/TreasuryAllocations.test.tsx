import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TreasuryAllocations } from "@/app/treasury/components/TreasuryAllocations";
import { createTreasuryMockFeed } from "@/lib/clients/treasury/mock";

describe("OTC allocation presentation", () => {
  it("distinguishes unreconciled funding from the swapper's unsold inventory", () => {
    const feed = createTreasuryMockFeed();
    const allocation = feed.allocations.find(a => a.id === "ycrv-otc-inventory")!;
    allocation.outstanding.amounts = [
      { asset: { chainId: 1, address: "0x27B5739e22ad9033bcBf192059122d163b60349D", symbol: "st-yCRV", name: "Staked yCRV", decimals: 18 }, raw: "160267977159827803419652" },
      { asset: { chainId: 1, address: "0xFCc5c47bE19d06BF83eB04298b026F81069ff65b", symbol: "yCRV", name: "Yearn CRV", decimals: 18 }, raw: "12341868450861169578298" },
    ];
    render(<TreasuryAllocations feed={feed} allocations={[allocation]} />);
    const row = screen.getByTestId("treasury-allocation-ycrv-otc-inventory");
    expect(within(row).getByText("Not reconciled")).toBeInTheDocument();
    expect(within(row).getByText("Unsold inventory")).toBeInTheDocument();
    expect(within(row).getAllByRole("listitem")).toHaveLength(2);
    expect(within(row).getByRole("listitem", { name: "160,267.977159 st-yCRV" })).toBeInTheDocument();
    expect(within(row).getByRole("listitem", { name: "12,341.86845 yCRV" })).toBeInTheDocument();
    expect(screen.queryByText(/Aggregate funding has not/)).not.toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button"));
    expect(screen.getByText(/Aggregate funding has not been reconciled/)).toBeInTheDocument();
    expect(screen.getByText(/st-yCRV vault shares and liquid yCRV/)).toBeInTheDocument();
  });
});
