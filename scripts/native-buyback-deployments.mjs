import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { keccak256 } from "@ethersproject/keccak256";
import { Interface } from "@ethersproject/abi";
const factoryInterface = new Interface([
  "event ProxyDeployedV2(address indexed implementation,address indexed proxy,address indexed deployer,bytes32 inputSalt,bytes data,bytes extraData)",
]);
const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
export function nativeBuybackDeployments(
  network,
  rows = JSON.parse(
    readFileSync(
      resolve(root, "config/fixed-probability-buyback-deployments.json"),
      "utf8",
    ),
  ),
) {
  const chainId =
    network === "arbitrum-sepolia"
      ? 421614
      : network === "arbitrum-one"
        ? 42161
        : 0;
  if (!chainId || !Array.isArray(rows))
    throw new Error("Invalid native buyback deployment config");
  const result = [],
    seen = new Set();
  const abiSha256 = createHash("sha256")
    .update(
      readFileSync(resolve(root, "abis/FixedProbabilityLotteryBuyback.json")),
    )
    .digest("hex");
  for (const row of rows) {
    if (
      ![421614, 42161].includes(row.chainId) ||
      !/^0x[0-9a-fA-F]{40}$/.test(row.address ?? "") ||
      /^0x0{40}$/i.test(row.address) ||
      !Number.isSafeInteger(row.startBlock) ||
      row.startBlock <= 0 ||
      !/^0x[0-9a-fA-F]{64}$/.test(row.runtimeHash ?? "") ||
      !/^0x[0-9a-fA-F]{64}$/.test(row.transactionHash ?? "") ||
      row.protocolVersion !== 1 ||
      row.proxyKind !== "uups" ||
      !row.implementation ||
      !/^0x[0-9a-fA-F]{40}$/.test(row.implementation.address ?? "") ||
      /^0x0{40}$/i.test(row.implementation.address) ||
      row.implementation.address.toLowerCase() === row.address.toLowerCase() ||
      !/^0x[0-9a-fA-F]{64}$/.test(row.implementation.runtimeHash ?? "") ||
      !/^0x[0-9a-fA-F]{64}$/.test(row.implementation.transactionHash ?? "") ||
      !Number.isSafeInteger(row.implementation.startBlock) ||
      row.implementation.startBlock <= 0 ||
      row.abiSha256 !== abiSha256 ||
      !Array.isArray(row.libraries) ||
      !row.libraries.length
    )
      throw new Error("Incomplete native buyback deployment evidence");
    for (const lib of row.libraries)
      if (
        !/^0x[0-9a-fA-F]{40}$/.test(lib.address ?? "") ||
        /^0x0{40}$/i.test(lib.address) ||
        !/^0x[0-9a-fA-F]{64}$/.test(lib.runtimeHash ?? "")
      )
        throw new Error("Invalid linked library evidence");
    const key = `${row.chainId}:${row.address.toLowerCase()}`;
    if (seen.has(key)) throw new Error("Duplicate native buyback deployment");
    seen.add(key);
    if (row.chainId === chainId)
      result.push({
        ...row,
        name: `FixedProbabilityBuyback_${row.address.slice(2).toLowerCase()}`,
      });
  }
  return result;
}
export function nativeBuybackMarkets(rows) {
  const markets = new Map();
  for (const row of rows) {
    if (!row.marketplace) continue;
    const m = row.marketplace;
    if (
      !/^0x[0-9a-fA-F]{40}$/.test(m.address ?? "") ||
      /^0x0{40}$/i.test(m.address) ||
      !Number.isSafeInteger(m.startBlock) ||
      m.startBlock <= 0 ||
      !/^0x[0-9a-fA-F]{64}$/.test(m.runtimeHash ?? "") ||
      !/^0x[0-9a-fA-F]{64}$/.test(m.transactionHash ?? "")
    )
      throw new Error("Incomplete native buyback marketplace evidence");
    if (m.factory && (
      !/^0x[0-9a-fA-F]{40}$/.test(m.factory.address ?? "") || /^0x0{40}$/i.test(m.factory.address) ||
      !/^0x[0-9a-fA-F]{40}$/.test(m.factory.implementationAddress ?? "") || /^0x0{40}$/i.test(m.factory.implementationAddress)
    )) throw new Error("Incomplete marketplace factory evidence");
    const key = m.address.toLowerCase();
    if (
      markets.has(key) &&
      JSON.stringify(markets.get(key).evidence) !== JSON.stringify(m)
    )
      throw new Error("Conflicting marketplace evidence");
    markets.set(key, {
      ...m,
      evidence: m,
      name: `BuybackMarketplace_${key.slice(2)}`,
    });
  }
  if (markets.size > 1)
    throw new Error("One marketplace per network is supported");
  return [...markets.values()];
}
export function nativeBuybackFragment(network, rows) {
  const template = readFileSync(
    resolve(root, "config/fixed-probability-buyback-source.yaml"),
    "utf8",
  );
  const native = rows
    .map((row) =>
      template
        .replace("kind: ethereum/contract", "kind: ethereum")
        .replace("name: FixedProbabilityBuyback\n", `name: ${row.name}\n`)
        .replace("network: arbitrum-sepolia", `network: ${network}`)
        .replace(
          "    source:\n      abi: FixedProbabilityLotteryBuyback",
          `    context:
      chainId:
        type: BigInt
        data: "${row.chainId}"
      startBlock:
        type: BigInt
        data: "${row.startBlock}"
      protocolVersion:
        type: String
        data: "3"
    source:
      address: "${row.address}"
      startBlock: ${row.startBlock}
      abi: FixedProbabilityLotteryBuyback`,
        ),
    )
    .join("\n");
  const marketTemplate = readFileSync(
    resolve(root, "config/buyback-marketplace-source.yaml"),
    "utf8",
  );
  const markets = nativeBuybackMarkets(rows)
    .map((m) =>
      marketTemplate
        .replace("kind: ethereum/contract", "kind: ethereum")
        .replace("name: BuybackMarketplace\n", `name: ${m.name}\n`)
        .replace("network: arbitrum-sepolia", `network: ${network}`)
        .replace(
          "    source:\n      abi: MarketplaceV3",
          `    source:\n      address: "${m.address}"\n      startBlock: ${m.startBlock}\n      abi: MarketplaceV3`,
        ),
    )
    .join("\n");
  return [native, markets].filter(Boolean).join("\n");
}
export const IMPLEMENTATION_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
export async function verifyNativeBuybackRuntime(rpcCall, row) {
  const block = await rpcCall("eth_getBlockByNumber", ["latest", false]);
  if (!block?.number || !block.hash)
    throw new Error("Native buyback canonical snapshot unavailable");
  const implementationReceipt = await rpcCall("eth_getTransactionReceipt", [
    row.implementation.transactionHash,
  ]);
  if (
    !implementationReceipt ||
    implementationReceipt.status !== "0x1" ||
    implementationReceipt.contractAddress?.toLowerCase() !==
      row.implementation.address.toLowerCase() ||
    Number.parseInt(implementationReceipt.blockNumber, 16) !==
      row.implementation.startBlock
  )
    throw new Error("Native buyback implementation receipt mismatch");
  const slot = await rpcCall("eth_getStorageAt", [
    row.address,
    IMPLEMENTATION_SLOT,
    block.number,
  ]);
  if (
    typeof slot !== "string" ||
    !/^0x0{24}[0-9a-fA-F]{40}$/.test(slot) ||
    ("0x" + slot.slice(-40)).toLowerCase() !==
      row.implementation.address.toLowerCase()
  )
    throw new Error("Native buyback implementation slot mismatch");
  const uuid = await rpcCall("eth_call", [
    { to: row.implementation.address, data: "0x52d1902d" },
    block.number,
  ]);
  if (uuid?.toLowerCase() !== IMPLEMENTATION_SLOT)
    throw new Error("Native buyback UUPS UUID mismatch");
  const receipt = await rpcCall("eth_getTransactionReceipt", [
    row.transactionHash,
  ]);
  if (
    !receipt ||
    receipt.status !== "0x1" ||
    receipt.contractAddress?.toLowerCase() !== row.address.toLowerCase() ||
    Number.parseInt(receipt.blockNumber, 16) !== row.startBlock
  )
    throw new Error("Native buyback deployment receipt mismatch");
  if (row.marketplace) {
    const market = row.marketplace;
    const deployed = await rpcCall("eth_getTransactionReceipt", [
      market.transactionHash,
    ]);
    let createdByFactory = false;
    if (market.factory && deployed?.to?.toLowerCase() === market.factory.address.toLowerCase()) {
      createdByFactory = (deployed.logs ?? []).some(log => {
        if (log.address?.toLowerCase() !== market.factory.address.toLowerCase()) return false;
        try {
          const event = factoryInterface.parseLog(log);
          return event.name === "ProxyDeployedV2" &&
            event.args.proxy.toLowerCase() === market.address.toLowerCase() &&
            event.args.implementation.toLowerCase() === market.factory.implementationAddress.toLowerCase();
        } catch { return false; }
      });
    }
    if (
      !deployed ||
      deployed.status !== "0x1" ||
      (deployed.contractAddress?.toLowerCase() !== market.address.toLowerCase() && !createdByFactory) ||
      Number.parseInt(deployed.blockNumber, 16) !== market.startBlock
    )
      throw new Error("Buyback marketplace deployment receipt mismatch");
    if (createdByFactory) {
      const before = await rpcCall("eth_getCode", [market.address, "0x" + (market.startBlock - 1).toString(16)]);
      const atCreation = await rpcCall("eth_getCode", [market.address, deployed.blockNumber]);
      if (before !== "0x" || !atCreation || atCreation === "0x" || keccak256(atCreation).toLowerCase() !== market.runtimeHash.toLowerCase()) {
        throw new Error("Buyback marketplace creation runtime mismatch");
      }
    }
  }
  for (const ref of [
    { address: row.address, runtimeHash: row.runtimeHash },
    row.implementation,
    ...row.libraries,
    ...(row.marketplace ? [row.marketplace] : []),
  ]) {
    const code = await rpcCall("eth_getCode", [ref.address, block.number]);
    if (
      !code ||
      code === "0x" ||
      keccak256(code).toLowerCase() !== ref.runtimeHash.toLowerCase()
    )
      throw new Error("Native buyback runtime or library mismatch");
  }
  if (
    (await rpcCall("eth_getBlockByNumber", [block.number, false]))?.hash !==
    block.hash
  )
    throw new Error("Native buyback canonical snapshot changed");
}
