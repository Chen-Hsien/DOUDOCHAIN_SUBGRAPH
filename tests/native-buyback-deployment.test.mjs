import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { keccak256 } from "@ethersproject/keccak256";
import { Interface } from "@ethersproject/abi";
import {
  nativeBuybackDeployments,
  nativeBuybackFragment,
  verifyNativeBuybackRuntime,
  IMPLEMENTATION_SLOT,
} from "../scripts/native-buyback-deployments.mjs";
const code = "0x6001",
  implementationCode = "0x6002",
  libraryCode = "0x6003";
const row = {
  chainId: 421614,
  address: "0x2222222222222222222222222222222222222222",
  startBlock: 123,
  transactionHash: "0x" + "11".repeat(32),
  runtimeHash: keccak256(code),
  protocolVersion: 1,
  proxyKind: "uups",
  implementation: {
    address: "0x7777777777777777777777777777777777777777",
    startBlock: 120,
    transactionHash: "0x" + "77".repeat(32),
    runtimeHash: keccak256(implementationCode),
  },
  abiSha256: createHash("sha256")
    .update(
      readFileSync(
        new URL("../abis/FixedProbabilityLotteryBuyback.json", import.meta.url),
      ),
    )
    .digest("hex"),
  libraries: [
    {
      address: "0x3333333333333333333333333333333333333333",
      runtimeHash: keccak256(libraryCode),
    },
  ],
};
function runtimeRpc(config = row) {
  return async (method, params) => {
    if (method === "eth_getBlockByNumber")
      return { number: "0xc8", hash: "0x" + "55".repeat(32) };
    if (method === "eth_getStorageAt")
      return "0x" + "0".repeat(24) + config.implementation.address.slice(2);
    if (method === "eth_call") return IMPLEMENTATION_SLOT;
    if (method === "eth_getTransactionReceipt") {
      const ref = [
        config,
        config.implementation,
        ...(config.marketplace ? [config.marketplace] : []),
      ].find((r) => r.transactionHash === params[0]);
      return ref
        ? {
            status: "0x1",
            contractAddress: ref.address,
            blockNumber: "0x" + ref.startBlock.toString(16),
          }
        : null;
    }
    if (method === "eth_getCode")
      return params[0] === config.address
        ? code
        : params[0] === config.implementation.address
          ? implementationCode
          : libraryCode;
    throw new Error("Unexpected synthetic RPC");
  };
}
test("native source requires UUPS proxy, implementation, ABI and linked-library evidence", () => {
  assert.deepEqual(nativeBuybackDeployments("arbitrum-sepolia", []), []);
  const live = nativeBuybackDeployments("arbitrum-sepolia");
  assert.equal(live.length, 1);
  assert.equal(live[0].address.toLowerCase(), '0x51a9f7f467498fee72efbe37043897a3c225f235');
  assert.equal(live[0].startBlock, 319353178);
  const configured = nativeBuybackDeployments("arbitrum-sepolia", [row]);
  assert.match(
    nativeBuybackFragment("arbitrum-sepolia", configured),
    /handler: handleUpgraded/,
  );
  assert.match(
    nativeBuybackFragment("arbitrum-sepolia", configured),
    /handler: handleNativePrizeBuybackBurned/,
  );
  assert.match(
    nativeBuybackFragment("arbitrum-sepolia", configured),
    /startBlock: 123/,
  );
  assert.equal(nativeBuybackDeployments("arbitrum-one", [row]).length, 0);
  for (const patch of [
    { abiSha256: "bad" },
    { startBlock: 0 },
    { protocolVersion: 2 },
    { libraries: [] },
    { proxyKind: "transparent" },
    { implementation: undefined },
    { implementation: { ...row.implementation, address: row.address } },
  ])
    assert.throws(() =>
      nativeBuybackDeployments("arbitrum-sepolia", [{ ...row, ...patch }]),
    );
  assert.throws(() => nativeBuybackDeployments("arbitrum-sepolia", [row, row]));
});

test('factory-created marketplace requires its exact creation event and first-block runtime', async () => {
  const iface = new Interface(['event ProxyDeployedV2(address indexed implementation,address indexed proxy,address indexed deployer,bytes32 inputSalt,bytes data,bytes extraData)']);
  const marketplace = {
    address: '0x4444444444444444444444444444444444444444', startBlock: 100,
    transactionHash: '0x' + '44'.repeat(32), runtimeHash: keccak256(libraryCode),
    factory: { address: '0x5555555555555555555555555555555555555555', implementationAddress: '0x6666666666666666666666666666666666666666' },
  };
  const config = { ...row, marketplace }, rpc = runtimeRpc(config);
  const event = iface.encodeEventLog(iface.getEvent('ProxyDeployedV2'), [marketplace.factory.implementationAddress, marketplace.address, row.address, '0x' + '00'.repeat(32), '0x', '0x']);
  const receipt = { status: '0x1', contractAddress: null, blockNumber: '0x64', to: marketplace.factory.address, logs: [{ address: marketplace.factory.address, ...event }] };
  for (const failure of [null, 'wrong-factory', 'wrong-proxy', 'wrong-implementation', 'missing-event', 'wrong-emitter', 'existing-code', 'wrong-creation-code', 'wrong-block']) {
    const candidate = structuredClone(receipt);
    if (failure === 'wrong-factory') candidate.to = row.address;
    if (failure === 'wrong-proxy') candidate.logs[0].topics[2] = '0x' + '00'.repeat(12) + row.address.slice(2);
    if (failure === 'wrong-implementation') candidate.logs[0].topics[1] = '0x' + '00'.repeat(12) + row.address.slice(2);
    if (failure === 'missing-event') candidate.logs = [];
    if (failure === 'wrong-emitter') candidate.logs[0].address = row.address;
    if (failure === 'wrong-block') candidate.blockNumber = '0x65';
    const probe = verifyNativeBuybackRuntime(async (method, params) => {
      if (method === 'eth_getTransactionReceipt' && params[0] === marketplace.transactionHash) return candidate;
      if (method === 'eth_getCode' && params[0] === marketplace.address) {
        if (params[1] === '0x63') return failure === 'existing-code' ? libraryCode : '0x';
        if (params[1] === '0x64' && failure === 'wrong-creation-code') return '0x6009';
      }
      return rpc(method, params);
    }, config);
    if (failure) await assert.rejects(probe, /mismatch/, failure);
    else await probe;
  }
});
test("proxy, implementation, UUID and every linked library are checked at one pinned block", async () => {
  const calls = [],
    rpc = runtimeRpc();
  await verifyNativeBuybackRuntime(async (method, params) => {
    calls.push([method, params]);
    return rpc(method, params);
  }, row);
  assert.equal(calls.filter((c) => c[0] === "eth_getCode").length, 3);
  assert.ok(
    calls
      .filter((c) => c[0] === "eth_getCode")
      .every((c) => c[1][1] === "0xc8"),
  );
  assert.ok(
    calls.some(
      (c) =>
        c[0] === "eth_getStorageAt" &&
        c[1][0] === row.address &&
        c[1][2] === "0xc8",
    ),
  );
});
for (const mismatch of [
  "proxy-code",
  "slot",
  "implementation-code",
  "uuid",
  "implementation-receipt",
  "library",
  "reorg",
])
  test(`rejects ${mismatch} even when proxy address stays unchanged`, async () => {
    const rpc = runtimeRpc();
    let blocks = 0;
    await assert.rejects(
      verifyNativeBuybackRuntime(async (method, params) => {
        if (
          mismatch === "proxy-code" &&
          method === "eth_getCode" &&
          params[0] === row.address
        )
          return "0x6004";
        if (mismatch === "slot" && method === "eth_getStorageAt")
          return "0x" + "0".repeat(24) + "8".repeat(40);
        if (
          mismatch === "implementation-code" &&
          method === "eth_getCode" &&
          params[0] === row.implementation.address
        )
          return "0x6004";
        if (mismatch === "uuid" && method === "eth_call")
          return "0x" + "00".repeat(32);
        if (
          mismatch === "implementation-receipt" &&
          method === "eth_getTransactionReceipt" &&
          params[0] === row.implementation.transactionHash
        )
          return null;
        if (
          mismatch === "library" &&
          method === "eth_getCode" &&
          params[0] === row.libraries[0].address
        )
          return "0x6004";
        if (
          mismatch === "reorg" &&
          method === "eth_getBlockByNumber" &&
          blocks++ > 0
        )
          return { number: "0xc8", hash: "0x" + "66".repeat(32) };
        return rpc(method, params);
      }, row),
      /mismatch|changed/,
    );
  });
test("marketplace coverage is explicit and verified before activation", async () => {
  const marketplace = {
    address: "0x4444444444444444444444444444444444444444",
    startBlock: 100,
    transactionHash: "0x" + "44".repeat(32),
    runtimeHash: keccak256(libraryCode),
  };
  const config = { ...row, marketplace };
  const fragment = nativeBuybackFragment(
    "arbitrum-sepolia",
    nativeBuybackDeployments("arbitrum-sepolia", [config]),
  );
  assert.match(fragment, /name: BuybackMarketplace_4444/);
  assert.match(fragment, /handler: handleNewListing/);
  assert.throws(() =>
    nativeBuybackFragment("arbitrum-sepolia", [
      { ...config, marketplace: { ...marketplace, startBlock: 0 } },
    ]),
  );
  await verifyNativeBuybackRuntime(runtimeRpc(config), config);
});
