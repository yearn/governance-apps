import { describe, expect, it } from "vitest";
import { getRefetchOnWindowFocus } from "@/lib/query/focus-refetch-policy";

describe("focus refetch policy", () => {
  it("explicitly enables focus refetch for critical account keys", () => {
    expect(getRefetchOnWindowFocus("styfi.account")).toBe(true);
    expect(getRefetchOnWindowFocus("veyfi.account")).toBe(true);
    expect(getRefetchOnWindowFocus("yeth.account")).toBe(true);
  });

  it("keeps non-critical keys opted out", () => {
    expect(getRefetchOnWindowFocus("cross-app.nudge")).toBe(false);
    expect(getRefetchOnWindowFocus("styfi.statsOverride")).toBe(false);
    expect(getRefetchOnWindowFocus("veyfi.statsOverride")).toBe(false);
  });

  it("defaults unknown keys to false", () => {
    expect(getRefetchOnWindowFocus("unknown.key")).toBe(false);
  });
});
