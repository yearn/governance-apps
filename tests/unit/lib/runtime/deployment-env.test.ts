import { describe, expect, it } from "vitest";
import {
  isProductionDeployment,
  shouldSendNoIndexHeader,
} from "@/lib/runtime/deployment-env";

describe("deployment environment detection", () => {
  it("prefers explicit NEXT_PUBLIC_RUNTIME_MODE when present", () => {
    expect(
      isProductionDeployment({
        NEXT_PUBLIC_RUNTIME_MODE: "production",
        NODE_ENV: "development",
      })
    ).toBe(true);
    expect(
      isProductionDeployment({
        NEXT_PUBLIC_RUNTIME_MODE: "preview",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("uses Vercel production env when available", () => {
    expect(
      isProductionDeployment({ VERCEL_ENV: "production", NODE_ENV: "production" })
    ).toBe(true);
    expect(
      isProductionDeployment({ VERCEL_ENV: "preview", NODE_ENV: "production" })
    ).toBe(false);
  });

  it("uses Cloudflare deployment env when available", () => {
    expect(
      isProductionDeployment({
        CF_PAGES_ENV: "production",
        NODE_ENV: "production",
      })
    ).toBe(true);
    expect(
      isProductionDeployment({
        CF_PAGES_ENV: "preview",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("uses generic deployment env marker when available", () => {
    expect(
      isProductionDeployment({
        DEPLOYMENT_ENV: "production",
        NODE_ENV: "production",
      })
    ).toBe(true);
    expect(
      isProductionDeployment({
        DEPLOYMENT_ENV: "staging",
        NODE_ENV: "production",
      })
    ).toBe(false);
  });

  it("falls back to NODE_ENV when deployment markers are absent", () => {
    expect(isProductionDeployment({ NODE_ENV: "production" })).toBe(true);
    expect(isProductionDeployment({ NODE_ENV: "development" })).toBe(false);
  });

  it("sends noindex headers only outside production deployments", () => {
    expect(
      shouldSendNoIndexHeader({
        NEXT_PUBLIC_RUNTIME_MODE: "preview",
        NODE_ENV: "production",
      })
    ).toBe(true);
    expect(
      shouldSendNoIndexHeader({ VERCEL_ENV: "preview", NODE_ENV: "production" })
    ).toBe(true);
    expect(
      shouldSendNoIndexHeader({
        CF_PAGES_ENV: "preview",
        NODE_ENV: "production",
      })
    ).toBe(true);
    expect(
      shouldSendNoIndexHeader({
        CF_PAGES_ENV: "production",
        NODE_ENV: "production",
      })
    ).toBe(false);
    expect(shouldSendNoIndexHeader({ NODE_ENV: "production" })).toBe(false);
  });
});
