import { describe, expect, it } from "vitest";
import { resolveAllowedOrigin } from "@/lib/runtime/host-allowlist";

describe("resolveAllowedOrigin", () => {
  it("uses canonical host when no host header is available", () => {
    expect(resolveAllowedOrigin("styfi", null)).toBe("https://styfi.yearn.fi");
  });

  it("accepts canonical app host", () => {
    expect(resolveAllowedOrigin("veyfi", "veyfi.yearn.fi")).toBe(
      "https://veyfi.yearn.fi"
    );
  });

  it("accepts localhost and preserves explicit local ports over http", () => {
    expect(resolveAllowedOrigin("styfi", "localhost:3000")).toBe(
      "http://localhost:3000"
    );
    expect(resolveAllowedOrigin("styfi", "127.0.0.1:8787")).toBe(
      "http://127.0.0.1:8787"
    );
    expect(resolveAllowedOrigin("styfi", "[::1]:3000")).toBe("http://[::1]:3000");
  });

  it("falls back to canonical origin for invalid localhost ports", () => {
    expect(resolveAllowedOrigin("styfi", "localhost:99999")).toBe(
      "https://styfi.yearn.fi"
    );
    expect(resolveAllowedOrigin("styfi", "[::1]:99999")).toBe(
      "https://styfi.yearn.fi"
    );
  });

  it("accepts shared allowed host", () => {
    expect(resolveAllowedOrigin("styfi", "app.dao-ops.com")).toBe(
      "https://app.dao-ops.com"
    );
  });

  it("accepts app-specific beta hosts", () => {
    expect(resolveAllowedOrigin("styfi", "styfi-beta.dao-ops.com")).toBe(
      "https://styfi-beta.dao-ops.com"
    );
    expect(resolveAllowedOrigin("veyfi", "veyfi-beta.dao-ops.com")).toBe(
      "https://veyfi-beta.dao-ops.com"
    );
    expect(resolveAllowedOrigin("teams", "teams-beta.dao-ops.com")).toBe(
      "https://teams-beta.dao-ops.com"
    );
    expect(resolveAllowedOrigin("yeth", "yeth-beta.dao-ops.com")).toBe(
      "https://yeth-beta.dao-ops.com"
    );
    expect(resolveAllowedOrigin("ybc", "ybc-beta.dao-ops.com")).toBe(
      "https://ybc-beta.dao-ops.com"
    );
  });

  it("does not accept beta hosts assigned to a different app", () => {
    expect(resolveAllowedOrigin("styfi", "veyfi-beta.dao-ops.com")).toBe(
      "https://styfi.yearn.fi"
    );
    expect(resolveAllowedOrigin("veyfi", "yeth-beta.dao-ops.com")).toBe(
      "https://veyfi.yearn.fi"
    );
    expect(resolveAllowedOrigin("teams", "styfi-beta.dao-ops.com")).toBe(
      "https://teams.yearn.fi"
    );
    expect(resolveAllowedOrigin("ybc", "styfi-beta.dao-ops.com")).toBe(
      "https://ybc.yearn.fi"
    );
  });

  it("falls back to canonical origin for untrusted hosts", () => {
    expect(resolveAllowedOrigin("styfi", "evil.example")).toBe(
      "https://styfi.yearn.fi"
    );
    expect(resolveAllowedOrigin("veyfi", "veyfi.yearn.fi.attacker.tld")).toBe(
      "https://veyfi.yearn.fi"
    );
  });

  it("falls back to canonical origin for malformed bracket-host values", () => {
    expect(resolveAllowedOrigin("styfi", "[::1]evil.com")).toBe(
      "https://styfi.yearn.fi"
    );
    expect(resolveAllowedOrigin("styfi", "[::1]:bad")).toBe(
      "https://styfi.yearn.fi"
    );
    expect(resolveAllowedOrigin("styfi", "[::1")).toBe("https://styfi.yearn.fi");
  });
});
