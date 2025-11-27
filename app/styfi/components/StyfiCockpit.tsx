"use client";

import { Banner } from "@/components/ui/Banner";
import { useStyfiMode } from "../state/StyfiModeProvider";
import { RewardsCard } from "./cards/RewardsCard";
import { StakeManageCard } from "./cards/StakeManageCard";
import { styfiCopy as copy } from "../messages";

export function StyfiCockpit() {
  const { mode } = useStyfiMode();

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <StakeManageCard mode={mode} />
        <RewardsCard />
      </div>

      <Banner variant="info" title={copy.cockpit.mockBanner.title}>
        {copy.cockpit.mockBanner.body}
      </Banner>
    </div>
  );
}
