"use client";

import type { QueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { debugAdvanceTime } from "@/lib/mocks/time";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { teamsKeys } from "@/lib/hooks/useTeams";
import { veyfiKeys } from "@/lib/hooks/useVeyfi";
import { ybcKeys } from "@/lib/hooks/useYbc";
import { yethKeys } from "@/lib/hooks/useYeth";
import { daoKeys } from "@/lib/hooks/daoKeys";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import { resetMockVeyfiStore } from "@/lib/clients/veyfi/mock";
import { resetMockYethStore } from "@/lib/clients/yeth/mock";
import { resetMockTeamsStore } from "@/lib/clients/teams/mock";
import { resetYbcMockStore } from "@/lib/clients/ybc/store";
import {
  getDaoMockSnapshot,
  resetDaoMockStore,
  syncDaoMockStoreToNow,
} from "@/lib/clients/dao/store";

type DebugQueryKey = readonly unknown[];

export type DebugControlsSection = {
  id: string;
  title: string;
  content: ReactNode;
  queryKeys?: readonly DebugQueryKey[];
  onReset?: () => Promise<void> | void;
  onTimeTravel?: (days: number) => Promise<void> | void;
};

const SHARED_DEBUG_QUERY_KEYS = [
  styfiKeys.all,
  veyfiKeys.all,
  yethKeys.all,
  teamsKeys.all,
  ybcKeys.all,
  daoKeys.all,
] as const satisfies readonly DebugQueryKey[];

async function invalidateDebugQueryKeys(
  queryClient: QueryClient,
  queryKeys: readonly DebugQueryKey[]
) {
  await Promise.all(
    queryKeys.map((queryKey) =>
      queryClient.invalidateQueries({
        queryKey,
        refetchType: "all",
      })
    )
  );
}

export function resetAllDebugMockStores() {
  resetMockStyfiStore();
  resetMockVeyfiStore();
  resetMockYethStore();
  resetMockTeamsStore();
  resetYbcMockStore();
  resetDaoMockStore();
}

export function DebugControls({
  children,
  sections = [],
}: {
  children?: ReactNode;
  sections?: readonly DebugControlsSection[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const queryClient = useQueryClient();
  const { disconnectAsync } = useDisconnect();

  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      closeButtonRef.current?.focus();
      return;
    }

    if (hasOpenedRef.current) {
      triggerRef.current?.focus();
    }
  }, [isOpen]);

  const handleTimeTravel = async (days: number) => {
    const daoNow = getDaoMockSnapshot().now;
    debugAdvanceTime(days * 24 * 60 * 60);
    syncDaoMockStoreToNow(daoNow + days * 24 * 60 * 60);
    await Promise.all(
      sections.flatMap((section) =>
        section.onTimeTravel ? [section.onTimeTravel(days)] : []
      )
    );
    await invalidateDebugQueryKeys(queryClient, [
      ...SHARED_DEBUG_QUERY_KEYS,
      ...sections.flatMap((section) => section.queryKeys ?? []),
    ]);
  };

  const handleReset = useCallback(async () => {
    try {
      try {
        await disconnectAsync?.();
      } catch {
        // best effort only
      }

      resetAllDebugMockStores();
      await Promise.all(
        sections.flatMap((section) => (section.onReset ? [section.onReset()] : []))
      );
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
  }, [disconnectAsync, queryClient, sections]);

  const hasAppSpecificContent = Boolean(children) || sections.length > 0;

  if (!isOpen) {
    return (
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-1/2 z-50 min-h-10 -translate-x-1/2 rounded-md bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-0 shadow-lg transition-[background-color,box-shadow,scale,transform] duration-150 ease-out hover:bg-neutral-800 active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        🛠️ Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 left-1/2 z-50 flex max-h-[min(82vh,44rem)] w-[min(calc(100vw-1.5rem),42rem)] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-xl animate-in slide-in-from-bottom-5 motion-reduce:animate-none sm:bottom-4">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h4 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
          Debug Controls
        </h4>
        <button
          ref={closeButtonRef}
          onClick={() => setIsOpen(false)}
          className="inline-flex size-10 items-center justify-center rounded-box text-text-tertiary transition-colors hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-text-primary focus:ring-offset-2 focus:ring-offset-surface"
          aria-label="Close debug controls"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
        <section className="space-y-2">
          <h5 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
            Time Travel
          </h5>
          <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
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
        </section>

        {hasAppSpecificContent && (
          <div className="space-y-3 border-t border-border pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-text-tertiary">
              App Specific
            </h4>
            <div className="space-y-2">
              {sections.map((section) => (
                <details
                  key={section.id}
                  className="rounded-box border border-border bg-app/50 px-3 py-2"
                  open={sections.length === 1}
                >
                  <summary className="flex min-h-10 cursor-pointer items-center text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
                    {section.title}
                  </summary>
                  <div className="pt-3">{section.content}</div>
                </details>
              ))}
              {children}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border px-4 py-3">
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
