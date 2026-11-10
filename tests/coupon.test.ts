import { afterEach, assert, beforeEach, clearStore, dataSourceMock, test } from 'matchstick-as/assembly/index';
import { newMockEvent } from 'matchstick-as';
import { Address, BigInt, Bytes, DataSourceContext, ethereum } from '@graphprotocol/graph-ts';
import { DatabasePointsPurchaseMintedV2 as BundlePurchaseV2 } from '../generated/DoudoBundleModule/DoudoBundleModuleUpgradeable';
import { DatabasePointsPurchaseMintedV2 as FixedPurchaseV2, OrderRequestedV2 } from '../generated/templates/FixedProbabilityBuyback/FixedProbabilityLotteryBuyback';
import { handleDatabasePointsPurchaseMintedV2 as handleBundlePurchase } from '../src/bundle';
import * as h from '../src/fixed-probability';
import * as m from './fixed-probability-utils';
import { entityId } from '../src/fixed-probability-ids';
import { CONFIG_HASH, GOLDEN_CONFIG, POLICY, SCOPE } from './fixtures/fixed-probability-config';

const BUYER = Address.fromString('0x1111111111111111111111111111111111111111');
const SNAPSHOT = Bytes.fromHexString('0x' + '33'.repeat(32));
function n(value: i32): BigInt { return BigInt.fromI32(value); }
function points(value: i32): BigInt { return n(value).times(BigInt.fromString('1000000000000000000')); }
function uint(name: string, value: BigInt): ethereum.EventParam { return new ethereum.EventParam(name, ethereum.Value.fromUnsignedBigInt(value)); }
function bytes(name: string, value: Bytes): ethereum.EventParam { return new ethereum.EventParam(name, ethereum.Value.fromFixedBytes(value)); }
function purchaseEvent(): BundlePurchaseV2 {
  const e = changetype<BundlePurchaseV2>(newMockEvent());
  e.parameters = [bytes('authorizationId', SNAPSHOT), uint('seriesID', n(1)), new ethereum.EventParam('buyer', ethereum.Value.fromAddress(BUYER)),
    uint('ticketQuantity', n(4)), uint('grossPoints', points(400)), uint('rebatePoints', points(40)), uint('netPointsConsumed', points(310)),
    uint('membershipRewardPoints', points(3)), new ethereum.EventParam('revealImmediately', ethereum.Value.fromBoolean(false)),
    new ethereum.EventParam('freeOrderChallenge', ethereum.Value.fromBoolean(true)), uint('firstTokenID', n(10)), uint('challengeRequestId', n(101)),
    uint('couponDiscount', points(50)), bytes('pricingSnapshotHash', SNAPSHOT), uint('pricingVersion', n(2))];
  return e;
}
function setup(): void {
  h.handleEligibilityScopeRegistered(m.mockEligibilityScopeRegistered(Bytes.fromHexString(SCOPE), Bytes.fromHexString(POLICY), n(20)));
  h.handleSeriesCreated(m.mockSeriesCreated(n(1), Bytes.fromHexString(CONFIG_HASH), Bytes.fromHexString('0x' + '00'.repeat(31) + '20' + GOLDEN_CONFIG.slice(2))));
  h.handleSeriesStatusChanged(m.mockSeriesStatusChanged(n(1), n(0), n(1)));
  h.handleSeriesStatusChanged(m.mockSeriesStatusChanged(n(1), n(1), n(2)));
}
function requestV2(): OrderRequestedV2 {
  h.handleEligibilityConsumed(m.mockEligibilityConsumed(Bytes.fromHexString(SCOPE), SNAPSHOT, n(1), n(5), n(5)));
  const legacy = m.mockOrderRequested(n(1), n(101), BUYER, n(1), Bytes.fromHexString(CONFIG_HASH), SNAPSHOT, n(5), n(1), points(500), points(20), points(430), true, SNAPSHOT, n(3), n(0));
  const e = changetype<OrderRequestedV2>(legacy);
  e.parameters.push(uint('couponDiscount', points(50)));
  e.parameters.push(bytes('pricingSnapshotHash', SNAPSHOT));
  e.parameters.push(uint('pricingVersion', n(2)));
  return e;
}
beforeEach(() => {
  clearStore(); m.resetLogs();
  const context = new DataSourceContext(); context.setBigInt('chainId', n(421614)); context.setBigInt('startBlock', n(312597121)); context.setString('protocolVersion', '3');
  dataSourceMock.setAddressAndContext(m.LOTTERY, context);
});
afterEach(() => { clearStore(); dataSourceMock.resetValues(); });
test('both modes preserve complete V2 amounts and cannot collide on the same series number', () => {
  const core = purchaseEvent(); core.logIndex = n(1); handleBundlePurchase(core);
  const fixed = changetype<FixedPurchaseV2>(purchaseEvent()); fixed.logIndex = n(2); fixed.address = Address.fromString(m.LOTTERY); h.handleDatabasePointsPurchaseMintedV2(fixed);
  assert.entityCount('DatabasePointsPurchaseMintV2', 2);
  const ids = [core.transaction.hash.concatI32(1).toHexString(), fixed.transaction.hash.concatI32(2).toHexString()];
  for (let i = 0; i < ids.length; i++) {
    assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[i], 'grossPoints', points(400).toString());
    assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[i], 'rebatePoints', points(40).toString());
    assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[i], 'couponDiscount', points(50).toString());
    assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[i], 'debitNowPoints', points(350).toString());
    assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[i], 'netPointsConsumed', points(310).toString());
    assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[i], 'pricingSnapshotHash', SNAPSHOT.toHexString());
    assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[i], 'pricingVersion', '2');
  }
  assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[0], 'sourceMode', 'CORE');
  assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[1], 'sourceMode', 'FIXED_PROBABILITY');
  assert.fieldEquals('DatabasePointsPurchaseMintV2', ids[1], 'contractAddress', m.LOTTERY);
  assert.entityCount('DatabasePointsPurchaseMint', 0);
});
test('fixed V2 indexes net pricing and limits winning settlement to coupon net', () => {
  setup(); const request = requestV2(); h.handleOrderRequestedV2(request);
  const id = entityId(request, 'order', n(1));
  assert.fieldEquals('FixedProbabilityOrder', id, 'grossPoints', points(500).toString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'rebatePoints', points(20).toString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'couponDiscount', points(50).toString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'debitNowPoints', points(450).toString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'netPoints', points(430).toString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'pricingSnapshotHash', SNAPSHOT.toHexString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'pricingVersion', '2');
  for (let i = 0; i < 5; i++) h.handleTransfer(m.mockTransfer(Address.zero(), BUYER, n(i + 1)));
  h.handleRandomnessStored(m.mockRandomnessStored(n(1), n(101), [n(0),n(0),n(0),n(0),n(0)]));
  for (let i = 0; i < 5; i++) h.handleDrawSettled(m.mockDrawSettled(n(1), n(i + 1), n(i), n(0), n(1)));
  h.handleOrderSettled(m.mockOrderSettled(n(1), true, n(0), points(430)));
  assert.fieldEquals('FixedProbabilityOrder', id, 'refundPoints', points(430).toString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'finalPointsConsumed', '0');
});
test('rejects V2 purchase events whose net omits the coupon', () => {
  const e = purchaseEvent(); e.parameters[6] = uint('netPointsConsumed', points(360)); handleBundlePurchase(e);
}, true);
test('rejects fractional coupon events', () => {
  const e = purchaseEvent(); e.parameters[12] = uint('couponDiscount', points(50).plus(n(1))); handleBundlePurchase(e);
}, true);
test('rejects V2 fixed events with stale rebate/discount arithmetic', () => {
  setup(); const e = requestV2(); e.parameters[10] = uint('netPoints', points(480)); h.handleOrderRequestedV2(e);
}, true);
