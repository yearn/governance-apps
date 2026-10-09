// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { resolveGovernanceAppPathHref, resolveGovernanceHref } from "@/lib/governance-links";
import { GET, HEAD } from "@/app/api/treasury-data/route";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("treasury host rollout", () => {
  it.each(["treasury.yearn.fi", "treasury-beta.dao-ops.com"])("rewrites %s roots and preserves API paths", (host) => {
    const root = middleware(new NextRequest("https://" + host + "/"));
    expect(new URL(root.headers.get("x-middleware-rewrite")!).pathname).toBe("/treasury");
    const explicitPath = middleware(new NextRequest("https://" + host + "/treasury"));
    expect(new URL(explicitPath.headers.get("x-middleware-rewrite")!).pathname).toBe("/treasury");
    const api = middleware(new NextRequest("https://" + host + "/api/treasury-data"));
    expect(api.headers.get("x-middleware-rewrite")).toBeNull();
    expect(root.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(root.headers.get("content-security-policy")).toContain("script-src");
    const head = middleware(new NextRequest("https://" + host + "/", { method: "HEAD" }));
    expect(new URL(head.headers.get("x-middleware-rewrite")!).pathname).toBe("/treasury");
  });

  it("keeps shared paths and cross-app links in the correct host family", () => {
    expect(middleware(new NextRequest("https://app.dao-ops.com/treasury")).headers.get("x-middleware-rewrite")).toBeNull();
    expect(resolveGovernanceHref("/treasury", "app.dao-ops.com")).toBe("/treasury");
    expect(resolveGovernanceHref("/treasury", "dao.yearn.fi")).toBe("https://treasury.yearn.fi");
    expect(resolveGovernanceHref("/treasury", "dao-beta.dao-ops.com")).toBe("https://treasury-beta.dao-ops.com");
    expect(resolveGovernanceHref("/dao", "treasury.yearn.fi")).toBe("https://dao.yearn.fi");
    expect(resolveGovernanceAppPathHref("treasury", "/", "treasury.yearn.fi")).toBe("/");
  });

  it.each([undefined, "false"])("keeps both API methods disabled without explicit build enablement (%s)", async (flag) => {
    vi.stubEnv("NEXT_PUBLIC_RUNTIME_MODE", "production");
    vi.stubEnv("NEXT_PUBLIC_ENABLE_TREASURY", flag);
    vi.stubEnv("TREASURY_DATA_URL", "https://fixture.invalid/treasury.json");
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    expect((await GET()).status).toBe(404);
    expect((await HEAD()).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });
});
