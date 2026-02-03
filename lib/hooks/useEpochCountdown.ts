"use client";

import { useState, useEffect } from "react";
import { useEpochClock } from "@/lib/hooks/useEpochClock";

/**
 * formats seconds into "2d 4h 30m"
 */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "Ready";

  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);

  // If less than a minute, show seconds or "< 1m"
  if (parts.length === 0) return "< 1m";

  return parts.join(" ");
}

export function useEpochCountdown(
  epochEndTimestamp: number | undefined,
  epochStartTimestamp?: number
) {
  const [timeRemaining, setTimeRemaining] = useState<string>("--");
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const { now } = useEpochClock({ tickMs: 1000 });

  useEffect(() => {
    if (!epochEndTimestamp) return;

    const totalDuration = epochStartTimestamp
      ? Math.max(1, epochEndTimestamp - epochStartTimestamp)
      : 14 * 24 * 60 * 60; // fallback assumption
    const remaining = epochEndTimestamp - now;

    if (remaining <= 0) {
      setTimeRemaining("Ready");
      setIsComplete(true);
      setProgress(100);
      return;
    }

    // Calculate progress based on a 14-day window assumption
    // (In reality, start time should come from contract for exact progress bar,
    // but for Cooldowns, we usually just care about time left).
    // For visual smoothness, we can calculate reverse progress or just show strict time.
    const elapsed = epochStartTimestamp
      ? Math.max(0, now - epochStartTimestamp)
      : totalDuration - remaining;
    const pct = Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

    setProgress(pct);
    setIsComplete(false);
    setTimeRemaining(formatDuration(remaining));
  }, [epochEndTimestamp, epochStartTimestamp, now]);

  return { timeRemaining, isComplete, progress };
}
