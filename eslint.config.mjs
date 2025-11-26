import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noLongInlineStringsRule from "./eslint-rules/no-long-inline-strings.js";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    ignores: ["components/icons/**/*", "components/ui/**/*", "app/debug/**/*"],
    plugins: {
      local: {
        rules: {
          "no-long-inline-strings": noLongInlineStringsRule,
        },
      },
    },
    rules: {
      "local/no-long-inline-strings": [
        "warn",
        {
          maxLength: 74,
        },
      ],
    },
  },
]);

export default eslintConfig;
