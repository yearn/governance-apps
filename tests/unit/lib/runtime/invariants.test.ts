import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  process.env = { ...ORIGINAL_ENV };
}

async function loadInvariants() {
  vi.resetModules();
  return import("@/lib/runtime/invariants");
}

describe("production runtime invariants", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("enforces invariants whenever runtime mode resolves to production", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "production";
    env.NEXT_PUBLIC_USE_MOCKS = "true";

    const { assertProductionRuntimeInvariants } = await loadInvariants();

    expect(() => assertProductionRuntimeInvariants("test/local-build")).toThrow(
      "NEXT_PUBLIC_USE_MOCKS"
    );
  });

  it("still enforces when mode is explicitly set to production", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "development";
    env.NEXT_PUBLIC_RUNTIME_MODE = "production";
    env.NEXT_PUBLIC_E2E = "true";

    const { assertProductionRuntimeInvariants } = await loadInvariants();

    expect(() => assertProductionRuntimeInvariants("test/prod")).toThrow(
      "NEXT_PUBLIC_E2E"
    );
  });

  it("does not enforce in preview mode", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "production";
    env.NEXT_PUBLIC_RUNTIME_MODE = "preview";
    env.NEXT_PUBLIC_E2E = "true";

    const { assertProductionRuntimeInvariants } = await loadInvariants();

    expect(() =>
      assertProductionRuntimeInvariants("test/preview")
    ).not.toThrow();
  });

  it("does not enforce in development mode", async () => {
    const env = process.env as Record<string, string | undefined>;
    env.NODE_ENV = "development";
    env.NEXT_PUBLIC_USE_MOCKS = "true";

    const { assertProductionRuntimeInvariants } = await loadInvariants();

    expect(() =>
      assertProductionRuntimeInvariants("test/development")
    ).not.toThrow();
  });
});
