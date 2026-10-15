import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { targetManifest } from '../scripts/target-manifest.mjs';
import { validateFixedProbabilityDeployment } from '../scripts/verify-fixed-probability-deployment.mjs';
import { validateNetworkConfig } from '../scripts/validate-network-config.mjs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const source = 'FixedProbabilityLottery';
const retiredAddress = '0x745cb4540696cf67a453aa3ce301ca50e1239fc5';

test('staging indexes only the new fixed-probability proxy and preserves all Core sources', () => {
  const base = read('../subgraph.yaml');
  assert.equal(targetManifest('arbitrum-one'), base);
  const staging = validateNetworkConfig('arbitrum-sepolia');
  const prod = validateNetworkConfig('arbitrum-one');
  assert.equal(staging.config[source], undefined);
  assert.equal(staging.dataSourceNames.includes(source), false);
  assert.deepEqual(staging.dataSourceNames.filter(x => !x.startsWith('FixedProbabilityBuyback_') && !x.startsWith('BuybackMarketplace_')), prod.dataSourceNames);
  const manifest = targetManifest('arbitrum-sepolia');
  assert.equal(manifest.toLowerCase().includes(retiredAddress), false);
  assert.equal(JSON.stringify(staging.config).toLowerCase().includes(retiredAddress), false);
  assert.ok(staging.dataSourceNames.some(x => x.startsWith('FixedProbabilityBuyback_')));
  assert.match(manifest.toLowerCase(), /0x51a9f7f467498fee72efbe37043897a3c225f235/);
  assert.match(manifest, /handler: handleUpgraded/);
  assert.match(manifest, /handler: handleNativePrizeBuybackBurned/);
});

test('a retired V3 source, network entry or evidence entry cannot reenter a deployment', () => {
  const empty = {};
  assert.doesNotThrow(() => validateFixedProbabilityDeployment('arbitrum-sepolia', empty, null, 'templates:'));
  for (const network of ['arbitrum-sepolia', 'arbitrum-one']) {
    assert.throws(() => validateFixedProbabilityDeployment(network, {[source]: {}}, null, ''), /Retired/);
    assert.throws(() => validateFixedProbabilityDeployment(network, empty, {[source]: {}}, ''), /Retired/);
    assert.throws(() => validateFixedProbabilityDeployment(network, empty, null, '    name: FixedProbabilityLottery\n'), /Retired/);
    assert.throws(() => targetManifest(network, '    name: FixedProbabilityLottery\ntemplates:'), /fragment/);
  }
});
