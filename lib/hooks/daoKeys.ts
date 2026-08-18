import type { Address } from "viem";

export const daoKeys = {
  all: ["dao"] as const,
  feed: () => [...daoKeys.all, "feed"] as const,
  proposal: (proposalId: string) =>
    [...daoKeys.all, "proposal", proposalId] as const,
  proposer: (address: Address | null) =>
    [...daoKeys.all, "proposer", address?.toLowerCase() ?? null] as const,
};
