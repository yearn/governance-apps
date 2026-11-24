"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGlobalData } from "@/lib/clients/global";

type GlobalFeed = Awaited<ReturnType<typeof fetchGlobalData>>;

export function useGlobalData<T = GlobalFeed>(enabled = true, select?: (feed: GlobalFeed) => T) {
  return useQuery({
    queryKey: ["global-data"],
    queryFn: fetchGlobalData,
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled,
    select,
  });
}
