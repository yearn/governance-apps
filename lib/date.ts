const DEFAULT_TIMESTAMP_FALLBACK = "--";

const UTC_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
  timeZone: "UTC",
});

export function unixSecondsToDate(
  timestampSeconds: number | bigint | null | undefined,
): Date | null {
  if (timestampSeconds === null || timestampSeconds === undefined) return null;
  if (
    typeof timestampSeconds === "number" &&
    !Number.isFinite(timestampSeconds)
  ) {
    return null;
  }

  const milliseconds =
    typeof timestampSeconds === "bigint"
      ? timestampSeconds * 1_000n
      : timestampSeconds * 1_000;
  const date = new Date(Number(milliseconds));
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatUtcDate(
  timestampSeconds: number | bigint | null | undefined,
  fallback = DEFAULT_TIMESTAMP_FALLBACK,
): string {
  const date = unixSecondsToDate(timestampSeconds);
  return date ? UTC_DATE_FORMATTER.format(date) : fallback;
}

export function formatUtcDateTime(
  timestampSeconds: number | bigint | null | undefined,
  fallback = DEFAULT_TIMESTAMP_FALLBACK,
): string {
  const date = unixSecondsToDate(timestampSeconds);
  return date ? `${UTC_DATE_TIME_FORMATTER.format(date)} UTC` : fallback;
}

export function getUtcDateTimeAttribute(
  timestampSeconds: number | bigint | null | undefined,
): string | undefined {
  return unixSecondsToDate(timestampSeconds)?.toISOString();
}
