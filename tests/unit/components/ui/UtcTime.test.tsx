import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UtcTime } from "@/components/ui/UtcTime";
import {
  formatUtcDate,
  formatUtcDateTime,
  getUtcDateTimeAttribute,
} from "@/lib/date";

describe("UTC time foundations", () => {
  it("formats timestamps on either side of a UTC day boundary", () => {
    const beforeMidnight = Date.UTC(2026, 2, 24, 23, 59) / 1_000;
    const afterMidnight = Date.UTC(2026, 2, 25, 0, 1) / 1_000;

    expect(formatUtcDate(beforeMidnight)).toBe("Mar 24, 2026");
    expect(formatUtcDate(afterMidnight)).toBe("Mar 25, 2026");
    expect(formatUtcDateTime(beforeMidnight)).toBe(
      "Mar 24, 2026, 11:59 PM UTC",
    );
  });

  it("keeps the Unix epoch valid and emits machine-readable time", () => {
    render(<UtcTime timestamp={0} format="date-time" />);

    const time = screen.getByText("Jan 1, 1970, 12:00 AM UTC");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", "1970-01-01T00:00:00.000Z");
    expect(getUtcDateTimeAttribute(0n)).toBe("1970-01-01T00:00:00.000Z");
  });

  it("renders an explicit fallback without invalid time semantics", () => {
    render(<UtcTime timestamp={Number.NaN} fallback="Unavailable" />);

    const fallback = screen.getByText("Unavailable");
    expect(fallback.tagName).toBe("SPAN");
    expect(fallback).not.toHaveAttribute("datetime");
    expect(formatUtcDate(10n ** 30n)).toBe("--");
  });
});
