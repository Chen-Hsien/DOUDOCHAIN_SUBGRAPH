export const ROLE_GRANTED = "0x2f8788117e7eff1d82e926ec794901d17c78024a50270940304540a733656f0d";
export const MODULE_ROLE = "0x5098275140f5753db46c42f6e139939968848633a1298402189fdfdafa69b453";

export function validateBuybackDeployment(record, core) {
  if (record.network !== "arbitrum-one" ||
      !/^0x[\da-f]{40}$/i.test(record.address) || /^0x0{40}$/i.test(record.address) ||
      record.core.toLowerCase() !== core.address.toLowerCase() ||
      !Number.isSafeInteger(record.deploymentBlock) || record.deploymentBlock <= 0 ||
      !Number.isSafeInteger(record.registrationBlock) || record.registrationBlock < record.deploymentBlock ||
      core.startBlock > record.registrationBlock ||
      !/^0x[\da-f]{64}$/i.test(record.deploymentTransaction) ||
      !/^0x[\da-f]{64}$/i.test(record.registrationTransaction)) {
    throw new Error("Buyback deployment evidence or Core indexing range is invalid.");
  }
}

export async function verifyBuybackDeployment(rpcCall, record) {
  const deployment = await rpcCall("eth_getTransactionReceipt", [record.deploymentTransaction]);
  if (deployment?.status !== "0x1" ||
      Number.parseInt(deployment.blockNumber, 16) !== record.deploymentBlock ||
      deployment.contractAddress?.toLowerCase() !== record.address.toLowerCase()) {
    throw new Error("Buyback proxy deployment receipt does not match evidence.");
  }
  const receipt = await rpcCall("eth_getTransactionReceipt", [record.registrationTransaction]);
  const accountTopic = `0x${record.address.slice(2).toLowerCase().padStart(64, "0")}`;
  if (receipt?.status !== "0x1" ||
      Number.parseInt(receipt.blockNumber, 16) !== record.registrationBlock ||
      !receipt.logs?.some((log) => log.address.toLowerCase() === record.core.toLowerCase() &&
        log.topics[0] === ROLE_GRANTED && log.topics[1] === MODULE_ROLE &&
        log.topics[2]?.toLowerCase() === accountTopic)) {
    throw new Error("Buyback Core MODULE_ROLE registration event is missing or mismatched.");
  }
  // Match the historical calls made by handleBuybackModuleRoleGranted.
  const block = receipt.blockNumber;
  const core = await rpcCall("eth_call", [{ to: record.address, data: "0xf2f4eb26" }, block]);
  const limit = await rpcCall("eth_call", [{ to: record.address, data: "0xcfdbf254" }, block]);
  if (core?.toLowerCase() !== `0x${record.core.slice(2).toLowerCase().padStart(64, "0")}` || BigInt(limit) !== 50n) {
    throw new Error("Buyback historical core()/MAX_BATCH_SIZE() cannot register the template.");
  }
}
