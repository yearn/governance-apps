import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("root layout rendering mode", () => {
  it("does not globally force dynamic rendering", () => {
    const layoutPath = path.join(process.cwd(), "app", "layout.tsx");
    const source = readFileSync(layoutPath, "utf8");

    expect(source).not.toContain('export const dynamic = "force-dynamic";');
    expect(source).not.toContain('from "next/headers"');
  });

  it("renders credentialed global head assets from the root layout", () => {
    const layoutPath = path.join(process.cwd(), "app", "layout.tsx");
    const source = readFileSync(layoutPath, "utf8");

    expect(source).toContain("<ThemeScript />");
    expect(source).toContain('rel="manifest"');
    expect(source).toContain('href="/manifest.webmanifest"');
    expect(source).toContain('crossOrigin="use-credentials"');
  });
});
