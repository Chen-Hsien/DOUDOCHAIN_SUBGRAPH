import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { targetManifest } from '../scripts/target-manifest.mjs';
import { validateFixedProbabilityDeployment } from '../scripts/verify-fixed-probability-deployment.mjs';
import { validateNetworkConfig } from '../scripts/validate-network-config.mjs';
const read = p => readFileSync(new URL(p, import.meta.url), 'utf8');
const source = 'FixedProbabilityLottery';
const retiredAddress = '0x745cb4540696cf67a453aa3ce301ca50e1239fc5';

test('both networks index their native fixed-probability proxy and preserve all Core sources', () => {
  const base = read('../subgraph.yaml');
  const staging = validateNetworkConfig('arbitrum-sepolia');
  const prod = validateNetworkConfig('arbitrum-one');
  const coreNames = validation => validation.dataSourceNames.filter(x => !x.startsWith('FixedProbabilityBuyback_') && !x.startsWith('BuybackMarketplace_'));
  const historicalConfig = JSON.parse(read('../networks.json'));
  assert.deepEqual(coreNames(staging), coreNames(prod));
  for (const [network, validation] of [['arbitrum-sepolia', staging], ['arbitrum-one', prod]]) {
    assert.equal(validation.config[source], undefined);
    assert.equal(validation.dataSourceNames.includes(source), false);
    assert.equal(JSON.stringify(validation.config).toLowerCase().includes(retiredAddress), false);
    for (const name of coreNames(validation)) assert.deepEqual(validation.config[name], historicalConfig[network][name]);
    assert.ok(targetManifest(network).startsWith(base.split(/^templates:/m)[0]));
  }
  const manifest = targetManifest('arbitrum-sepolia');
  assert.equal(manifest.toLowerCase().includes(retiredAddress), false);
  assert.equal(JSON.stringify(staging.config).toLowerCase().includes(retiredAddress), false);
  assert.ok(staging.dataSourceNames.some(x => x.startsWith('FixedProbabilityBuyback_')));
  assert.match(manifest.toLowerCase(), /0x51a9f7f467498fee72efbe37043897a3c225f235/);
  assert.match(manifest, /handler: handleUpgraded/);
  assert.match(manifest, /handler: handleNativePrizeBuybackBurned/);
  const mainnetSource = 'FixedProbabilityBuyback_8fc4977a5a999db2efaccd1ecea090a542a61723';
  assert.deepEqual(prod.dataSourceNames.filter(x => !coreNames(prod).includes(x)), [mainnetSource]);
  assert.deepEqual(prod.config[mainnetSource], {
    address: '0x8Fc4977a5A999DB2Efaccd1EcEA090A542a61723',
    startBlock: 520016196,
  });
  const mainnetManifest = targetManifest('arbitrum-one');
  assert.equal(mainnetManifest.toLowerCase().includes(retiredAddress), false);
  assert.equal(mainnetManifest.toLowerCase().includes('0x51a9f7f467498fee72efbe37043897a3c225f235'), false);
  assert.match(mainnetManifest, /name: FixedProbabilityBuyback_8fc4977a5a999db2efaccd1ecea090a542a61723/);
  assert.match(mainnetManifest, /data: "42161"/);
  assert.match(mainnetManifest, /data: "520016196"/);
  assert.match(mainnetManifest, /protocolVersion:\n\s+type: String\n\s+data: "3"/);
  assert.match(mainnetManifest, /handler: handleUpgraded/);
  assert.match(mainnetManifest, /handler: handleNativePrizeBuybackBurned/);
  assert.equal(prod.nativeBuybacks[0].protocolVersion, 1);
  assert.equal(prod.nativeBuybacks[0].marketplace, undefined);
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
