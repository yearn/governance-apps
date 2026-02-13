import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT_PATH = path.resolve(
  process.cwd(),
  "scripts/validate-dependency-policy.mjs"
);

const createdDirs: string[] = [];

function createTempRepo(options?: {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  overrides?: Record<string, unknown>;
}) {
  const {
    packageManager = "npm@11.3.0",
    dependencies = { foo: "1.0.0" },
    devDependencies = { bar: "2.0.0" },
    optionalDependencies = {},
    peerDependencies = {},
    overrides = {},
  } = options ?? {};
  const dir = mkdtempSync(path.join(tmpdir(), "dep-policy-"));
  createdDirs.push(dir);

  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(
      {
        name: "tmp",
        version: "0.0.0",
        private: true,
        packageManager,
        dependencies,
        devDependencies,
        optionalDependencies,
        peerDependencies,
        overrides,
      },
      null,
      2
    )
  );

  writeFileSync(
    path.join(dir, "package-lock.json"),
    JSON.stringify(
      {
        name: "tmp",
        lockfileVersion: 3,
        packages: {},
      },
      null,
      2
    )
  );

  return dir;
}

function runValidator(cwd: string) {
  return spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd,
    encoding: "utf8",
  });
}

afterEach(() => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("validate-dependency-policy", () => {
  it("passes when packageManager pins an exact npm version", () => {
    const cwd = createTempRepo({ packageManager: "npm@11.3.0" });
    const result = runValidator(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Dependency policy validation passed.");
  });

  it("fails when packageManager does not pin an exact npm version", () => {
    const cwd = createTempRepo({ packageManager: "npm@latest" });
    const result = runValidator(cwd);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "packageManager must be set to an exact npm version"
    );
  });

  it("fails when dependencies use non-semver tags", () => {
    const cwd = createTempRepo({
      dependencies: {
        foo: "latest",
      },
    });
    const result = runValidator(cwd);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "dependencies:foo@latest (must be exact semver)"
    );
  });

  it("fails when dependencies use git or protocol specifiers", () => {
    const cwd = createTempRepo({
      dependencies: {
        foo: "github:acme/foo#main",
      },
    });
    const result = runValidator(cwd);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "dependencies:foo@github:acme/foo#main (must be exact semver)"
    );
  });

  it("fails when optionalDependencies are not exact semver", () => {
    const cwd = createTempRepo({
      optionalDependencies: {
        baz: "^3.0.0",
      },
    });
    const result = runValidator(cwd);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "optionalDependencies:baz@^3.0.0 (must be exact semver)"
    );
  });

  it("fails when peerDependencies are not exact semver", () => {
    const cwd = createTempRepo({
      peerDependencies: {
        qux: ">=1.2.3",
      },
    });
    const result = runValidator(cwd);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "peerDependencies:qux@>=1.2.3 (must be exact semver)"
    );
  });

  it("fails when overrides use non-pinned specifiers", () => {
    const cwd = createTempRepo({
      overrides: {
        foo: "^1.0.0",
      },
    });
    const result = runValidator(cwd);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "overrides:foo@^1.0.0 (must be exact semver or $reference)"
    );
  });

  it("passes when overrides use dependency references", () => {
    const cwd = createTempRepo({
      dependencies: {
        foo: "1.0.0",
      },
      overrides: {
        foo: "$foo",
      },
    });
    const result = runValidator(cwd);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Dependency policy validation passed.");
  });
});
