import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const eslintConfig = [
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "*.tsbuildinfo", "create-user.js"],
  },
  ...compat.extends("eslint:recommended", "plugin:@typescript-eslint/recommended"),
  {
    files: ["**/*.ts"],
    rules: {
      "no-undef": "off",
    },
  },
  {
    // Storage access must go through src/common/safeStorage.ts: Node's
    // experimental webstorage is absent on some runtimes (CI runs a Node
    // 22/26 matrix) and can throw when disabled or over quota. New raw
    // access fails lint; src/common/safeStorage.ts is the single exempted
    // gateway.
    rules: {
      // NOTE: property "*" is NOT a wildcard in no-restricted-properties, so
      // the Storage methods are enumerated explicitly. window./globalThis.
      // prefixes are caught at the inner access, which covers every use.
      "no-restricted-properties": [
        "error",
        { object: "localStorage", property: "getItem" },
        { object: "localStorage", property: "setItem" },
        { object: "localStorage", property: "removeItem" },
        { object: "localStorage", property: "clear" },
        { object: "localStorage", property: "key" },
        { object: "localStorage", property: "length" },
        { object: "sessionStorage", property: "getItem" },
        { object: "sessionStorage", property: "setItem" },
        { object: "sessionStorage", property: "removeItem" },
        { object: "sessionStorage", property: "clear" },
        { object: "sessionStorage", property: "key" },
        { object: "sessionStorage", property: "length" },
        { object: "window", property: "localStorage" },
        { object: "window", property: "sessionStorage" },
        { object: "globalThis", property: "localStorage" },
        { object: "globalThis", property: "sessionStorage" },
      ],
    },
  },
  {
    // src/common/safeStorage.ts is the single sanctioned gateway to raw Web Storage.
    files: ["src/common/safeStorage.ts"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
  {
    // Tests and test setup may seed storage directly; app code may not.
    files: ["**/*.spec.ts", "test/**"],
    rules: {
      "no-restricted-properties": "off",
    },
  },
];

export default eslintConfig;
