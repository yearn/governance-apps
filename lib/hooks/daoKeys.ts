import type { Address } from "viem";
import {
  serializeDaoProposalRef,
  type DaoProposalRef,
} from "@/lib/clients/dao";

export const daoKeys = {
  all: ["dao"] as const,
  feed: () => [...daoKeys.all, "feed"] as const,
  proposal: (ref: DaoProposalRef | null) =>
    [
      ...daoKeys.all,
      "proposal",
      ref === null ? null : serializeDaoProposalRef(ref),
    ] as const,
  proposer: (address: Address | null) =>
    [...daoKeys.all, "proposer", address?.toLowerCase() ?? null] as const,
};
