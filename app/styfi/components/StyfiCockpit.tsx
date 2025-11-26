"use client";

import { Banner } from "@/components/ui/Banner";
import { StyfiMode } from "./types";
import { RewardsCard } from "./cards/RewardsCard";
import { StakeManageCard } from "./cards/StakeManageCard";
import { styfiCopy as copy } from "../messages";

type Props = {
  mode: StyfiMode;
};

export function StyfiCockpit({ mode }: Props) {
  return (
    <main className="container mx-auto px-4 py-10 space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <StakeManageCard mode={mode} />
        <RewardsCard />
      </div>

      <Banner variant="info" title={copy.cockpit.mockBanner.title}>
        {copy.cockpit.mockBanner.body}
      </Banner>
    </main>
  );
}
