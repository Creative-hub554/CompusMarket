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
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/**",
      "*.tsbuildinfo",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // One intentional <img> remains (canvas/ref-based image processor).
      "@next/next/no-img-element": "warn",
    },
  },
  {
    // Storage access must be wrapped in try/catch: it throws when storage is
    // blocked (Safari private mode) or when Node >=23's experimental
    // webstorage global shadows jsdom's storage in test environments. The
    // existing allow-listed call sites carry an eslint-disable-next-line
    // pointing at their guarding try/catch; new unguarded access fails lint.
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
    // Tests and test setup may seed storage directly; app code may not.
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "vitest.setup.ts",
    ],
    rules: {
      "no-restricted-properties": "off",
    },
  },
];

export default eslintConfig;
