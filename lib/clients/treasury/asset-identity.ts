import type { TreasuryAsset } from "@/lib/schemas/treasury-feed";

const canonicalAssets = {
  USDC: { symbol: "USDC", address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", source: "https://developers.circle.com/stablecoins/usdc-contract-addresses" },
  USDT: { symbol: "USDT", address: "0xdac17f958d2ee523a2206206994597c13d831ec7", source: "https://tether.to/en/supported-protocols/" },
  SAFE: { symbol: "SAFE", address: "0x5afe3855358e112b5647b952709e6165e1c1eeee", source: "https://safefoundation.org/token" },
} as const;

// Reviewed observations from the treasury inventory, not ticker-based detection.
// These contracts use an issuer's name or a visual lookalike, but differ from its published Ethereum address.
const lookalikes: Readonly<Record<string, keyof typeof canonicalAssets>> = {
  "0x211c1eb92d74cbda58ba82116502fd02dd8f319e": "USDC",
  "0xa04a3a553548090a7b81d2de75b8a08ee45860e1": "USDC",
  "0x89d3ac7c32aa14bee6fa90e041241dc4eebbdfb3": "USDC",
  "0x94a2a4d842f522dac0e793f2f9ad08058997d06d": "USDT",
  "0xb44d28295e3d7c898c087a1cb209a444ded5e4c1": "USDT",
  "0xff3a7ee33203f5d3c69c309b5425b0e3fefb736b": "USDT",
  "0x0b39bb088f03b0baea1aac64aaeab85e714c76e2": "USDT",
  "0x9ae357521153fb07be6f5792ce7a49752638fbb7": "SAFE",
};

/** A presentation classification only; never changes balances or producer valuations. */
export function treasuryLookalike(asset: TreasuryAsset) {
  if (asset.chainId !== 1 || asset.address === null) return null;
  const issuer = lookalikes[asset.address.toLowerCase()];
  return issuer ? canonicalAssets[issuer] : null;
}
