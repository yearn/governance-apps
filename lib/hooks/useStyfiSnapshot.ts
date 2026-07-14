"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchActiveStyfiSnapshotProposals,
  filterCurrentStyfiSnapshotProposals,
} from "@/lib/clients/styfi/snapshot";

const SNAPSHOT_STALE_TIME_MS = 5 * 60_000;
const MAX_TIMEOUT_MS = 2_147_483_647;

export function useStyfiSnapshotProposals() {
  const query = useQuery({
    queryKey: ["styfi", "snapshot", "active-proposals"] as const,
    queryFn: ({ signal }) => fetchActiveStyfiSnapshotProposals(signal),
    staleTime: SNAPSHOT_STALE_TIME_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const [nowMs, setNowMs] = useState(() => Date.now());

  const activeProposals = useMemo(
    () => filterCurrentStyfiSnapshotProposals(query.data ?? [], nowMs),
    [nowMs, query.data],
  );

  useEffect(() => {
    const nextEndMs = activeProposals[0]?.end
      ? activeProposals[0].end * 1000
      : null;
    if (nextEndMs === null) return;

    const delay = Math.min(
      Math.max(nextEndMs - Date.now() + 250, 0),
      MAX_TIMEOUT_MS,
    );
    const timeoutId = window.setTimeout(() => setNowMs(Date.now()), delay);
    return () => window.clearTimeout(timeoutId);
  }, [activeProposals]);

  return {
    ...query,
    activeProposals,
  };
}
