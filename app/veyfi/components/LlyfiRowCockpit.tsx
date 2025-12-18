"use client";

import { useState } from "react";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { Tabs } from "@/components/ui/Tabs";
import { veyfiCopy as copy } from "../messages";
import { LlyfiStakeTab } from "./tabs/LlyfiStakeTab";
import { LlyfiUnstakeTab } from "./tabs/LlyfiUnstakeTab";
import { LlyfiTradeTab } from "./tabs/LlyfiTradeTab";

type TabId = "stake" | "unstake" | "trade";

export function LlyfiRowCockpit({ token }: { token: LlyfiTokenState }) {
  const [activeTab, setActiveTab] = useState<TabId>("stake");

  const hasStreaming = token.cooldownBalance > 0n;
  const unstakeBadge = hasStreaming ? (
    <span className="block h-2 w-2 rounded-full bg-disco-600" />
  ) : null;

  return (
    <div className="space-y-6">
      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as TabId)}
        tabs={[
          { id: "stake", label: copy.manage.cockpit.tabs.stake },
          {
            id: "unstake",
            label: copy.manage.cockpit.tabs.unstake,
            badge: unstakeBadge,
          },
          { id: "trade", label: copy.manage.cockpit.tabs.trade },
        ]}
        className="bg-white border border-neutral-200"
      />

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === "stake" && <LlyfiStakeTab token={token} />}
        {activeTab === "unstake" && <LlyfiUnstakeTab token={token} />}
        {activeTab === "trade" && <LlyfiTradeTab token={token} />}
      </div>
    </div>
  );
}
