#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEFAULT_MIN_RELEASE_AGE_DAYS = 7;
const overridePath = path.join(ROOT, ".github", "npm-release-age-overrides.json");

function readOverrides() {
  if (!fs.existsSync(overridePath)) return [];
  const parsed = JSON.parse(fs.readFileSync(overridePath, "utf8"));
  return Array.isArray(parsed.overrides) ? parsed.overrides : [];
}

function endOfUtcDate(dateString) {
  return new Date(`${dateString}T23:59:59.999Z`);
}

const now = new Date();
const activeOverrides = readOverrides().filter((entry) => {
  if (typeof entry?.expires !== "string") return false;
  return now <= endOfUtcDate(entry.expires);
});

if (activeOverrides.length > 0) {
  const labels = activeOverrides
    .map((entry) => `${entry.package}@${entry.version} until ${entry.expires}`)
    .join(", ");
  console.error(`Using npm release-age override for: ${labels}`);
  console.log("npm_config_min_release_age=0");
} else {
  console.log(`npm_config_min_release_age=${DEFAULT_MIN_RELEASE_AGE_DAYS}`);
}
