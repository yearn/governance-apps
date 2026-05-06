"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchGlobalData } from "@/lib/clients/global";

export function useGlobalData(enabled = true) {
  return useQuery({
    queryKey: ["global-data"],
    queryFn: fetchGlobalData,
    staleTime: 60_000,
    refetchInterval: 60_000,
    enabled,
  });
}
