import { describe, expect, it } from "vitest";
import { isTreasuryEnabled, isTreasuryMockRuntimeEnabled } from "@/lib/runtime/features";
import { resolveHeaderAppKey, resolveHeaderPrimaryNav } from "@/lib/header-nav";
import { resolveHeadProbePath, resolveHostPrefix } from "@/lib/runtime/host-routing";

describe("treasury rollout", () => {
  it("fails closed in production unless explicitly enabled, with mocks always disabled", () => {
    for (const enabled of [undefined, "false", "true"]) {
      const env = { NEXT_PUBLIC_RUNTIME_MODE: "production", NEXT_PUBLIC_ENABLE_TREASURY: enabled, NEXT_PUBLIC_USE_MOCKS: "true" };
      expect(isTreasuryEnabled(env)).toBe(enabled === "true");
      expect(isTreasuryMockRuntimeEnabled(env)).toBe(false);
    }
  });
  it("requires explicit mock selection in development", () => {
    expect(isTreasuryEnabled({ NEXT_PUBLIC_RUNTIME_MODE: "development" })).toBe(true);
    expect(isTreasuryMockRuntimeEnabled({ NEXT_PUBLIC_RUNTIME_MODE: "development" })).toBe(false);
    expect(isTreasuryMockRuntimeEnabled({ NEXT_PUBLIC_RUNTIME_MODE: "development", NEXT_PUBLIC_USE_MOCKS: "true" })).toBe(true);
  });
  it("supports path navigation without introducing a treasury hostname", () => {
    expect(resolveHeaderPrimaryNav("/treasury", "treasury", "app.dao-ops.com")).toEqual({ label: "Treasury", path: "/treasury" });
    expect(resolveHeaderAppKey("/treasury-other", null, "app.dao-ops.com")).toBeNull();
    expect(resolveHostPrefix("treasury.yearn.fi")).toBeNull();
    expect(resolveHeadProbePath("/treasury", null)).toBe("/treasury");
  });
});
