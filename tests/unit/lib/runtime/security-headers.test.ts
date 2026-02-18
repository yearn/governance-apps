import { describe, expect, it } from "vitest";
import {
  buildContentSecurityPolicy,
  buildPermissionsPolicy,
  buildSecurityHeaders,
  PERMISSIONS_POLICY_HEADER,
  SAFE_APP_FRAME_ANCESTORS,
} from "@/lib/runtime/security-headers";

describe("security header policy", () => {
  it("uses nonce-based script policy without unsafe-inline scripts", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "abc123",
      isDevelopment: false,
      isProduction: true,
    });

    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    expect(csp).not.toContain("script-src 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("allows localhost transports in development", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "abc123",
      isDevelopment: true,
      isProduction: false,
    });

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("http://localhost:*");
    expect(csp).toContain("ws://localhost:*");
  });

  it("supports unsafe-inline scripts for static-friendly pages", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "abc123",
      isDevelopment: false,
      isProduction: true,
      allowUnsafeInlineScripts: true,
    });

    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("'nonce-abc123'");
  });

  it("allows Safe wallet iframe ancestors only when explicitly enabled", () => {
    const csp = buildContentSecurityPolicy({
      nonce: "abc123",
      isDevelopment: false,
      isProduction: true,
      allowSafeFrameEmbedding: true,
    });

    const allowedSafeAncestors = SAFE_APP_FRAME_ANCESTORS.join(" ");
    expect(csp).toContain(`frame-ancestors ${allowedSafeAncestors}`);
    expect(csp).not.toContain("frame-ancestors 'none'");
  });

  it("builds stricter browser security headers", () => {
    const headers = buildSecurityHeaders({
      nonce: "abc123",
      isDevelopment: false,
      isProduction: true,
    });

    expect(headers["Permissions-Policy"]).toBe(buildPermissionsPolicy());
    expect(headers["Cross-Origin-Opener-Policy"]).toBe(
      "same-origin-allow-popups"
    );
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-site");
    expect(headers["Origin-Agent-Cluster"]).toBe("?1");
  });

  it("formats Permissions-Policy with comma-separated directives", () => {
    const policy = buildPermissionsPolicy();
    expect(policy).toBe(PERMISSIONS_POLICY_HEADER);
    expect(policy).not.toContain(";");
  });
});
