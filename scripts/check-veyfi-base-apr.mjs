#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const RATIO_SCALE = 1_000_000n;
const VEYFI_BOOST_EPOCHS = 104;

function usage() {
  console.log(`Usage:
  npm run check:veyfi-apr -- [source] [--epoch current|projected] [--boost-epochs N] [--current-epoch N]

Arguments:
  source               Optional file path, URL, or "-" for stdin.
                       Defaults to NEXT_PUBLIC_GLOBAL_DATA_URL from env or .env.local.
  --epoch              Which APR block to inspect. Default: current
  --boost-epochs       Optional migrated veYFI boost_epochs value for a user-specific APR preview.
  --current-epoch      Optional current epoch override for migrated veYFI preview.

Examples:
  npm run check:veyfi-apr
  npm run check:veyfi-apr -- https://styfi.s3.fr-par.scw.cloud/mainnet/stats.json
  npm run check:veyfi-apr -- ./stats.json --boost-epochs 95 --current-epoch 2
  curl -fsSL https://styfi.s3.fr-par.scw.cloud/mainnet/stats.json | npm run check:veyfi-apr -- -
`);
}

function parseArgs(argv) {
  const result = {
    source: null,
    epoch: "current",
    boostEpochs: null,
    currentEpoch: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--help" || arg === "-h") {
      usage();
      process.exit(0);
    }

    if (arg === "--epoch") {
      result.epoch = argv[i + 1] ?? "";
      i += 1;
      continue;
    }

    if (arg === "--boost-epochs") {
      result.boostEpochs = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (arg === "--current-epoch") {
      result.currentEpoch = Number(argv[i + 1]);
      i += 1;
      continue;
    }

    if (!arg.startsWith("--") && result.source === null) {
      result.source = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (result.epoch !== "current" && result.epoch !== "projected") {
    throw new Error(`Invalid --epoch value: ${result.epoch}`);
  }

  if (
    result.boostEpochs !== null &&
    (!Number.isFinite(result.boostEpochs) || result.boostEpochs < 0)
  ) {
    throw new Error(`Invalid --boost-epochs value: ${result.boostEpochs}`);
  }

  if (
    result.currentEpoch !== null &&
    (!Number.isFinite(result.currentEpoch) || result.currentEpoch < 0)
  ) {
    throw new Error(`Invalid --current-epoch value: ${result.currentEpoch}`);
  }

  return result;
}

function loadEnvValue(name) {
  if (process.env[name]) return process.env[name];

  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return null;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.trim().startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (key !== name) continue;
    return line.slice(separatorIndex + 1).trim();
  }

  return null;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(numeric) ? numeric : null;
}

function toBigInt(value) {
  if (value === null || value === undefined) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function formatPercent(value, maximumFractionDigits = 2) {
  return Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        style: "percent",
        maximumFractionDigits,
      })
    : "n/a";
}

function formatNumber(value, maximumFractionDigits = 2) {
  return Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        maximumFractionDigits,
      })
    : "n/a";
}

function normalizeSymbol(symbol) {
  return String(symbol).toLowerCase();
}

function deriveBaseAprFromEffective({ effectiveApr, utilizationRatio, boostMultiplier }) {
  if (
    !Number.isFinite(effectiveApr) ||
    effectiveApr < 0 ||
    !Number.isFinite(utilizationRatio) ||
    utilizationRatio <= 0 ||
    !Number.isFinite(boostMultiplier) ||
    boostMultiplier <= 0
  ) {
    return null;
  }

  return (effectiveApr * utilizationRatio) / boostMultiplier;
}

function getVeyfiMigratedBoostMultiplier(boostEpochs, currentEpoch) {
  if (!Number.isFinite(boostEpochs) || !Number.isFinite(currentEpoch)) {
    return 1;
  }

  const normalizedBoostEpochs = Math.max(
    0,
    Math.min(VEYFI_BOOST_EPOCHS, Math.floor(boostEpochs)),
  );
  const normalizedCurrentEpoch = Math.max(0, Math.floor(currentEpoch));
  const remainingEpochs = normalizedBoostEpochs - normalizedCurrentEpoch;

  if (remainingEpochs <= 0) {
    return 1;
  }

  return 1 + remainingEpochs / VEYFI_BOOST_EPOCHS;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

async function loadPayload(source) {
  if (source === "-") {
    const content = fs.readFileSync(0, "utf8");
    return { label: "stdin", json: JSON.parse(content) };
  }

  if (source && /^https?:\/\//i.test(source)) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${source}: ${response.status} ${response.statusText}`);
    }
    return { label: source, json: await response.json() };
  }

  if (source) {
    const resolved = path.resolve(process.cwd(), source);
    return {
      label: resolved,
      json: JSON.parse(fs.readFileSync(resolved, "utf8")),
    };
  }

  const defaultSource = loadEnvValue("NEXT_PUBLIC_GLOBAL_DATA_URL");
  if (!defaultSource) {
    throw new Error("No source provided and NEXT_PUBLIC_GLOBAL_DATA_URL is not set.");
  }

  return loadPayload(defaultSource);
}

function inspectPayload(payload, epochMode) {
  const boostBps = toNumber(payload?.global?.maxBoostBps);
  const boostMultiplier = boostBps !== null ? boostBps / 10000 : null;
  const styfiAprBps = toNumber(payload?.styfi?.[epochMode]?.aprBps);
  const styfiApr = styfiAprBps !== null ? styfiAprBps / 10000 : null;

  const capacityBySymbol = new Map(
    (payload?.global?.veyfi?.tokens ?? []).map((token) => [
      normalizeSymbol(token.symbol),
      toBigInt(token?.redemption?.capacity),
    ]),
  );

  const rows = [];
  for (const token of payload?.llyfi ?? []) {
    const symbol = normalizeSymbol(token.symbol);
    const capacity = capacityBySymbol.get(symbol);
    const staked = toBigInt(token.staked);
    const unstaking = toBigInt(token.unstaking);
    const effectiveAprBps = toNumber(token?.[epochMode]?.aprBps);

    if (
      capacity === null ||
      capacity === undefined ||
      capacity <= 0n ||
      staked === null ||
      unstaking === null ||
      effectiveAprBps === null ||
      boostMultiplier === null
    ) {
      rows.push({
        symbol: token.symbol,
        skipped: true,
      });
      continue;
    }

    const utilizationRatio =
      Number(((staked + unstaking) * RATIO_SCALE) / capacity) / Number(RATIO_SCALE);
    const effectiveApr = effectiveAprBps / 10000;
    const baseApr = deriveBaseAprFromEffective({
      effectiveApr,
      utilizationRatio,
      boostMultiplier,
    });

    rows.push({
      symbol: token.symbol,
      skipped: baseApr === null,
      capacity,
      staked: staked + unstaking,
      utilizationRatio,
      effectiveApr,
      baseApr,
    });
  }

  const baseAprs = rows
    .filter((row) => !row.skipped && row.baseApr !== null)
    .map((row) => row.baseApr);

  const commonBaseApr = median(baseAprs);

  return {
    boostMultiplier,
    styfiApr,
    commonBaseApr,
    rows,
  };
}

async function main() {
  try {
    const options = parseArgs(process.argv.slice(2));
    const { label, json } = await loadPayload(options.source);
    const epochMode = options.epoch;
    const report = inspectPayload(json, epochMode);

    const payloadEpoch = toNumber(json?.meta?.epoch);
    const currentEpoch = options.currentEpoch ?? payloadEpoch;

    console.log(`Source: ${label}`);
    console.log(
      `Payload: epoch=${json?.meta?.epoch ?? "n/a"} block=${json?.meta?.blockNumber ?? "n/a"} timestamp=${json?.meta?.timestamp ?? "n/a"}`,
    );
    console.log(`Mode: ${epochMode}`);
    console.log(`Global max boost: ${formatNumber(report.boostMultiplier, 4)}x`);
    console.log(`stYFI APR (${epochMode}): ${formatPercent(report.styfiApr)}`);
    console.log(
      `Derived common base APR (${epochMode}): ${formatPercent(report.commonBaseApr)}`,
    );

    if (report.commonBaseApr !== null && report.styfiApr !== null) {
      const delta = report.commonBaseApr - report.styfiApr;
      console.log(`Delta vs stYFI APR: ${formatPercent(delta)}`);
    }

    console.log("");
    console.log("Per-locker implied base APR:");
    for (const row of report.rows) {
      if (row.skipped) {
        console.log(`- ${row.symbol}: skipped (missing or invalid inputs)`);
        continue;
      }

      console.log(
        [
          `- ${row.symbol}:`,
          `effective=${formatPercent(row.effectiveApr)}`,
          `ratio=${formatPercent(row.utilizationRatio)}`,
          `base=${formatPercent(row.baseApr)}`,
        ].join(" "),
      );
    }

    if (options.boostEpochs !== null) {
      console.log("");
      console.log("Migrated veYFI preview:");
      console.log(`- boostEpochs=${Math.floor(options.boostEpochs)}`);
      console.log(`- currentEpoch=${currentEpoch ?? "n/a"}`);

      const migratedBoost =
        currentEpoch === null
          ? null
          : getVeyfiMigratedBoostMultiplier(options.boostEpochs, currentEpoch);
      console.log(`- boost=${formatNumber(migratedBoost, 4)}x`);

      if (report.commonBaseApr !== null && migratedBoost !== null) {
        console.log(
          `- effective APR=${formatPercent(report.commonBaseApr * migratedBoost)}`,
        );
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

await main();
