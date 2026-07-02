"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchYbcFeed } from "@/lib/clients/ybc";
import { ybcKeys } from "@/lib/hooks/ybcKeys";

export function useYbcData(enabled = true) {
  return useQuery({
    queryKey: ybcKeys.feed(),
    queryFn: fetchYbcFeed,
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled,
  });
}
