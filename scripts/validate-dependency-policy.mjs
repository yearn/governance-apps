#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const packageJsonPath = path.join(ROOT, "package.json");
const packageLockPath = path.join(ROOT, "package-lock.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function isExactSemverSpecifier(version) {
  if (typeof version !== "string") return false;
  const normalized = version.trim();
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    normalized
  );
}

function isExactNpmPackageManager(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return /^npm@\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
    normalized
  );
}

function isAllowedOverrideSpecifier(value) {
  if (typeof value !== "string") return false;
  const normalized = value.trim();
  return normalized.startsWith("$");
}

function assertPinnedSection(sectionName, deps = {}) {
  const offenders = Object.entries(deps).filter(([, version]) =>
    !isExactSemverSpecifier(version)
  );
  if (offenders.length === 0) return [];
  return offenders.map(
    ([name, version]) =>
      `${sectionName}:${name}@${version} (must be exact semver)`
  );
}

function assertPinnedOverrides(overrides, pathPrefix = "overrides") {
  if (overrides === null || overrides === undefined) return [];
  if (typeof overrides !== "object") {
    return [`${pathPrefix} must be an object`];
  }

  const violations = [];

  for (const [name, value] of Object.entries(overrides)) {
    const entryPath = `${pathPrefix}:${name}`;

    if (typeof value === "string") {
      if (
        !isExactSemverSpecifier(value) &&
        !isAllowedOverrideSpecifier(value)
      ) {
        violations.push(
          `${entryPath}@${value} (must be exact semver or $reference)`
        );
      }
      continue;
    }

    if (value !== null && typeof value === "object") {
      violations.push(...assertPinnedOverrides(value, entryPath));
      continue;
    }

    violations.push(`${entryPath} has unsupported value type`);
  }

  return violations;
}

const pkg = readJson(packageJsonPath);
const lockExists = fs.existsSync(packageLockPath);
const lock = lockExists ? readJson(packageLockPath) : null;

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const pinViolations = dependencySections.flatMap((sectionName) =>
  assertPinnedSection(sectionName, pkg[sectionName])
);
pinViolations.push(...assertPinnedOverrides(pkg.overrides));

if (!isExactNpmPackageManager(pkg.packageManager)) {
  pinViolations.push(
    "packageManager must be set to an exact npm version (for example: npm@11.3.0)"
  );
}

if (!lockExists) {
  pinViolations.push("package-lock.json is required");
}

if (lock && (typeof lock.lockfileVersion !== "number" || lock.lockfileVersion < 3)) {
  pinViolations.push("package-lock.json must use lockfileVersion >= 3");
}

if (pinViolations.length > 0) {
  console.error("Dependency policy validation failed:");
  for (const violation of pinViolations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Dependency policy validation passed.");
