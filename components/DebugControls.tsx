"use client";

import type { QueryClient } from "@tanstack/react-query";
import { useCallback, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDisconnect } from "wagmi";
import { Button } from "@/components/ui/Button";
import { debugAdvanceTime } from "@/lib/mocks/time";
import { styfiKeys } from "@/lib/hooks/useStyfi";
import { teamsKeys } from "@/lib/hooks/useTeams";
import { veyfiKeys } from "@/lib/hooks/useVeyfi";
import { ybcKeys } from "@/lib/hooks/useYbc";
import { yethKeys } from "@/lib/hooks/useYeth";
import { resetMockStyfiStore } from "@/lib/clients/styfi/mock";
import { resetMockVeyfiStore } from "@/lib/clients/veyfi/mock";
import { resetMockYethStore } from "@/lib/clients/yeth/mock";

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

export function DebugControls({
  children,
  sections = [],
}: {
  children?: ReactNode;
  sections?: readonly DebugControlsSection[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { disconnectAsync } = useDisconnect();

  const handleTimeTravel = async (days: number) => {
    debugAdvanceTime(days * 24 * 60 * 60);
    const sectionTasks = sections.flatMap((section) =>
      section.onTimeTravel ? [section.onTimeTravel(days)] : []
    );

    await Promise.all([
      invalidateDebugQueryKeys(queryClient, [
        ...SHARED_DEBUG_QUERY_KEYS,
        ...sections.flatMap((section) => section.queryKeys ?? []),
      ]),
      ...sectionTasks,
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

      {hasAppSpecificContent && (
        <div className="border-t border-border pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-text-tertiary mb-2">
            App Specific
          </h4>
          <div className="space-y-3">
            {sections.map((section) => (
              <section key={section.id} className="space-y-2">
                <h5 className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
                  {section.title}
                </h5>
                {section.content}
              </section>
            ))}
            {children}
          </div>
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
