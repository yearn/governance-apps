"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicClient } from "viem";
import type { YbcFeed } from "@/lib/schemas/ybc-feed";
import { fetchDaoVotingPowerSnapshot, isVotingPowerTimestampCurrent } from "@/lib/clients/dao/voting-power-snapshot";
import { readYbcSystemVotingPower } from "@/lib/clients/ybc/system-power";
import { useDocumentVisibility } from "./usePollingGate";

export function useYbcSystemVotingPower(client: PublicClient | null, feed: YbcFeed | null) {
  const visible = useDocumentVisibility();
  const [clock, setClock] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const url = process.env.NEXT_PUBLIC_DAO_VOTING_POWER_URL?.trim();
  const query = useQuery({
    queryKey: ["ybc", "system-voting-power", url, feed?.blockHash, feed?.members.map(member => member.address)],
    enabled: Boolean(client && feed && url && visible),
    queryFn: async () => readYbcSystemVotingPower(client!, feed!, await fetchDaoVotingPowerSnapshot("/api/dao-voting-power")),
    staleTime: 30_000, refetchInterval: visible ? 60_000 : false, retry: false,
  });
  return {
    data: !query.isError && query.data && isVotingPowerTimestampCurrent(query.data.timestamp, clock) ? query.data : null,
    isLoading: Boolean(url && client && feed && query.isLoading),
  };
}
