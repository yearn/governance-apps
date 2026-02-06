"use client";

import { useCallback, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { debugAdvanceTime } from "@/lib/mocks/time";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { veyfiKeys } from "@/lib/hooks/useVeyfi";
import { yethKeys } from "@/lib/hooks/useYeth";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import { resetMockVeyfiStore } from "@/lib/clients/veyfi/mock";
import { resetMockYethStore } from "@/lib/clients/yeth/mock";

export function DebugControls({ children }: { children?: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { disconnectAsync } = useDisconnect();

  const handleTimeTravel = async (days: number) => {
    debugAdvanceTime(days * 24 * 60 * 60);
    // Invalidate everything to be safe
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["protocol", "identity"],
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: styfiKeys.all,
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: veyfiKeys.all,
        refetchType: "all",
      }),
      queryClient.invalidateQueries({
        queryKey: yethKeys.all,
        refetchType: "all",
      }),
    ]);
  };

  const handleReset = useCallback(async () => {
    try {
      try {
        await disconnectAsync?.();
      } catch {
        // best effort only
      }

      resetMockStyfiStore();
      resetMockVeyfiStore();
      resetMockYethStore();
      queryClient.clear();

      if (typeof window !== "undefined") {
        try {
          window.localStorage.clear();
          window.sessionStorage?.clear();
        } catch {
          // best effort only
        }
      }
    } finally {
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    }
  }, [disconnectAsync, queryClient]);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-bold text-neutral-0 shadow-lg transition-all hover:bg-neutral-800"
      >
        🛠️ Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-64 -translate-x-1/2 space-y-3 rounded-lg border border-border bg-surface p-4 shadow-xl animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          Time Travel
        </h4>
        <button
          onClick={() => setIsOpen(false)}
          className="text-text-tertiary transition-colors hover:text-text-primary"
          aria-label="Close debug controls"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleTimeTravel(1)}
        >
          +1 Day
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleTimeTravel(7)}
        >
          +7 Days
        </Button>
      </div>

      {children && (
        <div className="border-t border-border pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-text-tertiary mb-2">
            App Specific
          </h4>
          {children}
        </div>
      )}

      <div className="border-t border-border pt-2">
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={handleReset}
        >
          Reset App (Full Wipe)
        </Button>
      </div>
    </div>
  );
}
