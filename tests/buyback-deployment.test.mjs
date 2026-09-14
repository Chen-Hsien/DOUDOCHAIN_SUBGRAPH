import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { validateBuybackDeployment, verifyBuybackDeployment, ROLE_GRANTED, MODULE_ROLE } from '../scripts/verify-buyback-deployment.mjs';
const record = JSON.parse(readFileSync(new URL('../config/buyback-deployment.json', import.meta.url)));
const word = address => `0x${address.slice(2).toLowerCase().padStart(64, '0')}`;
const core = { address: record.core, startBlock: 488650672 };
function rpc(overrides = {}) {
  return async (method, params) => {
    if (method === 'eth_getTransactionReceipt') {
      if (params[0] === record.deploymentTransaction) return { status: '0x1', blockNumber: `0x${record.deploymentBlock.toString(16)}`, contractAddress: record.address, ...overrides.deployment };
      return { status: '0x1', blockNumber: `0x${record.registrationBlock.toString(16)}`, logs: [{ address: record.core, topics: [ROLE_GRANTED, MODULE_ROLE, word(record.address)] }], ...overrides.registration };
    }
    assert.equal(params[1], `0x${record.registrationBlock.toString(16)}`);
    return params[0].data === '0xf2f4eb26' ? (overrides.core ?? word(record.core)) : (overrides.limit ?? '0x32');
  };
}
test('production evidence preserves replay coverage and verifies historical template discovery', async () => {
  validateBuybackDeployment(record, core);
  await verifyBuybackDeployment(rpc(), record);
});
test('rejects a Core start block after registration', () => {
  assert.throws(() => validateBuybackDeployment(record, { ...core, startBlock: record.registrationBlock + 1 }), /indexing range/);
});
test('rejects wrong deployment address, absent grant, wrong historical core or batch size', async () => {
  await assert.rejects(verifyBuybackDeployment(rpc({ deployment: { contractAddress: record.core } }), record), /deployment receipt/);
  await assert.rejects(verifyBuybackDeployment(rpc({ registration: { logs: [] } }), record), /registration event/);
  await assert.rejects(verifyBuybackDeployment(rpc({ core: word(record.address) }), record), /historical/);
  await assert.rejects(verifyBuybackDeployment(rpc({ limit: '0x31' }), record), /historical/);
});
