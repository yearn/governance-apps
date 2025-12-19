"use client";

import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { debugAdvanceTime } from "@/lib/mocks/time";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { veyfiKeys } from "@/lib/hooks/useVeyfi";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import { resetMockVeyfiStore } from "@/lib/clients/veyfi/mock";
import { useProtocol } from "@/state/protocol";
import { toast } from "@/components/ui/Toast";

export function MockControls() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { styfi, veyfi } = useProtocol(); // destructure veyfi

  const handleTimeTravel = async (days: number) => {
    debugAdvanceTime(days * 24 * 60 * 60);
    await queryClient.invalidateQueries({ queryKey: styfiKeys.all });
    await queryClient.invalidateQueries({ queryKey: veyfiKeys.all });
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

  const handleForgetMe = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("styfi_onboarded");
      window.localStorage.removeItem("styfi-last-mode");
      window.location.reload();
    }
  }, []);

  const handleInjectBalance = useCallback(
    async (mode: "stYFI" | "stYFIx") => {
      // Amount: 100
      const amount = 100n * 10n ** 18n;

      if (address && styfi.debugSetBalance) {
        // Connected: Apply immediately
        styfi.debugSetBalance(address, mode, amount);
        await queryClient.invalidateQueries({
          queryKey: styfiKeys.account(address),
        });
        toast.success(`Added 100 ${mode} to ${address.slice(0, 6)}...`);
      } else if (styfi.debugSetPendingBalance) {
        // Disconnected: Queue for next connection
        styfi.debugSetPendingBalance(mode, amount);
        toast.success(`Pending: 100 ${mode} will be added upon connection.`);
      }
    },
    [address, styfi, queryClient]
  );

  const handleInjectVeYfi = useCallback(async () => {
    const amount = 10n * 10n ** 18n; // 10 veYFI
    if (veyfi.debugSetPendingVeYfi) {
      veyfi.debugSetPendingVeYfi(amount);

      // If connected, invalidate immediately
      if (address) {
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
        toast.success("Added 10 legacy veYFI");
      } else {
        toast.success("Pending: 10 legacy veYFI will be added upon connection");
      }
    }
  }, [veyfi, address, queryClient]);

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

      <div className="border-t border-neutral-100 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-neutral-500 mb-2">
          Smart Onboarding
        </h4>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleInjectBalance("stYFI")}
          >
            Add stYFI
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleInjectBalance("stYFIx")}
          >
            Add stYFIx
          </Button>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="w-full mb-2"
          onClick={handleInjectVeYfi}
        >
          Add 10 Legacy veYFI
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-full text-neutral-600"
          onClick={handleForgetMe}
        >
          Forget Me (LocalStorage Only)
        </Button>
      </div>

      <div className="border-t border-neutral-100 pt-2">
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
