import { describe, expect, it } from "vitest";
import {
  normalizeGovernanceHostname,
  resolveGovernanceLinkSurface,
} from "@/lib/runtime/governance-hosts";

describe("normalizeGovernanceHostname", () => {
  it("normalizes forwarded host lists and strips ports", () => {
    expect(
      normalizeGovernanceHostname("veyfi-beta.dao-ops.com:443, edge.internal")
    ).toBe("veyfi-beta.dao-ops.com");
  });

  it("supports full URLs and trailing dots", () => {
    expect(normalizeGovernanceHostname("https://styfi.yearn.fi./foo")).toBe(
      "styfi.yearn.fi"
    );
  });

  it("rejects malformed bracket-host values", () => {
    expect(normalizeGovernanceHostname("[::1]evil.com")).toBeNull();
    expect(normalizeGovernanceHostname("[::1]:bad")).toBeNull();
    expect(normalizeGovernanceHostname("[::1")).toBeNull();
  });
});

describe("resolveGovernanceLinkSurface", () => {
  it("returns path-scoped for local and shared path hosts", () => {
    expect(resolveGovernanceLinkSurface("localhost:3000")).toBe("path-scoped");
    expect(resolveGovernanceLinkSurface("127.0.0.1")).toBe("path-scoped");
    expect(resolveGovernanceLinkSurface("app.dao-ops.com")).toBe("path-scoped");
  });

  it("returns preprod-subdomain for beta hosts", () => {
    expect(resolveGovernanceLinkSurface("veyfi-beta.dao-ops.com")).toBe(
      "preprod-subdomain"
    );
  });

  it("returns prod-subdomain for yearn subdomains", () => {
    expect(resolveGovernanceLinkSurface("app.yearn.fi")).toBe("prod-subdomain");
    expect(resolveGovernanceLinkSurface("styfi.yearn.fi")).toBe("prod-subdomain");
  });

  it("falls back to path-scoped for unknown hosts", () => {
    expect(resolveGovernanceLinkSurface("example.com")).toBe("path-scoped");
    expect(resolveGovernanceLinkSurface(null)).toBe("path-scoped");
  });
});
