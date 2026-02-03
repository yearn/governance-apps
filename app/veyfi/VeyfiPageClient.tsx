"use client";

import { VeyfiStatsBar } from "./components/VeyfiStatsBar";
import { VeyfiCockpit } from "./components/VeyfiCockpit";
import { useProtocol } from "@/state/protocol";
import { MockControls } from "./components/MockControls";

export function VeyfiPageClient() {
  const { usesMockBackend } = useProtocol();

  return (
    <div className="space-y-0">
      <VeyfiStatsBar />

      <main className="container mx-auto px-4 md:px-6 pt-8 space-y-8 pb-24">
        <VeyfiCockpit />
      </main>

      {usesMockBackend && <MockControls />}
    </div>
  );
}
