import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { Interface } from '@ethersproject/abi';
const read = name => JSON.parse(readFileSync(new URL(`../abis/${name}.json`, import.meta.url), 'utf8'));
test('coupon fixed ABI retains the historical deployment ABI as an exact compatible superset', () => {
  const historical = read('FixedProbabilityLotteryBuyback');
  const coupon = read('FixedProbabilityLotteryCouponV2');
  for (const old of historical) {
    if (old.type === 'constructor') continue;
    assert(coupon.some(entry => JSON.stringify(entry) === JSON.stringify(old)), `${old.type} ${old.name} changed`);
  }
  const next = new Interface(coupon.filter(entry => entry.type !== 'error'));
  assert.equal(next.getEvent('OrderRequestedV2').inputs.length, 18);
  assert.equal(next.getEvent('DatabasePointsPurchaseMintedV2').inputs.length, 15);
  assert.equal(next.getFunction('couponAuthorizationVersion').outputs[0].type, 'uint256');
});
test('both modes share the same complete V2 purchase event and keep all historical evidence immutable', () => {
  const fixed = new Interface(read('FixedProbabilityLotteryCouponV2').filter(entry => entry.type !== 'error'));
  const bundle = new Interface(read('DoudoBundleModuleUpgradeable').filter(entry => entry.type !== 'error'));
  assert.equal(fixed.getEvent('DatabasePointsPurchaseMintedV2').format('full'), bundle.getEvent('DatabasePointsPurchaseMintedV2').format('full'));
  const manifest = readFileSync(new URL('../subgraph.yaml', import.meta.url), 'utf8');
  const fragment = readFileSync(new URL('../config/fixed-probability-buyback-source.yaml', import.meta.url), 'utf8');
  for (const text of [manifest, fragment]) {
    assert(text.includes('file: ./abis/FixedProbabilityLotteryCouponV2.json'));
    assert(text.includes('handler: handleOrderRequestedV2'));
  }
});
