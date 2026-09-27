import { beforeEach, afterEach, assert, clearStore, dataSourceMock, test } from 'matchstick-as/assembly/index';
import { Address, BigInt, Bytes, DataSourceContext } from '@graphprotocol/graph-ts';
import { FixedProbabilitySeries } from '../generated/schema';
import { decodeConfig } from '../src/fixed-probability-config';
import { entityId, eventId, scopeId, uintKey, UINT_MAX, ZERO_BYTES } from '../src/fixed-probability-ids';
import * as h from '../src/fixed-probability';
import * as m from './fixed-probability-utils';
import { GOLDEN_CONFIG, EMPTY_CONFIG, MAX_CONFIG, PUBLIC_CONFIG, CONFIG_HASH, SCOPE, POLICY } from './fixtures/fixed-probability-config';
const BUYER = Address.fromString('0x1111111111111111111111111111111111111111');
const NEXT = Address.fromString('0x2222222222222222222222222222222222222222');
const KEY = Bytes.fromHexString('0x' + '33'.repeat(32));
function n(x: i32): BigInt { return BigInt.fromI32(x); }
function points(x: i32): BigInt { return n(x).times(BigInt.fromString('1000000000000000000')); }
function setup(): void {
  h.handleEligibilityScopeRegistered(m.mockEligibilityScopeRegistered(Bytes.fromHexString(SCOPE), Bytes.fromHexString(POLICY), n(20)));
  h.handleSeriesCreated(m.mockSeriesCreated(n(1), Bytes.fromHexString(CONFIG_HASH), Bytes.fromHexString(GOLDEN_CONFIG)));
  h.handleSeriesStatusChanged(m.mockSeriesStatusChanged(n(1), n(1), n(2)));
}
function request(quantity: i32 = 10, order: i32 = 1, before: i32 = 0, challenge: boolean = true): string {
  h.handleEligibilityConsumed(m.mockEligibilityConsumed(Bytes.fromHexString(SCOPE), KEY, n(order), n(quantity), n(before + quantity)));
  const rebate = quantity >= 10 ? 60 : quantity >= 5 ? 20 : 0;
  const e = m.mockOrderRequested(n(order), n(order + 100), BUYER, n(1), Bytes.fromHexString(CONFIG_HASH), KEY, n(quantity), n(before + 1), points(100 * quantity), points(rebate), points(100 * quantity - rebate), challenge, KEY, n(3), n(before));
  h.handleOrderRequested(e); return entityId(e, 'order', n(order));
}
function settle(quantity: i32 = 10): string {
  const words = new Array<BigInt>();
  for (let i = 0; i < quantity; i++) words.push(n(0));
  h.handleRandomnessStored(m.mockRandomnessStored(n(1), n(101), words));
  for (let i = 0; i < quantity; i++) h.handleDrawSettled(m.mockDrawSettled(n(1), n(i + 1), n(i), n(0), n(1)));
  const e = m.mockOrderSettled(n(1), true, n(0), points(quantity == 10 ? 940 : 100 * quantity));
  h.handleOrderSettled(e); return entityId(e, 'order', n(1));
}
beforeEach(() => {
  clearStore(); m.resetLogs();
  const context = new DataSourceContext();
  context.setBigInt('chainId', n(421614)); context.setBigInt('startBlock', n(312597121)); context.setString('protocolVersion', '2');
  dataSourceMock.setAddressAndContext(m.LOTTERY, context);
});
afterEach(() => { clearStore(); dataSourceMock.resetValues(); });

test('flat 17-field golden config and prize intervals retain original bytes', () => {
  setup();
  const e = m.mockSeriesCreated(n(1), Bytes.fromHexString(CONFIG_HASH), Bytes.fromHexString(GOLDEN_CONFIG));
  const id = entityId(e, 'series', n(1));
  assert.fieldEquals('FixedProbabilitySeries', id, 'configData', GOLDEN_CONFIG);
  assert.fieldEquals('FixedProbabilitySeries', id, 'pricePoints', points(100).toString());
  assert.fieldEquals('FixedProbabilitySeries', id, 'gateMode', '3');
  assert.fieldEquals('FixedProbabilitySeries', id, 'maxEligibleDraws', '20');
  assert.fieldEquals('FixedProbabilityPrize', id + ':prize:' + uintKey(n(4)), 'intervalStart', '4000');
  assert.fieldEquals('FixedProbabilityPrize', id + ':prize:' + uintKey(n(4)), 'intervalEndExclusive', '10000');
  assert.entityCount('FixedProbabilityPrize', 4);
});
test('empty dynamic arrays and Chinese content URI decode without losing offsets', () => {
  const s = new FixedProbabilitySeries('decode-only');
  decodeConfig(s, Bytes.fromHexString(EMPTY_CONFIG));
  assert.i32Equals(s.discountQuantities.length, 0);
  assert.stringEquals(s.contentURI, 'ipfs://測試/獎品.json');
  assert.stringEquals(s.contentHash.toHexString(), '0x22c2af53df337e93cd0032a6561260ca1163334941f69e27028671e94353e27f');
});
test('truncated config fails rather than emitting default series', () => {
  decodeConfig(new FixedProbabilitySeries('bad'), Bytes.fromHexString('0x1234'));
}, true);
test('qualification arrives before order, then is linked exactly once', () => {
  setup();
  const e = m.mockEligibilityConsumed(Bytes.fromHexString(SCOPE), KEY, n(1), n(10), n(10));
  h.handleEligibilityConsumed(e); h.handleEligibilityConsumed(e);
  assert.entityCount('FixedProbabilityOrder', 0);
  assert.entityCount('FixedProbabilityPendingEligibility', 1);
  const req = m.mockOrderRequested(n(1), n(101), BUYER, n(1), Bytes.fromHexString(CONFIG_HASH), KEY, n(10), n(1), points(1000), points(60), points(940), true, KEY, n(3), n(0));
  h.handleOrderRequested(req); h.handleOrderRequested(req);
  assert.entityCount('FixedProbabilityPendingEligibility', 0);
  assert.entityCount('FixedProbabilityDraw', 10);
  assert.fieldEquals('FixedProbabilityEligibilityConsumption', eventId(e), 'order', entityId(req, 'order', n(1)));
  assert.fieldEquals('FixedProbabilityEligibilityUsage', scopeId(e, Bytes.fromHexString(SCOPE)) + ':key:' + KEY.toHexString(), 'usedDraws', '10');
});
test('ten zero words and repeated winning prizes refund once with independent accounting', () => {
  setup(); request(); const id = settle();
  assert.fieldEquals('FixedProbabilityOrder', id, 'refundPoints', points(940).toString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'firstTriggerIndex', '0');
  assert.fieldEquals('FixedProbabilityOrder', id, 'finalPointsConsumed', '0');
  assert.fieldEquals('FixedProbabilityOrder', id, 'accountingFinalized', 'false');
  assert.fieldEquals('FixedProbabilityOrder', id, 'claimedCount', '0');
  h.handleOrderAccountingFinalized(m.mockOrderAccountingFinalized(n(1), BUYER, KEY, n(0), points(940), n(0), n(0), n(0), n(0)));
  assert.fieldEquals('FixedProbabilityOrder', id, 'accountingFinalized', 'true');
  assert.entityCount('MembershipV2Member', 0);
});
test('claim callback transfer preserves the later owner and does not finalize accounting', () => {
  setup(); request(); const id = settle();
  h.handleTransfer(m.mockTransfer(Address.zero(), BUYER, n(1)));
  h.handleTransfer(m.mockTransfer(BUYER, NEXT, n(1)));
  const claim = m.mockPrizeClaimed(n(1), n(1), BUYER, BUYER, n(1), n(1), n(1));
  h.handlePrizeClaimed(claim); h.handlePrizeClaimed(claim);
  assert.fieldEquals('FixedProbabilityNFT', entityId(claim, 'nft', n(1)), 'currentOwner', NEXT.toHexString());
  assert.fieldEquals('FixedProbabilityNFT', entityId(claim, 'nft', n(1)), 'claimRecipient', BUYER.toHexString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'claimedCount', '1');
  assert.fieldEquals('FixedProbabilityOrder', id, 'accountingFinalized', 'false');
});
test('unknown and malformed callbacks are only audited', () => {
  for (let i = 1; i <= 3; i++) h.handleCallbackIgnored(m.mockCallbackIgnored(n(888), n(i)));
  assert.entityCount('FixedProbabilityEvent', 3);
  assert.entityCount('FixedProbabilityRequest', 0);
  assert.entityCount('FixedProbabilityOrder', 0);
});
test('incorrect settled result is rejected', () => {
  setup(); request(1);
  h.handleRandomnessStored(m.mockRandomnessStored(n(1), n(101), [n(0)]));
  h.handleDrawSettled(m.mockDrawSettled(n(1), n(1), n(0), n(0), n(4)));
}, true);
test('out of order VRF responses remain bound to their requests', () => {
  setup(); request(1); request(1, 2, 1);
  h.handleRandomnessStored(m.mockRandomnessStored(n(2), n(102), [n(4000)]));
  const first = m.mockRandomnessStored(n(1), n(101), [n(0)]); h.handleRandomnessStored(first);
  assert.fieldEquals('FixedProbabilityOrder', entityId(first, 'order', n(1)), 'randomWords', '[0]');
  assert.fieldEquals('FixedProbabilityOrder', entityId(first, 'order', n(2)), 'randomWords', '[4000]');
});
test('missing qualification event cannot be filled using latest chain state', () => {
  setup();
  h.handleOrderRequested(m.mockOrderRequested(n(1), n(101), BUYER, n(1), Bytes.fromHexString(CONFIG_HASH), KEY, n(1), n(1), points(100), n(0), points(100), true, KEY, n(3), n(0)));
}, true);
test('public series works without qualification consumption', () => {
  h.handleSeriesCreated(m.mockSeriesCreated(n(1), Bytes.fromHexString(CONFIG_HASH), Bytes.fromHexString(PUBLIC_CONFIG)));
  h.handleSeriesStatusChanged(m.mockSeriesStatusChanged(n(1), n(1), n(2)));
  h.handleOrderRequested(m.mockOrderRequested(n(1), n(101), BUYER, n(1), Bytes.fromHexString(CONFIG_HASH), KEY, n(1), n(1), points(100), n(0), points(100), false, ZERO_BYTES, n(0), n(0)));
  assert.entityCount('FixedProbabilityOrder', 1); assert.entityCount('FixedProbabilityEligibilityConsumption', 0);
});
test('IDs order numerically and isolate deployments', () => {
  assert.assertTrue(uintKey(n(1)) < uintKey(n(2)) && uintKey(n(2)) < uintKey(n(10)));
  assert.i32Equals(uintKey(UINT_MAX).length, 78);
  const e = m.mockCallbackIgnored(n(1), n(1)), first = entityId(e, 'order', n(1));
  e.address = NEXT;
  assert.assertTrue(first != entityId(e, 'order', n(1)));
});

test('maximum 32 prizes, ten discounts and uint256 maximum ID keep exact array boundaries', () => {
  const s = new FixedProbabilitySeries('max-config');
  decodeConfig(s, Bytes.fromHexString(MAX_CONFIG));
  assert.i32Equals(s.prizeIds.length, 32);
  // Matchstick bigIntEquals uses signed ABI encoding, which cannot encode uint256 max.
  assert.stringEquals(s.prizeIds[31].toString(), UINT_MAX.toString());
  assert.i32Equals(s.weights[31], 328);
  assert.i32Equals(s.discountQuantities.length, 10);
  assert.i32Equals(s.discountQuantities[9], 10);
  assert.bigIntEquals(s.discountPoints[9], points(10));
  assert.stringEquals(s.freeOrderPrizeIds[0].toString(), UINT_MAX.toString());
});
test('ordinary paid order, partial claims and observed reward stay independent', () => {
  setup(); const id = request(2, 1, 0, false);
  h.handleRandomnessStored(m.mockRandomnessStored(n(1), n(101), [n(0), UINT_MAX]));
  h.handleDrawSettled(m.mockDrawSettled(n(1), n(1), n(0), n(0), n(1)));
  h.handleDrawSettled(m.mockDrawSettled(n(1), n(2), n(1), n(9935), n(4)));
  h.handleOrderSettled(m.mockOrderSettled(n(1), false, n(65535), n(0)));
  h.handleTransfer(m.mockTransfer(Address.zero(), BUYER, n(2)));
  const claim = m.mockPrizeClaimed(n(1), n(2), BUYER, BUYER, n(2), n(1), n(4));
  h.handlePrizeClaimed(claim);
  assert.fieldEquals('FixedProbabilityOrder', id, 'claimedCount', '1');
  assert.fieldEquals('FixedProbabilityOrder', id, 'firstTriggerIndex', '65535');
  assert.fieldEquals('FixedProbabilityOrder', id, 'finalPointsConsumed', points(200).toString());
  h.handleOrderAccountingFinalized(m.mockOrderAccountingFinalized(n(1), BUYER, KEY, points(200), n(0), points(2), n(3), n(4), n(1900000000)));
  assert.fieldEquals('FixedProbabilityOrder', id, 'observedMembershipRewardPoints', points(2).toString());
  assert.fieldEquals('FixedProbabilityOrder', id, 'claimedCount', '1');
  assert.fieldEquals('FixedProbabilityDraw', entityId(claim, 'draw', n(1)), 'claimed', 'false');
  assert.entityCount('MembershipV2Member', 0);
  h.handleTransfer(m.mockTransfer(Address.zero(), NEXT, n(1)));
  h.handlePrizeClaimed(m.mockPrizeClaimed(n(1), n(1), BUYER, NEXT, n(1), n(1), n(1)));
  assert.fieldEquals('FixedProbabilityOrder', id, 'claimedCount', '2');
  assert.fieldEquals('FixedProbabilityOrder', id, 'buyer', BUYER.toHexString());
});
test('audit contains all parameters, exact integer strings and immutable evidence', () => {
  // An ignored callback is a real auditable event without a fabricated order.
  const ignored = m.mockCallbackIgnored(UINT_MAX, n(2));
  h.handleCallbackIgnored(ignored); h.handleCallbackIgnored(ignored);
  assert.fieldEquals('FixedProbabilityEvent', eventId(ignored), 'parameters', '{"requestId":"' + UINT_MAX.toString() + '","reason":"2"}');
  assert.fieldEquals('FixedProbabilityEvent', eventId(ignored), 'transactionHash', ignored.transaction.hash.toHexString());
  assert.fieldEquals('FixedProbabilityEvent', eventId(ignored), 'blockHash', ignored.block.hash.toHexString());
  assert.entityCount('FixedProbabilityEvent', 1);
  setup(); request(2);
  const words = m.mockRandomnessStored(n(1), n(101), [n(0), UINT_MAX]);
  h.handleRandomnessStored(words);
  assert.fieldEquals('FixedProbabilityEvent', eventId(words), 'parameters', '{"orderId":"1","requestId":"101","randomWords":["0","' + UINT_MAX.toString() + '"]}');
  h.handleApproval(m.mockApproval(BUYER, NEXT, n(1)));
  h.handleApprovalForAll(m.mockApprovalForAll(BUYER, NEXT, true));
  h.handleEIP712DomainChanged(m.mockEIP712DomainChanged());
  assert.entityCount('FixedProbabilityNFT', 0);
});
test('same scope and account key accumulate across series without restoring free-order quota', () => {
  setup(); request(); settle();
  h.handleSeriesCreated(m.mockSeriesCreated(n(2), Bytes.fromHexString(CONFIG_HASH), Bytes.fromHexString(GOLDEN_CONFIG)));
  h.handleSeriesStatusChanged(m.mockSeriesStatusChanged(n(2), n(1), n(2)));
  const consume = m.mockEligibilityConsumed(Bytes.fromHexString(SCOPE), KEY, n(2), n(10), n(20));
  h.handleEligibilityConsumed(consume);
  h.handleOrderRequested(m.mockOrderRequested(n(2), n(102), BUYER, n(2), Bytes.fromHexString(CONFIG_HASH), KEY, n(10), n(11), points(1000), points(60), points(940), true, KEY, n(3), n(0)));
  assert.fieldEquals('FixedProbabilityEligibilityUsage', scopeId(consume, Bytes.fromHexString(SCOPE)) + ':key:' + KEY.toHexString(), 'usedDraws', '20');
  assert.entityCount('FixedProbabilityDraw', 20);
});
test('closed series cannot be reopened', () => {
  setup(); h.handleSeriesStatusChanged(m.mockSeriesStatusChanged(n(1), n(2), n(4)));
  h.handleSeriesStatusChanged(m.mockSeriesStatusChanged(n(1), n(4), n(2)));
}, true);
