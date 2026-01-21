"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { StyfiClient } from "@/lib/clients/styfi/client";
import type { VeyfiClient } from "@/lib/clients/veyfi/client";
import { createTestBridge } from "@/lib/test-bridge";

type TestBridgeListenerProps = {
  styfi: StyfiClient;
  veyfi: VeyfiClient;
  enabled?: boolean;
};

export function TestBridgeListener({
  styfi,
  veyfi,
  enabled = false,
}: TestBridgeListenerProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    window.__TEST__ = createTestBridge({ styfi, veyfi, queryClient });

    return () => {
      delete window.__TEST__;
    };
  }, [enabled, queryClient, styfi, veyfi]);

  return null;
}
