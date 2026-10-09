import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

describe("ESLint 10 compatibility", () => {
  it("preserves React, hooks, accessibility, and TypeScript diagnostics", async () => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText(`
      import { useState } from "react";
      export default function Example({ enabled }: { enabled: boolean }) {
        if (enabled) useState(0);
        const unused = 1;
        return <><Unknown /><img src="/example.png" /></>;
      }
    `, { filePath: "app/lint-compatibility-fixture.tsx" });

    expect(result.fatalErrorCount).toBe(0);
    expect(result.messages.map((message) => message.ruleId)).toEqual(
      expect.arrayContaining([
        "react/jsx-no-undef",
        "react-hooks/rules-of-hooks",
        "jsx-a11y/alt-text",
        "@typescript-eslint/no-unused-vars",
      ])
    );
  });
});
