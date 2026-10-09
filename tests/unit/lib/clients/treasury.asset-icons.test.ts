import { describe, expect, it } from "vitest";
import { treasuryAssetIconSource } from "@/lib/clients/treasury/asset-icons";
import type { TreasuryAsset } from "@/lib/schemas/treasury-feed";

const token = (address: string | null, symbol = "TOKEN"): TreasuryAsset => ({
  chainId: 1, address, symbol, name: symbol, decimals: 18,
});

describe("treasury reviewed asset icons", () => {
  it.each([
    ["ENS", "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72", "/19785/"],
    ["SAFE", "0x5afe3855358e112b5647b952709e6165e1c1eeee", "/27032/"],
    ["cbBTC", "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf", "/40143/"],
    ["CVX", "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b", "/15585/"],
  ])("uses the reviewed image for %s", (symbol, address, imageId) => {
    const url = new URL(treasuryAssetIconSource(token(address, symbol)));
    expect(url.origin).toBe("https://assets.coingecko.com");
    expect(url.pathname).toContain(imageId);
    expect(url.pathname).toContain("/standard/");
  });

  it.each([
    ["1INCH", "0x111111111117dc0aa78b770fa6a738034120c302"],
    ["AAVE", "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9"],
    ["CRV", "0xd533a949740bb3306d119cc777fa900ba034cd52"],
    ["dYFI", "0x41252e8691e964f7de35156b68493bab6797a275"],
    ["stkAAVE", "0x4da27a545c0c5b758a6ba100e3a049001de870f5"],
    ["yCRV LP", "0x6e9455d109202b426169f0d8f01a3332dae160f3"],
  ])("uses a pinned official Yearn image for %s", (symbol, address) => {
    const url = treasuryAssetIconSource(token(address, symbol));
    expect(url).toBe("https://raw.githubusercontent.com/yearn/tokenAssets/614e8aa9acf30ed66575ed2e38ae27d9779a165d/tokens/1/" + address + "/logo-128.png");
  });

  it("normalizes address casing without using ticker or metadata URLs", () => {
    const asset = Object.assign(token("0x5AFE3855358E112B5647B952709E6165E1C1EEEE", "Different label"), { logoURI: "https://untrusted.example/image.svg" });
    expect(treasuryAssetIconSource(asset)).toContain("/27032/");
    expect(treasuryAssetIconSource(token("0x9ae357521153fb07be6f5792ce7a49752638fbb7", "SAFE"))).toBe("https://token-assets-one.vercel.app/api/tokens/1/0x9ae357521153fb07be6f5792ce7a49752638fbb7/logo-128.png");
  });

  it("keeps unlisted assets and native ETH on the fixed Yearn service", () => {
    const unknown = "0x1111111111111111111111111111111111111111";
    expect(treasuryAssetIconSource(token(unknown, "ENS"))).toBe("https://token-assets-one.vercel.app/api/tokens/1/" + unknown + "/logo-128.png");
    expect(treasuryAssetIconSource(token(null, "ETH"))).toBe("https://token-assets-one.vercel.app/api/chains/1/logo-128.png");
  });
});
