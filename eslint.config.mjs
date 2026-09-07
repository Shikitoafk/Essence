import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/*
 * ESLint, restored.
 *
 * `npm run lint` was `next lint`, and Next 16 removed that command, so every
 * run since the upgrade failed with "Invalid project directory provided, no
 * such directory: ./lint". It read as a broken path — a small bug — and was
 * something larger: the project had no linter at all, and had not had one for
 * a while.
 *
 * eslint-config-next 16 ships flat config arrays and is imported directly.
 * The documented FlatCompat wrapper is for older releases and, against this
 * version, dies with "Converting circular structure to JSON" while trying to
 * report a schema error that isn't there.
 */
const config = [
  {
    // Build output, dependencies, and the frozen prompt snapshots — text files
    // that happen to live under scripts/.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "scripts/prompt-baselines/**",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    // The measurement harnesses are operator tools run from a terminal.
    // Printing is what they are for.
    files: ["scripts/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];

export default config;
