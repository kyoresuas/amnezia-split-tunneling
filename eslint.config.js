import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "lists/**"] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
);
