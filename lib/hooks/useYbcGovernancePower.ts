"use client";
import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { readYbcGovernancePower } from "@/lib/clients/ybc/governance-power";

export function useYbcGovernancePower(publicClient: PublicClient | null, feed: YbcFeed | null) {
  return useQuery({
    queryKey: ["ybc", "governance-power", feed?.blockHash, feed?.members.map(member => [member.address, member.status, member.upstreamStaked, member.effectiveWeight])],
    enabled: Boolean(publicClient && feed),
    queryFn: () => readYbcGovernancePower(publicClient!, feed!),
    staleTime: 60_000,
    retry: 1,
  });
}
