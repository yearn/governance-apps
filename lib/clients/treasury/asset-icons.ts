import type { TreasuryAsset } from "@/lib/schemas/treasury-feed";
import { treasuryAssetIconUrl } from "./display";

// Reviewed 2026-10-09 against the official Yearn asset repository:
// https://github.com/yearn/tokenAssets/tree/614e8aa9acf30ed66575ed2e38ae27d9779a165d/tokens/1
// Direct pinned files avoid successful generic-placeholder responses from the API.
const YEARN_ASSET_REVISION = "614e8aa9acf30ed66575ed2e38ae27d9779a165d";
const YEARN_ASSETS = new Set([
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84", // stETH
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  "0xf939e0a03fb07f59a73314e73794be0e57ac1b4e", // crvUSD
  "0xdc035d45d973e3ec169d2276ddab16f1e407384f", // USDS
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  "0x23346b04a7f55b8760e5860aa5a77383d63491cd", // ysyBOLD
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0x6e9455d109202b426169f0d8f01a3332dae160f3", // yCRV LP
  "0x790a60024bc3aea28385b60480f15a0771f26d09", // yvCurve-YFIETH
  "0x9d39a5de30e57443bff2a8307a4256c8797a3497", // sUSDe
  "0xc97232527b62efb0d8ed38cf3ea103a6cca4037e", // yCRV LP
  "0xd533a949740bb3306d119cc777fa900ba034cd52", // CRV
  "0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e", // YFI
  "0x111111111117dc0aa78b770fa6a738034120c302", // 1INCH
  "0x41252e8691e964f7de35156b68493bab6797a275", // dYFI
  "0x4da27a545c0c5b758a6ba100e3a049001de870f5", // stkAAVE
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9", // AAVE
]);

// Exact Ethereum contract identities and image IDs from Uniswap's mainnet list:
// https://github.com/Uniswap/default-token-list/blob/583cb696cc15778536fe0ddd416de5bd81be2023/src/tokens/mainnet.json
// The standard-size variants were decoded and checked before inclusion.
const ALTERNATE_ASSETS: Readonly<Record<string, string>> = {
  "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72": "https://assets.coingecko.com/coins/images/19785/standard/acatxTm8_400x400.jpg?1635850140", // ENS
  "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b": "https://assets.coingecko.com/coins/images/15585/standard/convex.png?1621256328", // CVX
  "0x5afe3855358e112b5647b952709e6165e1c1eeee": "https://assets.coingecko.com/coins/images/27032/standard/Artboard_1_copy_8circle-1.png?1696526084", // SAFE
  "0xcbb7c0000ab88b473b1f5afd9ef808440eed33bf": "https://assets.coingecko.com/coins/images/40143/standard/cbbtc.webp", // cbBTC
};

/** Presentation metadata only. Never infer identity, ownership, or value from a ticker. */
export function treasuryAssetIconSource(asset: TreasuryAsset): string {
  const address = asset.address?.toLowerCase();
  if (asset.chainId === 1 && address) {
    if (YEARN_ASSETS.has(address)) {
      return "https://raw.githubusercontent.com/yearn/tokenAssets/" + YEARN_ASSET_REVISION + "/tokens/1/" + address + "/logo-128.png";
    }
    const alternate = ALTERNATE_ASSETS[address];
    if (alternate) return alternate;
  }
  return treasuryAssetIconUrl(asset);
}
