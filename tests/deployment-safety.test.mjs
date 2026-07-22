import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidVersionLabel,
  PRODUCTION_CONFIRMATION,
  TARGETS,
  validateDeploymentContext,
} from "../scripts/run-environment.mjs";
import {
  validateNetworkConfig,
  verifyNetworkState,
} from "../scripts/validate-network-config.mjs";

test("deployment targets are fixed to the intended Studio projects and networks", () => {
  assert.deepEqual(TARGETS.test, {
    branch: "develop",
    network: "arbitrum-sepolia",
    slug: "doudochain-arb-v-2",
    deployKeyKey: "THEGRAPH_TEST_DEPLOY_KEY",
    rpcKey: "ARBITRUM_SEPOLIA_RPC_URL",
    versionKey: "THEGRAPH_TEST_VERSION_LABEL",
  });
  assert.deepEqual(TARGETS.prod, {
    branch: "main",
    network: "arbitrum-one",
    slug: "doudochain-v-2",
    deployKeyKey: "THEGRAPH_PROD_DEPLOY_KEY",
    rpcKey: "ARBITRUM_ONE_RPC_URL",
    versionKey: "THEGRAPH_PROD_VERSION_LABEL",
  });
});

test("version labels accept semver or Git SHA only", () => {
  for (const value of ["v1.2.3", "1.2.3", "1.2.3-rc.1", "860c78e"]) {
    assert.equal(isValidVersionLabel(value), true, value);
  }
  for (const value of ["", "latest", "v1", "1.2", "not a version"]) {
    assert.equal(isValidVersionLabel(value), false, value);
  }
});

test("deployments require their assigned branch and a clean tree", () => {
  assert.throws(
    () =>
      validateDeploymentContext({
        targetName: "test",
        branch: "feature/example",
        worktreeStatus: "",
      }),
    /only from develop/,
  );
  assert.doesNotThrow(() =>
    validateDeploymentContext({
      targetName: "test",
      branch: "develop",
      worktreeStatus: "",
    }),
  );
  assert.throws(
    () =>
      validateDeploymentContext({
        targetName: "prod",
        branch: "develop",
        worktreeStatus: "",
        confirmation: PRODUCTION_CONFIRMATION,
      }),
    /only from main/,
  );
  assert.throws(
    () =>
      validateDeploymentContext({
        targetName: "prod",
        branch: "main",
        worktreeStatus: " M package.json",
        confirmation: PRODUCTION_CONFIRMATION,
      }),
    /clean Git worktree/,
  );
  assert.throws(
    () =>
      validateDeploymentContext({
        targetName: "prod",
        branch: "main",
        worktreeStatus: "",
        confirmation: "wrong-target",
      }),
    /THEGRAPH_PROD_CONFIRM/,
  );
  assert.doesNotThrow(() =>
    validateDeploymentContext({
      targetName: "prod",
      branch: "main",
      worktreeStatus: "",
      confirmation: PRODUCTION_CONFIRMATION,
    }),
  );
});

test("Sepolia is complete while pending Arbitrum One stays blocked", () => {
  const testConfig = validateNetworkConfig("arbitrum-sepolia");
  assert.equal(testConfig.dataSourceNames.length, 13);
  assert.throws(
    () => validateNetworkConfig("arbitrum-one"),
    /not deployable/,
  );
});

test("Sepolia RPC gate verifies chain ID and bytecode without receipts", async () => {
  const originalFetch = globalThis.fetch;
  const methods = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    methods.push(request.method);
    const result = request.method === "eth_chainId" ? "0x66eee" : "0x6000";
    return { ok: true, json: async () => ({ result }) };
  };

  try {
    await verifyNetworkState(
      "https://rpc.invalid",
      "arbitrum-sepolia",
      {
        dataSourceNames: ["ICHICHAIN"],
        config: { ICHICHAIN: { address: `0x${"1".repeat(40)}` } },
      },
    );
    assert.deepEqual(methods, ["eth_chainId", "eth_getCode"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Arbitrum One RPC gate additionally verifies deployment receipts", async () => {
  const originalFetch = globalThis.fetch;
  const methods = [];
  globalThis.fetch = async (_url, options) => {
    const request = JSON.parse(options.body);
    methods.push(request.method);
    const result =
      request.method === "eth_chainId"
        ? "0xa4b1"
        : request.method === "eth_getTransactionReceipt"
          ? { status: "0x1", blockNumber: "0x64" }
          : "0x6000";
    return { ok: true, json: async () => ({ result }) };
  };

  try {
    await verifyNetworkState(
      "https://rpc.invalid",
      "arbitrum-one",
      {
        dataSourceNames: ["ICHICHAIN"],
        config: {
          ICHICHAIN: { address: `0x${"1".repeat(40)}`, startBlock: 100 },
        },
        evidence: {
          ICHICHAIN: { transactionHash: `0x${"2".repeat(64)}` },
        },
      },
      { verifyReceipts: true },
    );
    assert.deepEqual(methods, [
      "eth_chainId",
      "eth_getTransactionReceipt",
      "eth_getCode",
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
