"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import {
  createMockDaoClient,
  type DaoClient,
  type DaoProposalLookup,
} from "@/lib/clients/dao";
import { daoKeys } from "@/lib/hooks/daoKeys";
import { isProductionRuntime } from "@/lib/runtime/features";

let mockClient: DaoClient | null = null;

function getDaoRouteClient(): DaoClient {
  if (isProductionRuntime()) {
    throw new Error("DAO mock reads are unavailable in production runtime.");
  }

  mockClient ??= createMockDaoClient({ latencyMs: 250 });
  return mockClient;
}

export function parseDaoProposalId(value: string): bigint | null {
  if (!/^(0|[1-9]\d*)$/.test(value)) return null;
  return BigInt(value);
}

export function useDaoFeed() {
  return useQuery({
    queryKey: daoKeys.feed(),
    queryFn: () => getDaoRouteClient().getFeed(),
    staleTime: Infinity,
  });
}

export function useDaoProposal(proposalId: string) {
  const parsedProposalId = parseDaoProposalId(proposalId);
  const query = useQuery<DaoProposalLookup>({
    queryKey: daoKeys.proposal(proposalId),
    queryFn: async () => {
      const client = getDaoRouteClient();
      const feed = await client.getFeed();
      const activeContract = feed.contracts.find((contract) => contract.active);
      if (!activeContract) {
        throw new Error("DAO proposal data has no active Voting contract.");
      }

      return client.getProposal({
        chainId: feed.chainId,
        votingAddress: activeContract.votingAddress,
        proposalId: parsedProposalId ?? 0n,
      });
    },
    enabled: parsedProposalId !== null,
    staleTime: Infinity,
  });

  return {
    ...query,
    data:
      parsedProposalId === null
        ? ({ state: "not_found" } as const)
        : query.data,
    isPending: parsedProposalId === null ? false : query.isPending,
  };
}

export function useDaoProposerState(address: Address | null) {
  return useQuery({
    queryKey: daoKeys.proposer(address),
    queryFn: () => getDaoRouteClient().getProposerState(address as Address),
    enabled: address !== null,
    staleTime: Infinity,
  });
}

export { daoKeys } from "@/lib/hooks/daoKeys";
