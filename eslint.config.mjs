import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
export default [
    {
        ignores: [
            "eslint.config.mjs",
            "next.config.js",
            "postcss.config.js",
            "tailwind.config.*",
            "scripts/**",
            "public/**",
            "*.config.cjs",
        ],
    },
    ...coreWebVitals,
    ...nextTypescript,
    {
        ignores: [".next-dev/**"],
    },
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "prefer-const": "off",
            "react/no-unescaped-entities": "off",
            "react-hooks/exhaustive-deps": "off",
            "react-hooks/set-state-in-effect": "off",
            "react-hooks/purity": "off",
            "react-hooks/immutability": "off",
            "react-hooks/error-boundaries": "off",
            "react-hooks/preserve-manual-memoization": "off",
            "@next/next/no-img-element": "off",
            "@next/next/no-page-custom-font": "off",
            "jsx-a11y/alt-text": "off",
        },
    },
];
