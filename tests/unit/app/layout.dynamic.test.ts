import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("root layout rendering mode", () => {
  it("does not globally force dynamic rendering", () => {
    const layoutPath = path.join(process.cwd(), "app", "layout.tsx");
    const source = readFileSync(layoutPath, "utf8");

    expect(source).not.toContain('export const dynamic = "force-dynamic";');
  });

  it("does not depend on request headers in app head", () => {
    const headPath = path.join(process.cwd(), "app", "head.tsx");
    const source = readFileSync(headPath, "utf8");

    expect(source).not.toContain('from "next/headers"');
    expect(source).toContain("<ThemeScript />");
  });
});
