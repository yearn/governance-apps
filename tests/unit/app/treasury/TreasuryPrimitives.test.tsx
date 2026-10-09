import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TreasuryAssetIcon } from "@/app/treasury/components/TreasuryPrimitives";
import type { TreasuryAsset } from "@/lib/schemas/treasury-feed";

const ens: TreasuryAsset = { chainId: 1, address: "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72", symbol: "ENS", name: "Ethereum Name Service", decimals: 18 };
const safe: TreasuryAsset = { chainId: 1, address: "0x5afe3855358e112b5647b952709e6165e1c1eeee", symbol: "SAFE", name: "Safe", decimals: 18 };

describe("treasury asset icon", () => {
  it("preserves initials on an image error and loads the next asset independently", () => {
    const view = render(<TreasuryAssetIcon asset={ens} />);
    const image = view.container.querySelector("img")!;
    expect(image.src).toContain("/19785/standard/");
    expect(image).toHaveAttribute("alt", "");
    fireEvent.error(image);
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container).toHaveTextContent("EN");
    view.rerender(<TreasuryAssetIcon asset={safe} />);
    const nextImage = view.container.querySelector("img")!;
    expect(nextImage.src).toContain("/27032/standard/");
    expect(view.container).not.toHaveTextContent("EN");
    fireEvent.error(nextImage);
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container).toHaveTextContent("SA");
  });

  it("does not trigger another request after a failed source is rerendered", () => {
    const view = render(<TreasuryAssetIcon asset={ens} />);
    fireEvent.error(view.container.querySelector("img")!);
    view.rerender(<TreasuryAssetIcon asset={{ ...ens }} small />);
    expect(view.container.querySelector("img")).toBeNull();
    expect(view.container).toHaveTextContent("EN");
  });
});
