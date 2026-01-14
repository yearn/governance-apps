"use client";

import { useState } from "react";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { Tabs } from "@/components/ui/Tabs";
import { veyfiCopy as copy } from "../messages";
import { LlyfiStakeTab } from "./tabs/LlyfiStakeTab";
import { LlyfiUnstakeTab } from "./tabs/LlyfiUnstakeTab";
import { LlyfiTradeTab } from "./tabs/LlyfiTradeTab";
import { ReadyBadge, StreamingBadge } from "@/components/domain/Badges";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";

type TabId = "stake" | "unstake" | "trade";

export function LlyfiRowCockpit({ token }: { token: LlyfiTokenState }) {
  const [activeTab, setActiveTab] = useState<TabId>("stake");

  const hasStreaming = token.cooldownBalance > 0n;
  const { isComplete } = useEpochCountdown(token.cooldown?.endsAt);

  let unstakeBadge = null;
  if (hasStreaming) {
    unstakeBadge = isComplete ? (
      <ReadyBadge className="text-disco-600" />
    ) : (
      <StreamingBadge className="text-disco-600" />
    );
  }

  return (
    <div className="space-y-6 max-w-md">
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
      />

      <div className="min-h-70">
        {activeTab === "stake" && <LlyfiStakeTab token={token} />}
        {activeTab === "unstake" && <LlyfiUnstakeTab token={token} />}
        {activeTab === "trade" && <LlyfiTradeTab token={token} />}
      </div>
    </div>
  );
}
