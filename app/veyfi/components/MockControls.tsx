// app/veyfi/components/MockControls.tsx
"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { veyfiKeys } from "@/lib/hooks/useVeyfi";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { useProtocol } from "@/state/protocol";
import { toast } from "@/components/ui/Toast";
import { DebugControls } from "@/components/DebugControls";
import { LlyfiTokenId } from "@/lib/clients/veyfi";
import { getLlyfiDisplaySymbol } from "@/lib/clients/veyfi/display";

export function MockControls() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { veyfi, styfi } = useProtocol();

  const handleInjectVeYfi = useCallback(async () => {
    const amount = 10n * 10n ** 18n;
    if (veyfi.debugSetPendingVeYfi) {
      veyfi.debugSetPendingVeYfi(amount);
      if (address) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: veyfiKeys.account(address),
          }),
          queryClient.invalidateQueries({ queryKey: ["cross-app", "nudge"] }),
        ]);
        toast.success("Added 10 legacy veYFI");
      } else {
        toast.success("Pending: 10 legacy veYFI will be added upon connection");
      }
    }
  }, [veyfi, address, queryClient]);

  const handleInjectLlyfi = useCallback(
    async (symbol: LlyfiTokenId, amount: bigint) => {
      if (address && veyfi.debugSetLlyfiBalance) {
        veyfi.debugSetLlyfiBalance(address, symbol, amount);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: veyfiKeys.account(address),
          }),
          queryClient.invalidateQueries({ queryKey: ["cross-app", "nudge"] }),
        ]);
        toast.success(
          `Added ${amount / 10n ** 18n} ${getLlyfiDisplaySymbol(symbol)}`
        );
      } else {
        toast.error("Connect wallet first");
      }
    },
    [veyfi, address, queryClient]
  );

  const handleInjectYfi = useCallback(async () => {
    const amount = 10n * 10n ** 18n;
    if (address && styfi.debugMintYfi) {
      styfi.debugMintYfi(address, amount);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["protocol", "identity", address],
        }),
        queryClient.invalidateQueries({ queryKey: styfiKeys.account(address) }),
        queryClient.invalidateQueries({ queryKey: ["cross-app", "nudge"] }),
      ]);
      toast.success("Added 10 YFI");
    } else {
      toast.error("Connect wallet first");
    }
  }, [styfi, address, queryClient]);

  const handleInjectStyfiBalance = useCallback(
    async (mode: "stYFI" | "stYFIx") => {
      const amount = 100n * 10n ** 18n;
      if (address && styfi.debugSetBalance) {
        styfi.debugSetBalance(address, mode, amount);
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: styfiKeys.account(address),
          }),
          queryClient.invalidateQueries({ queryKey: ["cross-app", "nudge"] }),
        ]);
        toast.success(`Added 100 ${mode}`);
      } else if (styfi.debugSetPendingBalance) {
        styfi.debugSetPendingBalance(mode, amount);
        toast.success(`Pending: 100 ${mode} will be added upon connection`);
      }
    },
    [address, styfi, queryClient]
  );

  return (
    <DebugControls>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Button size="sm" variant="secondary" onClick={handleInjectVeYfi}>
          +10 Legacy veYFI
        </Button>
        <Button size="sm" variant="secondary" onClick={handleInjectYfi}>
          +10 YFI
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-2 mb-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleInjectStyfiBalance("stYFI")}
        >
          +100 stYFI
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleInjectStyfiBalance("stYFIx")}
        >
          +100 stYFIx
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-2 mb-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleInjectLlyfi("sdYFI", 10n * 10n ** 18n)}
        >
          +10 sdYFI
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleInjectLlyfi("coveYFI", 10n * 10n ** 18n)}
        >
          +10 coveYFI
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="col-span-2"
          onClick={() => handleInjectLlyfi("upYFI", 10000n * 10n ** 18n)}
        >
          +10,000 {getLlyfiDisplaySymbol("upYFI")}
        </Button>
      </div>
    </DebugControls>
  );
}
