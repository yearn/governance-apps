"use client";

import { useState } from "react";
import { LlyfiTokenState } from "@/lib/clients/veyfi";
import { IconChevron } from "@/components/icons/IconChevron";
import { formatTokenAmount, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";
import { LlyfiRowCockpit } from "./LlyfiRowCockpit";
import { veyfiCopy as copy } from "../messages";

const MOCK_BASE_APY = 0.05;
const MOCK_BOOST_APY = 0.12;

export function LlyfiTokenRow({ token }: { token: LlyfiTokenState }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedWallet = formatTokenAmount(token.walletBalance);
  const formattedStaked = formatTokenAmount(token.stakedBalance);
  const apyLabel = copy.manage.row.apyValue(
    formatPercent(MOCK_BASE_APY),
    formatPercent(MOCK_BOOST_APY)
  );

  return (
    <div className="group bg-white transition-colors hover:bg-neutral-50/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full grid grid-cols-[1.5fr_1fr_1fr_1fr_40px] items-center p-4 text-left outline-none focus-visible:bg-neutral-100"
      >
        <div className="font-bold text-neutral-900">
          {token.name}{" "}
          <span className="text-neutral-500 font-normal ml-1">
            ({token.symbol})
          </span>
        </div>
        <div className="text-right font-number font-medium text-disco-700">
          {apyLabel}
        </div>
        <div className="text-right font-number text-neutral-900">
          {formattedWallet}
        </div>
        <div className="text-right font-number font-bold text-neutral-900">
          {formattedStaked}
        </div>
        <div className="flex justify-end">
          <IconChevron
            className={cn(
              "w-5 h-5 text-neutral-400 transition-transform duration-300",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out border-t border-transparent",
          isExpanded ? "grid-rows-[1fr] border-neutral-100" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden bg-neutral-50/50">
          <div className="p-4 md:p-6">
            <LlyfiRowCockpit token={token} />
          </div>
        </div>
      </div>
    </div>
  );
}
