import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const installerPath = resolve(
  root,
  "node_modules/binary-install-raw/index.js",
);
const invalidMode = "fs.chmodSync(this.binaryPath, 755);";
const validMode = "fs.chmodSync(this.binaryPath, 0o755);";
const source = readFileSync(installerPath, "utf8");

if (source.includes(validMode)) process.exit(0);
if (!source.includes(invalidMode)) {
  throw new Error(
    "binary-install-raw changed unexpectedly; review the Matchstick permission workaround.",
  );
}

writeFileSync(installerPath, source.replace(invalidMode, validMode));
console.log("Applied Matchstick executable permission workaround.");
