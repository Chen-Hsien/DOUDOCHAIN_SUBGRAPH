import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const addressPattern = /^0x[0-9a-fA-F]{40}$/;
const transactionPattern = /^0x[0-9a-fA-F]{64}$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function getDataSourceNames() {
  const manifest = readFileSync(resolve(root, "subgraph.yaml"), "utf8");
  const dataSourcesBlock = manifest.split(/^templates:/m)[0];
  return [
    ...dataSourcesBlock.matchAll(/^    name:\s*([^\s#]+)\s*$/gm),
  ].map((match) => match[1]);
}

export function validateNetworkConfig(network) {
  const dataSourceNames = getDataSourceNames();
  const duplicates = dataSourceNames.filter(
    (name, index) => dataSourceNames.indexOf(name) !== index,
  );
  const networks = readJson(resolve(root, "networks.json"));
  const config = networks[network];
  const invalid = [];

  if (duplicates.length > 0) {
    invalid.push(`manifest has duplicate data sources: ${[...new Set(duplicates)].join(", ")}`);
  }
  if (!config) {
    invalid.push(`missing networks.json configuration for ${network}`);
  }

  if (config) {
    for (const name of dataSourceNames) {
      const source = config[name];
      if (!source) {
        invalid.push(`${name}: missing configuration`);
        continue;
      }
      if (
        !addressPattern.test(source.address ?? "") ||
        /^0x0{40}$/i.test(source.address)
      ) {
        invalid.push(`${name}: address is missing, zero, or invalid`);
      }
      if (!Number.isSafeInteger(source.startBlock) || source.startBlock <= 0) {
        invalid.push(`${name}: startBlock must be a positive integer`);
      }
    }

    for (const name of Object.keys(config)) {
      if (!dataSourceNames.includes(name)) {
        invalid.push(`${name}: stale configuration is not present in subgraph.yaml`);
      }
    }
  }

  let evidence = null;
  if (network === "arbitrum-one") {
    const allEvidence = readJson(
      resolve(root, "config/deployment-evidence.json"),
    );
    evidence = allEvidence[network];
    if (!evidence) {
      invalid.push(`missing deployment evidence for ${network}`);
    } else if (config) {
      for (const name of dataSourceNames) {
        const record = evidence[name];
        const source = config[name];
        if (!record) {
          invalid.push(`${name}: missing production deployment evidence`);
          continue;
        }
        if (record.address !== source?.address) {
          invalid.push(`${name}: evidence address does not match networks.json`);
        }
        if (record.startBlock !== source?.startBlock) {
          invalid.push(`${name}: evidence startBlock does not match networks.json`);
        }
        if (!transactionPattern.test(record.transactionHash ?? "")) {
          invalid.push(`${name}: deployment transaction hash is missing or invalid`);
        }
      }
    }
  }

  if (invalid.length > 0) {
    const error = new Error(
      `Network configuration for ${network} is not deployable:\n${invalid
        .map((issue) => `- ${issue}`)
        .join("\n")}`,
    );
    error.issues = invalid;
    throw error;
  }

  return { config, dataSourceNames, evidence };
}

const expectedChainIds = {
  "arbitrum-sepolia": 421614,
  "arbitrum-one": 42161,
};

export async function verifyNetworkState(
  rpcUrl,
  network,
  validation,
  { verifyReceipts = false } = {},
) {
  const expectedChainId = expectedChainIds[network];
  if (!expectedChainId) throw new Error(`Unsupported RPC network: ${network}.`);

  const rpcCall = async (method, params) => {
    let response;
    try {
      response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error(`${network} RPC is unreachable.`);
    }
    if (!response.ok) {
      throw new Error(`${network} RPC returned HTTP ${response.status}.`);
    }
    const payload = await response.json();
    if (payload.error) {
      throw new Error(`Arbitrum One RPC rejected ${method}.`);
    }
    return payload.result;
  };

  const chainId = await rpcCall("eth_chainId", []);
  if (Number.parseInt(chainId, 16) !== expectedChainId) {
    throw new Error(
      `${network} RPC does not resolve to chain ID ${expectedChainId}.`,
    );
  }

  const receiptCache = new Map();
  for (const name of validation.dataSourceNames) {
    const source = validation.config[name];
    if (verifyReceipts) {
      const record = validation.evidence[name];
      let receipt = receiptCache.get(record.transactionHash);
      if (!receipt) {
        receipt = await rpcCall("eth_getTransactionReceipt", [
          record.transactionHash,
        ]);
        receiptCache.set(record.transactionHash, receipt);
      }
      if (!receipt || receipt.status !== "0x1") {
        throw new Error(`${name}: deployment transaction is missing or failed.`);
      }
      if (Number.parseInt(receipt.blockNumber, 16) !== source.startBlock) {
        throw new Error(`${name}: receipt block does not match startBlock.`);
      }
    }
    const code = await rpcCall("eth_getCode", [source.address, "latest"]);
    if (!code || code === "0x") {
      throw new Error(`${name}: no contract code exists at the configured address.`);
    }
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  const network = process.argv[2];
  if (!network) {
    console.error("Usage: node scripts/validate-network-config.mjs <network>");
    process.exit(1);
  }
  try {
    const validation = validateNetworkConfig(network);
    console.log(
      `Network configuration for ${network} covers ${validation.dataSourceNames.length} data sources.`,
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
