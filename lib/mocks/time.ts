/**
 * Centralized clock for mocks with optional offset.
 * Offset comes from NEXT_PUBLIC_MOCK_TIME_OFFSET_SECONDS (int).
 */
const OFFSET_SECONDS = Number.parseInt(
  process.env.NEXT_PUBLIC_MOCK_TIME_OFFSET_SECONDS || "0",
  10
);

// Runtime-adjustable offset for interactive "time travel" in mock mode.
let runtimeOffset = 0;

// Fixed "now" in seconds for deterministic tests (null = real time).
let fixedNowSeconds: number | null = null;

export function nowSeconds(): number {
  if (fixedNowSeconds !== null) return fixedNowSeconds;
  const base = Math.floor(Date.now() / 1000);
  return (
    base +
    (Number.isFinite(OFFSET_SECONDS) ? OFFSET_SECONDS : 0) +
    runtimeOffset
  );
}

/**
 * Set a fixed "now" timestamp (seconds since epoch) or clear it with null.
 */
export function setFixedNow(timestamp: number | null) {
  fixedNowSeconds = timestamp;
  if (timestamp === null) runtimeOffset = 0;
}

/**
 * Dev helper to move "now" forward or backward in seconds.
 * Positive values fast-forward time; negative values rewind.
 */
export function debugAdvanceTime(seconds: number) {
  if (fixedNowSeconds !== null) {
    fixedNowSeconds += seconds;
  } else {
    runtimeOffset += seconds;
  }
}
