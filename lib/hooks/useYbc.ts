"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { createMockYbcClient } from "@/lib/clients/ybc";
import type { YbcPrototypeScenarioId } from "@/lib/clients/ybc";

export const ybcKeys = {
  all: ["ybc"] as const,
  pageState: (scenarioId: YbcPrototypeScenarioId) =>
    [...ybcKeys.all, "page-state", scenarioId] as const,
};

type UseYbcStateOptions = {
  scenarioOverride?: YbcPrototypeScenarioId;
};

export function useYbcState(options: UseYbcStateOptions = {}) {
  const { address, isConnected } = useAccount();
  const ybc = useMemo(() => createMockYbcClient({ latencyMs: 350 }), []);

  const scenarioId =
    options.scenarioOverride ??
    (isConnected ? ybc.resolveDefaultScenario(address ?? null) : "observer");

  return useQuery({
    queryKey: ybcKeys.pageState(scenarioId),
    queryFn: () => ybc.getPageState({ scenarioId }),
    staleTime: Number.POSITIVE_INFINITY,
  });
}
