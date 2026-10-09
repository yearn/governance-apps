import { execFileSync, spawn } from "node:child_process";
import { constants } from "node:fs";
import { copyFile, cp, mkdir, mkdtemp } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const source = process.cwd();
const workspace = await mkdtemp(join(tmpdir(), "treasury-rollout-"));
const files = new Set(execFileSync("git", ["ls-files", "--cached", "-z"], { cwd: source, encoding: "utf8" }).split("\0").filter(Boolean));
// Include the harness during its initial uncommitted review, but never copy
// arbitrary untracked files or ignored local configuration.
files.add("scripts/test-treasury-rollout.mjs");
files.add("tests/e2e/treasury-rollout/hosts.spec.ts");
for (const file of files) {
  if (file.split("/").some(part => part === ".env" || part.startsWith(".env.") || part === ".dev.vars" || part.startsWith(".dev.vars."))) continue;
  const target = join(workspace, file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(source, file), target);
}
console.log("Isolated treasury rollout evidence: " + workspace);
await cp(join(source, "node_modules"), join(workspace, "node_modules"), { recursive: true, mode: constants.COPYFILE_FICLONE });

const disabled = process.argv.includes("--disabled");
const port = process.env.E2E_PORT ?? "3371";
const env = {
  ...process.env,
  E2E_PORT: port,
  E2E_BASE_URL: "http://127.0.0.1:" + port,
  E2E_TREASURY_ROLLOUT: disabled ? "disabled" : "enabled",
  E2E_WEB_SERVER_COMMAND: "npm run start -- --hostname 127.0.0.1 --port " + port,
  E2E_REUSE_SERVER: "false",
  NODE_ENV: "production",
  NEXT_PUBLIC_RUNTIME_MODE: "production",
  NEXT_PUBLIC_ENABLE_TREASURY: String(!disabled),
  NEXT_PUBLIC_ENABLE_DAO: "false",
  NEXT_PUBLIC_ENABLE_TEAMS: "false",
  NEXT_PUBLIC_ENABLE_YETH: "false",
  NEXT_PUBLIC_ENABLE_YBC: "false",
  NEXT_PUBLIC_ENABLE_DAO_REVIEW_CONTROLS: "false",
  NEXT_PUBLIC_ENABLE_DEBUG_UI: "false",
  NEXT_PUBLIC_ENABLE_SIMULATION_TRANSPORT_FALLBACK: "false",
  NEXT_PUBLIC_USE_MOCKS: "false",
  NEXT_PUBLIC_E2E: "false",
  NEXT_PUBLIC_GLOBAL_DATA_URL: "https://fixture.invalid/global.json",
  NEXT_PUBLIC_RPC_URLS: "http://127.0.0.1:8546",
  NEXT_PUBLIC_WC_PROJECT_ID: "treasury-rollout-fixture",
  TREASURY_DATA_URL: "",
};

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: workspace, stdio: "inherit", env });
    child.on("error", reject);
    child.on("exit", code => code === 0 ? resolve() : reject(new Error("Treasury rollout validation exited " + code)));
  });
}

await run(["node_modules/next/dist/bin/next", "build", "--webpack"]);
await run(["node_modules/@playwright/test/cli.js", "test", "--project=treasury-rollout", "--workers=1"]);
