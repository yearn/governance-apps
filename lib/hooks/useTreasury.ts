"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { createTreasuryClient } from "@/lib/clients/treasury/client";
import { parseTreasuryMockScenario } from "@/lib/clients/treasury/mock";
import { isTreasuryMockRuntimeEnabled } from "@/lib/runtime/features";
import { useDocumentVisibility, useIsRouteActive } from "./usePollingGate";

function subscribeLocation(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
}
const getSearch = () => window.location.search;
const getServerSearch = () => "";

export function useTreasury() {
  const search = useSyncExternalStore(subscribeLocation, getSearch, getServerSearch);
  const mocks = isTreasuryMockRuntimeEnabled();
  const scenario = mocks ? parseTreasuryMockScenario(new URLSearchParams(search).get("scenario")) : "ready";
  const client = useMemo(() => createTreasuryClient(scenario), [scenario]);
  const visible = useDocumentVisibility();
  const routeActive = useIsRouteActive(["/treasury"]);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const update = () => setNow(Math.floor(Date.now() / 1000));
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ["treasury", mocks ? "mock" : "live", scenario],
    queryFn: () => client.read(),
    enabled: routeActive && scenario !== "loading",
    staleTime: 60_000,
    refetchInterval: visible && routeActive ? 60_000 : false,
    retry: false,
  });
  return {
    ...query,
    now: mocks && query.data ? query.data.generatedAt + (scenario === "stale" ? 3600 : 60) : now,
    loading: scenario === "loading" || (query.isPending && !query.data),
  };
}
