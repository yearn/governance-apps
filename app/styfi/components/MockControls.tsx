"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { debugAdvanceTime } from "@/lib/mocks/time";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import { resetMockVeyfiStore } from "@/lib/clients/veyfi/mock";

export function MockControls() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { disconnectAsync } = useDisconnect();

  const handleTimeTravel = async (days: number) => {
    debugAdvanceTime(days * 24 * 60 * 60);
    await queryClient.invalidateQueries({ queryKey: styfiKeys.all });
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
      queryClient.clear();

      if (typeof window !== "undefined") {
        try {
          window.localStorage.clear();
        } catch {
          // best effort only
        }

        try {
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
        className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-1 text-xs font-bold text-white shadow-lg transition-all hover:bg-neutral-800"
      >
        🛠️ Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-64 -translate-x-1/2 space-y-3 rounded-lg border border-neutral-300 bg-white p-4 shadow-xl animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500">
          Time Travel
        </h4>
        <button
          onClick={() => setIsOpen(false)}
          className="text-neutral-400 transition-colors hover:text-neutral-900"
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

      <Button
        size="sm"
        variant="ghost"
        className="w-full text-red-500 hover:bg-red-50 hover:text-red-600"
        onClick={handleReset}
      >
        Reset App
      </Button>
    </div>
  );
}
