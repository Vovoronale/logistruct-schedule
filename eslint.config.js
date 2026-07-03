import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "coverage", ".wrangler", ".playwright-cli", "functions/types.d.ts"] },
  { files: ["**/*.js"], ...js.configs.recommended },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.{ts,tsx}"],
  })),
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ["src/**/*.{ts,tsx}", "functions/**/*.ts"],
    ignores: ["**/*.test.ts", "functions/types.d.ts"],
  })),
  {
    files: ["src/**/*.{ts,tsx}", "functions/**/*.ts"],
    ignores: ["**/*.test.ts", "functions/types.d.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-floating-promises": "error",
      "react-refresh/only-export-components": ["warn", { "allowConstantExport": true }]
    }
  }
);
