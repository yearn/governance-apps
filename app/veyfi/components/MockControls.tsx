"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { veyfiKeys } from "@/lib/hooks/useVeyfi";
import { useProtocol } from "@/state/protocol";
import { toast } from "@/components/ui/Toast";
import { DebugControls } from "@/components/DebugControls";

export function MockControls() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { veyfi } = useProtocol();

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

  return (
    <DebugControls>
      <Button
        size="sm"
        variant="secondary"
        className="w-full mb-2"
        onClick={handleInjectVeYfi}
      >
        Add 10 Legacy veYFI
      </Button>
    </DebugControls>
  );
}
