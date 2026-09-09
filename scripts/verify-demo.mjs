import { spawnSync } from "node:child_process";

const result = spawnSync(
  process.execPath,
  [
    "./node_modules/vitest/vitest.mjs",
    "run",
    "tests/workflow.test.ts",
    "--config",
    "vitest.config.ts",
    "--reporter=verbose",
  ],
  {
    cwd: process.cwd(),
    stdio: "inherit",
  },
);

if (result.status !== 0) process.exit(result.status ?? 1);
console.log(
  "Guided replay verified: reset → discovery review → drafting → atomic split → quality dispositions → QA approval → provenance snapshot.",
);
