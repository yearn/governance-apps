import type { HTMLAttributes } from "react";
import {
  formatUtcDate,
  formatUtcDateTime,
  getUtcDateTimeAttribute,
} from "@/lib/date";

type UtcTimeProps = Omit<HTMLAttributes<HTMLTimeElement>, "dateTime"> & {
  timestamp: number | bigint | null | undefined;
  format?: "date" | "date-time";
  fallback?: string;
};

export function UtcTime({
  timestamp,
  format = "date-time",
  fallback = "--",
  ...props
}: UtcTimeProps) {
  const dateTime = getUtcDateTimeAttribute(timestamp);
  const label =
    format === "date"
      ? formatUtcDate(timestamp, fallback)
      : formatUtcDateTime(timestamp, fallback);

  if (!dateTime) return <span {...props}>{label}</span>;

  return (
    <time {...props} dateTime={dateTime}>
      {label}
    </time>
  );
}
