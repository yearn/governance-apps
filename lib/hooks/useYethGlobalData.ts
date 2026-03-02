"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchYethGlobalData } from "@/lib/clients/yeth";

export function useYethGlobalData(enabled = true) {
  return useQuery({
    queryKey: ["yeth-global-data"],
    queryFn: fetchYethGlobalData,
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled,
  });
}
