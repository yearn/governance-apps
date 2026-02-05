"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { veyfiCopy as copy } from "../messages";

const STYFI_DASHBOARD_HOST = "styfi.yearn.fi";
const VEYFI_HOST = "veyfi.yearn.fi";

function resolveStyfiDashboardHref(hostname?: string) {
  if (!hostname) return "/styfi";
  const host = hostname.toLowerCase();
  if (host === VEYFI_HOST) {
    return `https://${STYFI_DASHBOARD_HOST}`;
  }
  return "/styfi";
}

export function VeyfiRewardsCard() {
  const [styfiHref, setStyfiHref] = useState("/styfi");

  useEffect(() => {
    setStyfiHref(resolveStyfiDashboardHref(window.location.hostname));
  }, []);

  return (
    <Card className="h-full flex flex-col justify-between space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wide text-neutral-500">
          {copy.rewards.title}
        </h3>
        <p className="text-3xl font-bold text-neutral-900 leading-tight">
          {copy.rewards.headline}
        </p>
        <p className="text-sm text-neutral-600">{copy.rewards.helper}</p>
      </div>
      <div className="pt-4 border-t border-neutral-100">
        <Link href={styfiHref} className="block w-full">
          <Button variant="veyfi" className="w-full">
            {copy.rewards.linkCta}
          </Button>
        </Link>
      </div>
    </Card>
  );
}
