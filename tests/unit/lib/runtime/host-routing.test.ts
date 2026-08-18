import { describe, expect, it } from "vitest";
import {
  applyHostPrefix,
  normalizeHostname,
  resolveHeadProbePath,
  resolveHostPrefix,
} from "@/lib/runtime/host-routing";

describe("resolveHostPrefix", () => {
  it("resolves canonical hostnames to app prefixes", () => {
    expect(resolveHostPrefix("styfi.yearn.fi")).toBe("/styfi");
    expect(resolveHostPrefix("veyfi.yearn.fi")).toBe("/veyfi");
    expect(resolveHostPrefix("teams.yearn.fi")).toBe("/teams");
    expect(resolveHostPrefix("yeth.yearn.fi")).toBe("/yeth");
    expect(resolveHostPrefix("ybc.yearn.fi")).toBe("/ybc");
  });

  it("resolves beta hostnames to app prefixes", () => {
    expect(resolveHostPrefix("styfi-beta.dao-ops.com")).toBe("/styfi");
    expect(resolveHostPrefix("veyfi-beta.dao-ops.com")).toBe("/veyfi");
    expect(resolveHostPrefix("teams-beta.dao-ops.com")).toBe("/teams");
    expect(resolveHostPrefix("yeth-beta.dao-ops.com")).toBe("/yeth");
    expect(resolveHostPrefix("ybc-beta.dao-ops.com")).toBe("/ybc");
  });

  it("normalizes hostname casing and whitespace", () => {
    expect(resolveHostPrefix("  YETH.YEARN.FI ")).toBe("/yeth");
  });

  it("supports host header values with explicit ports", () => {
    expect(resolveHostPrefix("styfi.yearn.fi:443")).toBe("/styfi");
    expect(resolveHostPrefix("veyfi.yearn.fi:8443")).toBe("/veyfi");
    expect(resolveHostPrefix("styfi-beta.dao-ops.com:443")).toBe("/styfi");
  });

  it("returns null for unknown or empty hosts", () => {
    expect(resolveHostPrefix("app.dao-ops.com")).toBeNull();
    expect(resolveHostPrefix("dao.yearn.fi")).toBeNull();
    expect(resolveHostPrefix("")).toBeNull();
    expect(resolveHostPrefix("   ")).toBeNull();
  });
});

describe("normalizeHostname", () => {
  it("normalizes forwarded host lists and strips ports", () => {
    expect(normalizeHostname("styfi.yearn.fi:443, edge.internal")).toBe(
      "styfi.yearn.fi"
    );
  });

  it("supports full URLs and trailing dots", () => {
    expect(normalizeHostname("https://yeth.yearn.fi./foo")).toBe("yeth.yearn.fi");
  });

  it("returns null for malformed bracket hosts", () => {
    expect(normalizeHostname("[::1")).toBeNull();
    expect(normalizeHostname("[::1]evil.com")).toBeNull();
    expect(normalizeHostname("[::1]:bad")).toBeNull();
  });
});

describe("applyHostPrefix", () => {
  it("preserves pathnames when no prefix is provided", () => {
    expect(applyHostPrefix("/does-not-exist", null)).toBe("/does-not-exist");
  });

  it("applies prefix when path is not yet namespaced", () => {
    expect(applyHostPrefix("/dashboard", "/styfi")).toBe("/styfi/dashboard");
    expect(applyHostPrefix("/", "/styfi")).toBe("/styfi/");
  });

  it("does not apply prefix twice", () => {
    expect(applyHostPrefix("/styfi", "/styfi")).toBe("/styfi");
    expect(applyHostPrefix("/styfi/positions", "/styfi")).toBe(
      "/styfi/positions"
    );
  });

  it("applies prefix for similarly named but non-namespaced paths", () => {
    expect(applyHostPrefix("/styfi-dashboard", "/styfi")).toBe(
      "/styfi/styfi-dashboard"
    );
  });
});

describe("resolveHeadProbePath", () => {
  it("falls back to root for unknown shared-host paths", () => {
    expect(resolveHeadProbePath("/does-not-exist", null)).toBe("/");
  });

  it("keeps app roots unchanged", () => {
    expect(resolveHeadProbePath("/styfi", null)).toBe("/styfi");
    expect(resolveHeadProbePath("/styfi/", null)).toBe("/styfi/");
  });

  it("normalizes nested app paths to app roots", () => {
    expect(resolveHeadProbePath("/dao/proposals/2", null)).toBe("/dao");
    expect(resolveHeadProbePath("/styfi/lasla", null)).toBe("/styfi");
    expect(resolveHeadProbePath("/veyfi/unknown", null)).toBe("/veyfi");
    expect(resolveHeadProbePath("/teams/security", null)).toBe("/teams");
    expect(resolveHeadProbePath("/ybc/members", null)).toBe("/ybc");
  });

  it("uses host prefix for branded hosts", () => {
    expect(resolveHeadProbePath("/does-not-exist", "/yeth")).toBe("/yeth");
  });

  it("keeps root path unchanged", () => {
    expect(resolveHeadProbePath("/", "/styfi")).toBe("/");
  });
});
