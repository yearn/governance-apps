"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { StyfiClient } from "@/lib/clients/styfi/client";
import type { VeyfiClient } from "@/lib/clients/veyfi/client";
import type { YethClient } from "@/lib/clients/yeth/client";
import {
  createTestBridge,
  type TeamsTestBridgeAdapter,
  type YbcTestBridgeAdapter,
} from "@/lib/test-bridge";

type TestBridgeListenerProps = {
  styfi: StyfiClient;
  veyfi: VeyfiClient;
  yeth: YethClient;
  teams?: TeamsTestBridgeAdapter;
  ybc?: YbcTestBridgeAdapter;
  enabled?: boolean;
};

export function TestBridgeListener({
  styfi,
  veyfi,
  yeth,
  teams,
  ybc,
  enabled = false,
}: TestBridgeListenerProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    window.__TEST__ = createTestBridge({
      styfi,
      veyfi,
      yeth,
      queryClient,
      teams,
      ybc,
    });

    return () => {
      delete window.__TEST__;
    };
  }, [enabled, queryClient, styfi, teams, veyfi, ybc, yeth]);

  return null;
}
