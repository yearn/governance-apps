import type { Address } from "viem";

export const ybcKeys = {
  all: ["ybc"] as const,
  feed: () => [...ybcKeys.all, "feed"] as const,
  walletOverlay: (address?: Address | string | null) =>
    [
      ...ybcKeys.all,
      "wallet-overlay",
      address ? address.toLowerCase() : null,
    ] as const,
};
