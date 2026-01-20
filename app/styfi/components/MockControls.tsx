"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { useProtocol } from "@/state/protocol";
import { toast } from "@/components/ui/Toast";
import { DebugControls } from "@/components/DebugControls";

export function MockControls() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { styfi } = useProtocol();

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

  return (
    <DebugControls>
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
    </DebugControls>
  );
}
