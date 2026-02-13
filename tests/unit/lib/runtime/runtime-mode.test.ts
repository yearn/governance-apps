import { describe, expect, it } from "vitest";
import { isProductionMode, resolveRuntimeMode } from "@/lib/runtime/runtime-mode";

describe("resolveRuntimeMode", () => {
  it("prefers explicit NEXT_PUBLIC_RUNTIME_MODE when valid", () => {
    expect(
      resolveRuntimeMode({
        NEXT_PUBLIC_RUNTIME_MODE: "preview",
        NODE_ENV: "production",
      })
    ).toBe("preview");

    expect(
      resolveRuntimeMode({
        NEXT_PUBLIC_RUNTIME_MODE: "PRODUCTION",
        NODE_ENV: "development",
      })
    ).toBe("production");
  });

  it("derives mode from deployment markers when explicit mode is absent", () => {
    expect(
      resolveRuntimeMode({
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      })
    ).toBe("production");

    expect(
      resolveRuntimeMode({
        CF_PAGES_ENV: "preview",
        NODE_ENV: "production",
      })
    ).toBe("preview");

    expect(
      resolveRuntimeMode({
        DEPLOYMENT_ENV: "staging",
        NODE_ENV: "production",
      })
    ).toBe("preview");
  });

  it("falls back to NODE_ENV when no explicit mode or deployment markers exist", () => {
    expect(resolveRuntimeMode({ NODE_ENV: "production" })).toBe("production");
    expect(resolveRuntimeMode({ NODE_ENV: "development" })).toBe("development");
    expect(resolveRuntimeMode({})).toBe("development");
  });
});

describe("isProductionMode", () => {
  it("returns true only for production runtime mode", () => {
    expect(isProductionMode({ NEXT_PUBLIC_RUNTIME_MODE: "production" })).toBe(
      true
    );
    expect(isProductionMode({ NEXT_PUBLIC_RUNTIME_MODE: "preview" })).toBe(
      false
    );
  });
});
