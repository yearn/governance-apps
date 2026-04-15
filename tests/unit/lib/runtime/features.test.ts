import { describe, expect, it } from "vitest";
import {
  isDebugUiEnabled,
  isProductionRuntime,
  isSimulationTransportFallbackEnabled,
  isYbcEnabled,
  isYethEnabled,
} from "@/lib/runtime/features";

describe("runtime feature flags", () => {
  it("treats non-production runtimes as enabled for gated app surfaces", () => {
    const env = {
      NEXT_PUBLIC_RUNTIME_MODE: "development",
      NEXT_PUBLIC_ENABLE_YBC: "false",
      NEXT_PUBLIC_ENABLE_YETH: "false",
      NEXT_PUBLIC_ENABLE_DEBUG_UI: "false",
    };

    expect(isProductionRuntime(env)).toBe(false);
    expect(isYbcEnabled(env)).toBe(true);
    expect(isYethEnabled(env)).toBe(true);
    expect(isDebugUiEnabled(env)).toBe(true);
  });

  it("disables gated app surfaces by default in production", () => {
    const env = {
      NEXT_PUBLIC_RUNTIME_MODE: "production",
      NEXT_PUBLIC_ENABLE_YBC: "false",
      NEXT_PUBLIC_ENABLE_YETH: "false",
      NEXT_PUBLIC_ENABLE_DEBUG_UI: "false",
    };

    expect(isProductionRuntime(env)).toBe(true);
    expect(isYbcEnabled(env)).toBe(false);
    expect(isYethEnabled(env)).toBe(false);
    expect(isDebugUiEnabled(env)).toBe(false);
  });

  it("allows explicit opt-in for gated app surfaces in production", () => {
    const env = {
      NEXT_PUBLIC_RUNTIME_MODE: "production",
      NEXT_PUBLIC_ENABLE_YBC: "true",
      NEXT_PUBLIC_ENABLE_YETH: "true",
      NEXT_PUBLIC_ENABLE_DEBUG_UI: "true",
    };

    expect(isYbcEnabled(env)).toBe(true);
    expect(isYethEnabled(env)).toBe(true);
    expect(isDebugUiEnabled(env)).toBe(true);
  });

  it("treats preview mode as non-production for feature gates", () => {
    const env = {
      NEXT_PUBLIC_RUNTIME_MODE: "preview",
      NODE_ENV: "production",
      NEXT_PUBLIC_ENABLE_YBC: "false",
      NEXT_PUBLIC_ENABLE_YETH: "false",
      NEXT_PUBLIC_ENABLE_DEBUG_UI: "false",
    };

    expect(isProductionRuntime(env)).toBe(false);
    expect(isYbcEnabled(env)).toBe(true);
    expect(isYethEnabled(env)).toBe(true);
    expect(isDebugUiEnabled(env)).toBe(true);
  });

  it("keeps simulation transport fallback disabled by default", () => {
    const env = {
      NEXT_PUBLIC_RUNTIME_MODE: "preview",
      NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK: "false",
    };

    expect(isSimulationTransportFallbackEnabled(env)).toBe(false);
  });

  it("enables simulation transport fallback only when explicitly set", () => {
    const env = {
      NEXT_PUBLIC_RUNTIME_MODE: "preview",
      NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK: "true",
    };

    expect(isSimulationTransportFallbackEnabled(env)).toBe(true);
  });
});
