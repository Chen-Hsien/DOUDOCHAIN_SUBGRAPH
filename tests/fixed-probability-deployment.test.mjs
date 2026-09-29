import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { targetManifest } from '../scripts/target-manifest.mjs';
import { validateFixedProbabilityDeployment } from '../scripts/verify-fixed-probability-deployment.mjs';
import { validateNetworkConfig, verifyNetworkState } from '../scripts/validate-network-config.mjs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const source = 'FixedProbabilityLottery';

test('test includes all 15 events; production and original sources are unchanged', () => {
  const base = read('../subgraph.yaml');
  assert.equal(targetManifest('arbitrum-one'), base);
  const spec = validateNetworkConfig('arbitrum-sepolia');
  assert.equal(spec.dataSourceNames.filter(x => x === source).length, 1);
  const prod = validateNetworkConfig('arbitrum-one');
  assert.deepEqual(spec.dataSourceNames.filter(x => x !== source), prod.dataSourceNames);
  assert.equal(prod.config[source], undefined);
  assert.throws(() => targetManifest('arbitrum-sepolia', targetManifest('arbitrum-sepolia')), /fragment/);
});
test('changed address, start block, receipt, ABI, handler or context fails the deployment gate', () => {
  const v = validateNetworkConfig('arbitrum-sepolia'), manifest = targetManifest('arbitrum-sepolia');
  for (const field of ['address', 'startBlock']) {
    const c = structuredClone(v.config); c[source][field] = field === 'address' ? '0x' + '1'.repeat(40) : 1;
    assert.throws(() => validateFixedProbabilityDeployment('arbitrum-sepolia', c, v.evidence, manifest), /artifact/);
  }
  const e = structuredClone(v.evidence); e[source].transactionHash = '0x' + '2'.repeat(64);
  assert.throws(() => validateFixedProbabilityDeployment('arbitrum-sepolia', v.config, e, manifest), /transaction mismatch/);
  assert.throws(() => validateFixedProbabilityDeployment('arbitrum-sepolia', v.config, v.evidence, manifest, '[]'), /ABI hash/);
  assert.throws(() => validateFixedProbabilityDeployment('arbitrum-sepolia', v.config, v.evidence, manifest.replace('event: RandomnessStored', 'event: WrongRandomnessStored')), /handlers/);
  assert.throws(() => validateFixedProbabilityDeployment('arbitrum-sepolia', v.config, v.evidence, manifest.replace('data: "421614"', 'data: "42161"')), /context/);
  assert.throws(() => validateFixedProbabilityDeployment('arbitrum-sepolia', v.config, v.evidence, manifest.replace('protocolVersion:', 'unexpectedVersion:')), /context/);
  assert.throws(() => validateFixedProbabilityDeployment('arbitrum-sepolia', v.config, v.evidence, manifest.replace('data: \"3\"', 'data: \"1\"')), /context/);
  assert.throws(() => validateFixedProbabilityDeployment('arbitrum-one', v.config, v.evidence, manifest), /only deployed/);
});
test('Sepolia new source always checks deployment receipt, even without production receipt mode', async () => {
  const original = globalThis.fetch, calls = [], v = validateNetworkConfig('arbitrum-sepolia');
  const config = v.config[source];
  globalThis.fetch = async (_url, opts) => {
    const r = JSON.parse(opts.body); calls.push(r.method);
    return {ok: true, json: async () => ({result: r.method === 'eth_chainId' ? '0x66eee' : r.method === 'eth_getTransactionReceipt' ? {status: '0x1', contractAddress: config.address, blockNumber: '0x' + config.startBlock.toString(16)} : '0x6000'})};
  };
  try {
    await verifyNetworkState('https://rpc.invalid', 'arbitrum-sepolia', {...v, dataSourceNames: [source]});
    assert.deepEqual(calls, ['eth_chainId', 'eth_getTransactionReceipt', 'eth_getCode', 'eth_getCode']);
    globalThis.fetch = async (_url, opts) => ({ok: true, json: async () => ({result: JSON.parse(opts.body).method === 'eth_chainId' ? '0x66eee' : null})});
    await assert.rejects(verifyNetworkState('https://rpc.invalid', 'arbitrum-sepolia', {...v, dataSourceNames: [source]}), /missing or failed/);
  } finally { globalThis.fetch = original; }
});
