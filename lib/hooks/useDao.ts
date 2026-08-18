"use client";

import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import {
  createMockDaoClient,
  type DaoClient,
  type DaoFeedV1,
  type DaoProposalLookup,
  type DaoProposalRef,
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

export function resolveActiveDaoProposalRef(
  feed: DaoFeedV1 | undefined,
  proposalId: bigint | null
): DaoProposalRef | null {
  if (!feed || proposalId === null) return null;

  const activeContract = feed.contracts.find((contract) => contract.active);
  if (!activeContract) return null;

  return {
    chainId: feed.chainId,
    votingAddress: activeContract.votingAddress,
    proposalId,
  };
}

export function useDaoFeed(enabled = true) {
  return useQuery({
    queryKey: daoKeys.feed(),
    queryFn: () => getDaoRouteClient().getFeed(),
    enabled,
    staleTime: Infinity,
  });
}

export function useDaoProposal(proposalId: string) {
  const parsedProposalId = parseDaoProposalId(proposalId);
  const feedQuery = useDaoFeed(parsedProposalId !== null);
  const proposalRef = resolveActiveDaoProposalRef(
    feedQuery.data,
    parsedProposalId
  );
  const query = useQuery<DaoProposalLookup>({
    queryKey: daoKeys.proposal(proposalRef),
    queryFn: () => {
      if (!proposalRef) {
        throw new Error("DAO proposal identity is unavailable.");
      }
      return getDaoRouteClient().getProposal(proposalRef);
    },
    enabled: proposalRef !== null,
    staleTime: Infinity,
  });

  const activeContractMissing =
    parsedProposalId !== null && feedQuery.data !== undefined && !proposalRef;
  const activeContractError = activeContractMissing
    ? new Error("DAO proposal data has no active Voting contract.")
    : null;

  return {
    ...query,
    data:
      parsedProposalId === null
        ? ({ state: "not_found" } as const)
        : query.data,
    error: feedQuery.error ?? activeContractError ?? query.error,
    isError: feedQuery.isError || activeContractMissing || query.isError,
    isPending:
      parsedProposalId === null
        ? false
        : feedQuery.isPending || (proposalRef !== null && query.isPending),
    refetch: () =>
      feedQuery.isError || activeContractMissing
        ? feedQuery.refetch()
        : query.refetch(),
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
