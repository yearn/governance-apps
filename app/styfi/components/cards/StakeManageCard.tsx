"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { useStyfiAccount } from "@/lib/hooks/useStyfi";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";
import { StyfiMode, modeLabel } from "../types";
import { StakeTab } from "./stake/StakeTab";
import { UnstakeTab } from "./stake/UnstakeTab";
import { styfiCopy as copy } from "../../messages";
import { StreamingBadge, ReadyBadge } from "@/components/domain/Badges";

type Props = {
  mode: StyfiMode;
};

export function StakeManageCard({ mode }: Props) {
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  const { data } = useStyfiAccount();

  const cooldown =
    mode === "styfi" ? data?.styfiCooldown : data?.styfiX.cooldown;
  const { isComplete } = useEpochCountdown(cooldown?.endsAt);

  const exitingBalance =
    mode === "styfi"
      ? data?.styfiInCooldown ?? 0n
      : data?.styfiX.assetsInCooldown ?? 0n;

  let unstakeBadge;
  if (exitingBalance > 0n) {
    unstakeBadge = isComplete ? (
      <ReadyBadge className="text-sunset-600" />
    ) : (
      <StreamingBadge className="text-sunset-600" />
    );
  }

  const tabLabel =
    activeTab === "stake"
      ? copy.stakeManage.tabs.stake
      : copy.stakeManage.tabs.unstake;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            {copy.stakeManage.kicker(modeLabel(mode))}
          </p>
          <h3 className="text-xl font-bold text-neutral-900">{tabLabel}</h3>
        </div>
        <Tabs
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as "stake" | "unstake")}
          tabs={[
            { id: "stake", label: copy.stakeManage.tabs.stake },
            {
              id: "unstake",
              label: copy.stakeManage.tabs.unstake,
              badge: unstakeBadge,
            },
          ]}
        />
      </div>

      {activeTab === "stake" && <StakeTab mode={mode} />}
      {activeTab === "unstake" && <UnstakeTab mode={mode} />}
    </Card>
  );
}
