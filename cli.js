// cli.js
// Command-line entry point for modular equation solver

import { solveEquation } from "./utils/solver/orchestration.js";

// Example: node cli.js '{"equation":"x+2=4"}'
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node cli.js <equation-json>");
  process.exit(1);
}

const input = JSON.parse(args[0]);

solveEquation(input)
  .then((result) => {
    console.log("Solution:", result);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
