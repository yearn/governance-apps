"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Tabs } from "@/components/ui/Tabs";
import { Modal } from "@/components/ui/Modal";
import { useStyfiAccount } from "@/lib/hooks/useStyfi";
import { useEpochCountdown } from "@/lib/hooks/useEpochCountdown";
import { ModeComparison } from "../ModeComparison";
import { StyfiAsset } from "../types";
import { StakeTab } from "./stake/StakeTab";
import { UnstakeTab } from "./stake/UnstakeTab";
import { styfiCopy as copy } from "../../messages";
import { StreamingBadge, ReadyBadge } from "@/components/domain/Badges";

type Props = {
  selectedAsset: StyfiAsset;
  onSelectAsset: (asset: StyfiAsset) => void;
};

export function StakeManageCard({ selectedAsset, onSelectAsset }: Props) {
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const { data } = useStyfiAccount();

  const cooldown =
    selectedAsset === "stYFI" ? data?.styfiCooldown : data?.styfiX.cooldown;
  const { isComplete } = useEpochCountdown(cooldown?.endsAt);

  const unstakingBalance =
    selectedAsset === "stYFI"
      ? data?.styfiInCooldown ?? 0n
      : data?.styfiX.assetsInCooldown ?? 0n;

  let unstakeBadge;
  if (unstakingBalance > 0n) {
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-1">
          {(["stYFI", "stYFIx"] as const).map((asset) => {
            const isActive = selectedAsset === asset;
            return (
              <button
                key={asset}
                type="button"
                onClick={() => onSelectAsset(asset)}
                aria-pressed={isActive}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${
                  isActive
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                {asset}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setIsCompareOpen(true)}
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 underline decoration-neutral-300 underline-offset-4"
        >
          Compare modes
        </button>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
        {selectedAsset === "stYFI"
          ? "You are managing standard stYFI. You must vote manually."
          : "You are managing stYFIx. Voting is delegated for passive yield."}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">{tabLabel}</h3>
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

      {activeTab === "stake" && <StakeTab asset={selectedAsset} />}
      {activeTab === "unstake" && <UnstakeTab asset={selectedAsset} />}

      <Modal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        title="Compare modes"
        className="max-w-2xl"
      >
        <ModeComparison
          selectedAsset={selectedAsset}
          onSelectAsset={onSelectAsset}
        />
      </Modal>
    </Card>
  );
}
