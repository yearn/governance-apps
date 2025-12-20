"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { veyfiKeys } from "@/lib/hooks/useVeyfi";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { walletKeys } from "@/lib/hooks/useWalletYfiBalance";
import { useProtocol } from "@/state/protocol";
import { toast } from "@/components/ui/Toast";
import { DebugControls } from "@/components/DebugControls";
import { LlyfiTokenId } from "@/lib/clients/veyfi";

export function MockControls() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { veyfi, styfi } = useProtocol();

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

  const handleInjectLlyfi = useCallback(
    async (symbol: LlyfiTokenId, amount: bigint) => {
      if (address && veyfi.debugSetLlyfiBalance) {
        veyfi.debugSetLlyfiBalance(address, symbol, amount);
        await queryClient.invalidateQueries({
          queryKey: veyfiKeys.account(address),
        });
        toast.success(`Added ${amount / 10n ** 18n} ${symbol}`);
      } else {
        toast.error("Connect wallet first or mock method missing");
      }
    },
    [veyfi, address, queryClient]
  );

  const handleInjectYfi = useCallback(async () => {
    const amount = 10n * 10n ** 18n; // 10 YFI
    if (address && styfi.debugMintYfi) {
      styfi.debugMintYfi(address, amount);
      // Invalidate both wallet balance (stYFI) and LLYFI account (trade tab)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: walletKeys.yfi(address) }),
        queryClient.invalidateQueries({ queryKey: styfiKeys.account(address) }),
      ]);
      toast.success("Added 10 YFI");
    } else {
      toast.error("Connect wallet first or mock method missing");
    }
  }, [styfi, address, queryClient]);

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
          +10,000 upYFI
        </Button>
      </div>
    </DebugControls>
  );
}
