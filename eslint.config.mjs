import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ["node_modules", "dist", "cache", "site", ".tools"],
  },
  {
    rules: {
      "@typescript-eslint/no-namespace": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
