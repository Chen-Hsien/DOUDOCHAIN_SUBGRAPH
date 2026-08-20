import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { delimiter, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  validateNetworkConfig,
  verifyNetworkState,
} from "./validate-network-config.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export const TARGETS = Object.freeze({
  test: {
    branch: "develop",
    network: "arbitrum-sepolia",
    slug: "doudochain-arb-v-2",
    deployKeyKey: "THEGRAPH_TEST_DEPLOY_KEY",
    rpcKey: "ARBITRUM_SEPOLIA_RPC_URL",
    versionKey: "THEGRAPH_TEST_VERSION_LABEL",
  },
  prod: {
    branch: "main",
    network: "arbitrum-one",
    slug: "doudochain-v-2",
    deployKeyKey: "THEGRAPH_PROD_DEPLOY_KEY",
    rpcKey: "ARBITRUM_ONE_RPC_URL",
    versionKey: "THEGRAPH_PROD_VERSION_LABEL",
  },
});
const versionPattern = /^(?:v?(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?|[0-9a-fA-F]{7,40})$/;
export const PRODUCTION_CONFIRMATION = "doudochain-v-2@arbitrum-one";

export function isValidVersionLabel(value) {
  return versionPattern.test(value ?? "");
}

export function validateDeploymentContext({
  targetName,
  branch,
  worktreeStatus,
  confirmation,
}) {
  const target = TARGETS[targetName];
  if (!target) throw new Error("Unknown deployment target.");
  if (branch !== target.branch) {
    throw new Error(
      `${targetName} deployment is allowed only from ${target.branch}.`,
    );
  }
  if (worktreeStatus) {
    throw new Error(`${targetName} deployment requires a clean Git worktree.`);
  }
  if (targetName === "prod" && confirmation !== PRODUCTION_CONFIRMATION) {
    throw new Error(
      `Set THEGRAPH_PROD_CONFIRM=${PRODUCTION_CONFIRMATION} to confirm the production target.`,
    );
  }
}

function loadLocalEnv() {
  const envPath = resolve(root, ".env");
  if (!existsSync(envPath)) return;

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.error) throw new Error(`${command} could not be started.`);
  return result.status ?? 1;
}

function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) throw new Error("Git repository state is unavailable.");
  return result.stdout.trim();
}

function assertDeploymentContext(targetName) {
  const branch =
    process.env.GITHUB_ACTIONS === "true"
      ? process.env.GITHUB_REF_NAME
      : gitOutput(["branch", "--show-current"]);
  validateDeploymentContext({
    targetName,
    branch,
    worktreeStatus: gitOutput([
      "status",
      "--porcelain",
      "--untracked-files=all",
    ]),
    confirmation: process.env.THEGRAPH_PROD_CONFIRM,
  });
}

function prepareManifest(target) {
  const sourcePath = resolve(root, "subgraph.yaml");
  const generatedPath = resolve(
    root,
    `.subgraph.${target.network}.generated.yaml`,
  );
  copyFileSync(sourcePath, generatedPath);
  return { generatedPath, sourceBefore: readFileSync(sourcePath, "utf8") };
}

function assertSourceManifestUnchanged(sourceBefore) {
  const sourceAfter = readFileSync(resolve(root, "subgraph.yaml"), "utf8");
  if (sourceAfter !== sourceBefore) {
    throw new Error("subgraph.yaml was unexpectedly modified.");
  }
}

export async function main(argv = process.argv.slice(2)) {
  loadLocalEnv();

  const [action, targetName] = argv;
  const target = TARGETS[targetName];
  if (!target || !["build", "deploy"].includes(action)) {
    console.error(
      "Usage: npm run build:test | build:prod | deploy:test | deploy:prod",
    );
    process.exit(1);
  }

  if (action === "deploy") {
    try {
      assertDeploymentContext(targetName);
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  }

  let validation;
  try {
    validation = validateNetworkConfig(target.network);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const graphBin = resolve(root, "node_modules/.bin/graph");
  const path = [resolve(root, "node_modules/.bin"), process.env.PATH ?? ""]
    .filter(Boolean)
    .join(delimiter);
  const outputDir = resolve(root, `build/${targetName}`);

  const codegenStatus = run(graphBin, ["codegen"], {
    env: { ...process.env, PATH: path },
  });
  if (codegenStatus !== 0) process.exit(codegenStatus);

  if (action === "build") {
    const { generatedPath, sourceBefore } = prepareManifest(target);
    const status = run(
      graphBin,
      [
        "build",
        generatedPath,
        "--network",
        target.network,
        "--network-file",
        resolve(root, "networks.json"),
        "--output-dir",
        outputDir,
      ],
      { env: { ...process.env, PATH: path } },
    );
    assertSourceManifestUnchanged(sourceBefore);
    process.exit(status);
  }

  const deployKey = process.env[target.deployKeyKey]?.trim();
  const versionLabel = process.env[target.versionKey]?.trim();
  if (!deployKey) {
    console.error(`${target.deployKeyKey} is missing.`);
    process.exit(1);
  }
  if (!isValidVersionLabel(versionLabel)) {
    console.error(`${target.versionKey} must be semver or a 7-40 character Git SHA.`);
    process.exit(1);
  }

  const rpcUrl = process.env[target.rpcKey]?.trim();
  if (!rpcUrl) {
    console.error(`${target.rpcKey} is missing.`);
    process.exit(1);
  }
  try {
    await verifyNetworkState(rpcUrl, target.network, validation, {
      verifyReceipts: targetName === "prod",
    });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const { generatedPath, sourceBefore } = prepareManifest(target);
  const status = run(
    graphBin,
    [
      "deploy",
      target.slug,
      generatedPath,
      "--network",
      target.network,
      "--network-file",
      resolve(root, "networks.json"),
      "--output-dir",
      outputDir,
      "--deploy-key",
      deployKey,
      "--version-label",
      versionLabel,
    ],
    { env: { ...process.env, PATH: path } },
  );
  assertSourceManifestUnchanged(sourceBefore);
  process.exit(status);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) await main();
