#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = process.cwd();
const DEFAULT_CONFIG = "wrangler.preprod.jsonc";
const DEFAULT_LIMIT_KIB = 3072;
const DEFAULT_WARN_KIB = 3000;

export function parseWorkerUploadSize(output) {
  const match = output.match(
    /Total Upload:\s+([\d.]+)\s+KiB\s+\/\s+gzip:\s+([\d.]+)\s+KiB/
  );
  if (!match) return null;

  return {
    rawKiB: Number(match[1]),
    gzipKiB: Number(match[2]),
  };
}

function parsePositiveNumber(value, fallback, name) {
  if (value === undefined || value === "") return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number when provided.`);
  }

  return parsed;
}

export function evaluateWorkerSize({ gzipKiB, limitKiB, warnKiB }) {
  if (gzipKiB > limitKiB) {
    return {
      status: "fail",
      message: `Worker gzip upload size ${gzipKiB.toFixed(
        2
      )} KiB exceeds the ${limitKiB.toFixed(2)} KiB budget.`,
    };
  }

  if (gzipKiB > warnKiB) {
    return {
      status: "warn",
      message: `Worker gzip upload size ${gzipKiB.toFixed(
        2
      )} KiB is above the ${warnKiB.toFixed(2)} KiB warning threshold.`,
    };
  }

  return {
    status: "pass",
    message: `Worker gzip upload size ${gzipKiB.toFixed(
      2
    )} KiB is within budget.`,
  };
}

function assertWorkerBuildExists() {
  const workerPath = path.join(ROOT, ".open-next", "worker.js");
  if (!fs.existsSync(workerPath)) {
    throw new Error(
      ".open-next/worker.js is missing. Run npm run worker:build before checking worker size."
    );
  }
}

function runWranglerDryRun(configPath) {
  const wranglerBin = path.join(
    ROOT,
    "node_modules",
    "wrangler",
    "bin",
    "wrangler.js"
  );
  if (!fs.existsSync(wranglerBin)) {
    throw new Error("Wrangler is not installed. Run npm ci first.");
  }

  const logDir = path.join(os.tmpdir(), "governance-apps-wrangler-logs");
  fs.mkdirSync(logDir, { recursive: true });

  return spawnSync(
    process.execPath,
    [wranglerBin, "deploy", "-c", configPath, "--dry-run", "--keep-vars"],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH || logDir,
      },
    }
  );
}

function main() {
  const configPath = process.argv[2] || DEFAULT_CONFIG;
  const limitKiB = parsePositiveNumber(
    process.env.WORKER_SIZE_LIMIT_KIB,
    DEFAULT_LIMIT_KIB,
    "WORKER_SIZE_LIMIT_KIB"
  );
  const warnKiB = parsePositiveNumber(
    process.env.WORKER_SIZE_WARN_KIB,
    DEFAULT_WARN_KIB,
    "WORKER_SIZE_WARN_KIB"
  );

  assertWorkerBuildExists();

  const result = runWranglerDryRun(configPath);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const size = parseWorkerUploadSize(output);

  if (!size) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error("Could not parse Wrangler Total Upload output.");
  }

  console.log(
    `Worker upload size: ${size.rawKiB.toFixed(2)} KiB / gzip: ${size.gzipKiB.toFixed(
      2
    )} KiB`
  );
  console.log(
    `Worker gzip budget: ${limitKiB.toFixed(2)} KiB; warning threshold: ${warnKiB.toFixed(
      2
    )} KiB.`
  );

  const evaluation = evaluateWorkerSize({
    gzipKiB: size.gzipKiB,
    limitKiB,
    warnKiB,
  });

  if (evaluation.status === "fail") {
    console.error(evaluation.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.stdout.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    process.exit(result.status ?? 1);
  }

  if (evaluation.status === "warn") {
    console.warn(evaluation.message);
    return;
  }

  console.log(evaluation.message);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === thisFile) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
