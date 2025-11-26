"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { StyfiMode, modeLabel } from "../types";
import { StakeTab } from "./stake/StakeTab";
import { CooldownTab } from "./stake/CooldownTab";
import { WithdrawTab } from "./stake/WithdrawTab";
import { styfiCopy as copy } from "../../messages";

type Props = {
  mode: StyfiMode;
};

export function StakeManageCard({ mode }: Props) {
  const [activeTab, setActiveTab] = useState<"stake" | "cooldown" | "withdraw">(
    "stake"
  );

  const tabLabel =
    activeTab === "stake"
      ? copy.stakeManage.tabs.stake
      : activeTab === "cooldown"
      ? copy.stakeManage.tabs.cooldown
      : copy.stakeManage.tabs.withdraw;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-neutral-500">
            {copy.stakeManage.kicker(modeLabel(mode))}
          </p>
          <h3 className="text-xl font-bold text-neutral-900">
            {tabLabel}
          </h3>
        </div>
        <Tabs
          activeTab={activeTab}
          onChange={(tab) =>
            setActiveTab(tab as "stake" | "cooldown" | "withdraw")
          }
          tabs={[
            { id: "stake", label: copy.stakeManage.tabs.stake },
            { id: "cooldown", label: copy.stakeManage.tabs.cooldown },
            { id: "withdraw", label: copy.stakeManage.tabs.withdraw },
          ]}
        />
      </div>

      {activeTab === "stake" && <StakeTab mode={mode} />}
      {activeTab === "cooldown" && <CooldownTab mode={mode} />}
      {activeTab === "withdraw" && <WithdrawTab mode={mode} />}
    </Card>
  );
}
