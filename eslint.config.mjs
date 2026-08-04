import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Turn off rules that conflict with Prettier formatting.
  prettier,
  {
    rules: {
      // Always require braces around control-flow blocks.
      curly: ["error", "all"],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    "coverage/**",
    "drizzle/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
