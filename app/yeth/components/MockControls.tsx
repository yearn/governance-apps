"use client";

import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/Button";
import { DebugControls } from "@/components/DebugControls";
import { useProtocol } from "@/state/protocol";
import { toast } from "@/components/ui/Toast";
import { yethKeys, useYethAccountState, useYethGlobalState } from "@/lib/hooks/useYeth";
import { setFixedNow } from "@/lib/mocks/time";
import type { YethDebugPreset } from "@/lib/clients/yeth";

const PRESET_ORDER: readonly YethDebugPreset[] = [
  "claimable",
  "recovery_position",
  "empty",
] as const;

const PRESET_LABEL: Record<YethDebugPreset, string> = {
  claimable: "Claimable",
  recovery_position: "Recovery Position",
  empty: "Empty",
};

export function MockControls() {
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { yeth } = useProtocol();
  const { data: account } = useYethAccountState();
  const { data: global } = useYethGlobalState();

  const activePreset = useMemo<YethDebugPreset | null>(() => {
    if (!account) return null;
    if (account.claimableNowEth > 0n) return "claimable";
    if (account.recoveryVaultShares > 0n) return "recovery_position";
    return "empty";
  }, [account]);

  const applyPreset = useCallback(
    async (preset: YethDebugPreset) => {
      if (!address) {
        toast.error("Connect wallet first");
        return;
      }
      if (!yeth.debugSetAccountPreset) {
        toast.error("yETH debug presets are unavailable");
        return;
      }

      yeth.debugSetAccountPreset(address, preset);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: yethKeys.account(address) }),
        queryClient.invalidateQueries({ queryKey: yethKeys.global() }),
      ]);
      toast.success(`Set state: ${PRESET_LABEL[preset]}`);
    },
    [address, queryClient, yeth]
  );

  const cyclePreset = useCallback(async () => {
    const currentIndex = activePreset ? PRESET_ORDER.indexOf(activePreset) : -1;
    const nextPreset = PRESET_ORDER[(currentIndex + 1) % PRESET_ORDER.length];
    await applyPreset(nextPreset);
  }, [activePreset, applyPreset]);

  const setWindowOpen = useCallback(async () => {
    if (!global) {
      toast.error("yETH global state is not loaded");
      return;
    }
    setFixedNow(Math.max(0, global.claimWindow.closesAt - 3600));
    await queryClient.invalidateQueries({ queryKey: yethKeys.all });
    toast.success("Set claim window to open");
  }, [global, queryClient]);

  const setWindowClosed = useCallback(async () => {
    if (!global) {
      toast.error("yETH global state is not loaded");
      return;
    }
    setFixedNow(global.claimWindow.closesAt + 3600);
    await queryClient.invalidateQueries({ queryKey: yethKeys.all });
    toast.success("Set claim window to ended");
  }, [global, queryClient]);

  const setWindowRealtime = useCallback(async () => {
    setFixedNow(null);
    await queryClient.invalidateQueries({ queryKey: yethKeys.all });
    toast.success("Reset claim window to real time");
  }, [queryClient]);

  return (
    <DebugControls>
      <div className="space-y-2">
        <Button size="sm" variant="secondary" className="w-full" onClick={cyclePreset}>
          Next State
        </Button>

        <div className="grid grid-cols-2 gap-2">
          {PRESET_ORDER.map((preset) => (
            <Button
              key={preset}
              size="sm"
              variant="secondary"
              className="h-auto py-2 text-[11px]"
              onClick={() => applyPreset(preset)}
            >
              {PRESET_LABEL[preset]}
              {activePreset === preset ? " ✓" : ""}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t border-border pt-2 mt-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-text-tertiary mb-2">
          Claim Window
        </h4>
        <div className="grid grid-cols-3 gap-2">
          <Button size="sm" variant="secondary" onClick={setWindowOpen}>
            Open
          </Button>
          <Button size="sm" variant="secondary" onClick={setWindowClosed}>
            Ended
          </Button>
          <Button size="sm" variant="secondary" onClick={setWindowRealtime}>
            Real Time
          </Button>
        </div>
      </div>
    </DebugControls>
  );
}
