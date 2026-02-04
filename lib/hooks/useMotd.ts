"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMotd } from "@/lib/clients/motd";

export function useMotd() {
  return useQuery({
    queryKey: ["motd"],
    queryFn: fetchMotd,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
