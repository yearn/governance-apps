import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const SCRIPT_PATH = `${process.cwd()}/scripts/validate-prod-env.mjs`;

function runWithEnv(env: Record<string, string | undefined>) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
  });
}

describe("validate-prod-env", () => {
  it("skips validation when NODE_ENV is not production", () => {
    const result = runWithEnv({
      NODE_ENV: "development",
      NEXT_PUBLIC_RUNTIME_MODE: undefined,
      NEXT_PUBLIC_USE_MOCKS: "true",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Skipping production env validation");
  });

  it("fails when runtime mode is missing in production", () => {
    const result = runWithEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_RUNTIME_MODE: "",
      NEXT_PUBLIC_USE_MOCKS: "false",
      NEXT_PUBLIC_E2E: "false",
      NEXT_PUBLIC_WC_PROJECT_ID: "placeholder",
      NEXT_PUBLIC_GLOBAL_DATA_URL: "https://example.invalid/global-data.json",
      NEXT_PUBLIC_MOTD_URL: "https://example.invalid/motd.json",
      NEXT_PUBLIC_RPC_URLS: "https://rpc.example.invalid",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_RUNTIME_MODE is required");
  });

  it("fails when forbidden production flags are enabled", () => {
    const result = runWithEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_RUNTIME_MODE: "production",
      NEXT_PUBLIC_USE_MOCKS: "true",
      NEXT_PUBLIC_E2E: "false",
      NEXT_PUBLIC_WC_PROJECT_ID: "placeholder",
      NEXT_PUBLIC_GLOBAL_DATA_URL: "https://example.invalid/global-data.json",
      NEXT_PUBLIC_MOTD_URL: "https://example.invalid/motd.json",
      NEXT_PUBLIC_RPC_URLS: "https://rpc.example.invalid",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_USE_MOCKS must be false");
  });

  it("fails when NEXT_PUBLIC_RPC_URLS is missing in production", () => {
    const result = runWithEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_RUNTIME_MODE: "production",
      NEXT_PUBLIC_USE_MOCKS: "false",
      NEXT_PUBLIC_E2E: "false",
      NEXT_PUBLIC_WC_PROJECT_ID: "placeholder",
      NEXT_PUBLIC_GLOBAL_DATA_URL: "https://example.invalid/global-data.json",
      NEXT_PUBLIC_MOTD_URL: "https://example.invalid/motd.json",
      NEXT_PUBLIC_RPC_URLS: "   ,   ",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_RPC_URLS");
  });

  it("fails when simulation transport fallback is enabled in production", () => {
    const result = runWithEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_RUNTIME_MODE: "production",
      NEXT_PUBLIC_USE_MOCKS: "false",
      NEXT_PUBLIC_E2E: "false",
      NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK: "true",
      NEXT_PUBLIC_WC_PROJECT_ID: "placeholder",
      NEXT_PUBLIC_GLOBAL_DATA_URL: "https://example.invalid/global-data.json",
      NEXT_PUBLIC_MOTD_URL: "https://example.invalid/motd.json",
      NEXT_PUBLIC_RPC_URLS: "https://rpc.example.invalid",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK must be false"
    );
  });

  it("fails when yETH is enabled without NEXT_PUBLIC_YETH_GLOBAL_DATA_URL", () => {
    const result = runWithEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_RUNTIME_MODE: "production",
      NEXT_PUBLIC_USE_MOCKS: "false",
      NEXT_PUBLIC_E2E: "false",
      NEXT_PUBLIC_ENABLE_YETH: "true",
      NEXT_PUBLIC_WC_PROJECT_ID: "placeholder",
      NEXT_PUBLIC_GLOBAL_DATA_URL: "https://example.invalid/global-data.json",
      NEXT_PUBLIC_MOTD_URL: "https://example.invalid/motd.json",
      NEXT_PUBLIC_RPC_URLS: "https://rpc.example.invalid",
      NEXT_PUBLIC_YETH_GLOBAL_DATA_URL: "",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("NEXT_PUBLIC_YETH_GLOBAL_DATA_URL");
  });

  it("passes with production-safe settings", () => {
    const result = runWithEnv({
      NODE_ENV: "production",
      NEXT_PUBLIC_RUNTIME_MODE: "production",
      NEXT_PUBLIC_USE_MOCKS: "false",
      NEXT_PUBLIC_E2E: "false",
      NEXT_PUBLIC_ENABLE_YETH: "true",
      NEXT_PUBLIC_WC_PROJECT_ID: "placeholder",
      NEXT_PUBLIC_GLOBAL_DATA_URL: "https://example.invalid/global-data.json",
      NEXT_PUBLIC_YETH_GLOBAL_DATA_URL:
        "https://example.invalid/yeth-global-data.json",
      NEXT_PUBLIC_MOTD_URL: "https://example.invalid/motd.json",
      NEXT_PUBLIC_RPC_URLS: "https://rpc.example.invalid",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Production environment validation passed.");
  });
});
