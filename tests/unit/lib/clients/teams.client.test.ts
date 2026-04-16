import { describe, expect, it } from "vitest";
import {
  formatTeamsDate,
  formatTeamsPercentFromBps,
  formatTeamsTokenAmount,
} from "@/lib/clients/teams";

describe("teams client formatting helpers", () => {
  it("formats token amounts with the symbol preserved", () => {
    expect(formatTeamsTokenAmount("14.5", "YFI")).toBe("14.5 YFI");
    expect(formatTeamsTokenAmount("12345.678", "YFI")).toBe("12,345.68 YFI");
  });

  it("formats basis points as percentages", () => {
    expect(formatTeamsPercentFromBps(11_000)).toBe("110%");
    expect(formatTeamsPercentFromBps(1_000)).toBe("10%");
  });

  it("formats mock timestamps in a stable UTC date", () => {
    expect(formatTeamsDate(1_771_200_000)).toBe("Feb 16, 2026");
    expect(formatTeamsDate(null)).toBeNull();
  });
});
