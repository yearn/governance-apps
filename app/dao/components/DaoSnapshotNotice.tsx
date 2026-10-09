"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { UtcTime } from "@/components/ui/UtcTime";
import { DAO_FEED_STALE_SECONDS } from "@/lib/clients/dao/feed";
import type { DaoSnapshot } from "@/lib/clients/dao/types";
import { daoCopy } from "../messages";

export function DaoSnapshotNotice({ snapshot, error, onRetry }: {
  snapshot: DaoSnapshot | undefined; error: Error | null; onRetry: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setNow(Math.floor(Date.now() / 1000));
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);
  const age = snapshot && now !== null ? Math.max(0, now - snapshot.canonicalBlock.timestamp) : null;
  const stale = age !== null && age > DAO_FEED_STALE_SECONDS;
  if (!snapshot) return null;

  return (
    <div className="min-w-0 text-xs text-text-secondary" role={error ? "alert" : "status"}>
      <div className="flex min-w-0 flex-wrap items-start gap-x-3">
        <details className="group min-w-0 flex-1">
          <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-2 rounded py-2 transition-colors hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary motion-reduce:transition-none [&::-webkit-details-marker]:hidden">
            <span className="font-number tabular-nums">
              {daoCopy.feed.snapshot}
              {age !== null ? " · " + daoCopy.feed.age(Math.floor(age / 60)) : ""}
            </span>
            <span aria-hidden className="transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
          </summary>
          <div className="max-w-lg space-y-1 pb-2 text-pretty leading-5">
            <UtcTime timestamp={snapshot.canonicalBlock.timestamp} className="font-number tabular-nums" />
            <p>{daoCopy.feed.snapshotTiming}</p>
            <p>{daoCopy.feed.trust}</p>
          </div>
        </details>
        {error || stale ? (
          <Button variant="secondary" size="sm" className="min-h-10" onClick={onRetry}>
            {daoCopy.feed.refresh}
          </Button>
        ) : null}
      </div>
      {error ? <p className="max-w-lg text-pretty leading-5">{daoCopy.feed.updateFailed} {daoCopy.feed.lastGood}</p>
        : stale ? <p className="max-w-lg text-pretty leading-5">{daoCopy.feed.stale}</p> : null}
    </div>
  );
}
