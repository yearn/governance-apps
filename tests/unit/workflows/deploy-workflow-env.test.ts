import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const expectedRuntimeEnv: Record<string, string> = {
  NODE_ENV: "production",
  NEXT_PUBLIC_RUNTIME_MODE: "production",
  NEXT_PUBLIC_USE_MOCKS: '"false"',
  NEXT_PUBLIC_E2E: '"false"',
  NEXT_PUBLIC_ENABLE_DEBUG_UI: '"false"',
  NEXT_PUBLIC_ENABLE_YETH:
    "${{ vars.NEXT_PUBLIC_ENABLE_YETH || secrets.NEXT_PUBLIC_ENABLE_YETH || 'false' }}",
  NEXT_PUBLIC_WC_PROJECT_ID:
    "${{ secrets.NEXT_PUBLIC_WC_PROJECT_ID || vars.NEXT_PUBLIC_WC_PROJECT_ID }}",
  NEXT_PUBLIC_GLOBAL_DATA_URL:
    "${{ vars.NEXT_PUBLIC_GLOBAL_DATA_URL || secrets.NEXT_PUBLIC_GLOBAL_DATA_URL }}",
  NEXT_PUBLIC_YETH_GLOBAL_DATA_URL:
    "${{ secrets.NEXT_PUBLIC_YETH_GLOBAL_DATA_URL || vars.NEXT_PUBLIC_YETH_GLOBAL_DATA_URL }}",
  NEXT_PUBLIC_MOTD_URL:
    "${{ vars.NEXT_PUBLIC_MOTD_URL || secrets.NEXT_PUBLIC_MOTD_URL }}",
  NEXT_PUBLIC_RPC_URLS:
    "${{ secrets.NEXT_PUBLIC_RPC_URLS || vars.NEXT_PUBLIC_RPC_URLS }}",
};

function parseAnchoredRuntimeEnv(workflowPath: string) {
  const content = readFileSync(workflowPath, "utf8");
  const envBlock = content.match(
    /^\s{6}- name: Validate Production Env Invariants\n\s{8}env:\s*&prod_runtime_env\n((?:^\s{10}[A-Z0-9_]+:.*\n)+)\s{8}run:\s+npm run validate:prod-env/m
  );
  if (!envBlock) {
    throw new Error(
      `Missing anchored runtime env block for Validate Production Env Invariants in ${workflowPath}`
    );
  }

  const result: Record<string, string> = {};
  const lines = envBlock[1].trimEnd().split("\n");
  for (const line of lines) {
    const match = line.match(/^\s{10}([A-Z0-9_]+):\s*(.+)$/);
    if (!match) continue;
    result[match[1]] = match[2].trim();
  }
  return result;
}

describe("deploy workflow env wiring", () => {
  const workflows = [
    ".github/workflows/deploy-preprod.yml",
    ".github/workflows/deploy-production.yml",
  ];

  for (const relativePath of workflows) {
    const workflowPath = path.resolve(process.cwd(), relativePath);

    it(`${relativePath} keeps production runtime env wiring complete`, () => {
      expect(parseAnchoredRuntimeEnv(workflowPath)).toEqual(expectedRuntimeEnv);
    });

    it(`${relativePath} reuses shared runtime env for build and deploy steps`, () => {
      const content = readFileSync(workflowPath, "utf8");
      expect(content).toMatch(
        /^\s{6}- name: Build OpenNext Worker\n\s{8}env:\s+\*prod_runtime_env\n\s{8}run:\s+npm run worker:build/m
      );
      expect(content).toMatch(
        /^\s{6}- name: Deploy To Cloudflare .+\n\s{8}env:\n\s{10}<<:\s+\*prod_runtime_env/m
      );
    });
  }
});
