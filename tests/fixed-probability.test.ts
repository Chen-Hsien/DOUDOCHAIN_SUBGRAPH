import { afterEach, assert, beforeEach, clearStore, dataSourceMock, test } from 'matchstick-as/assembly/index';
import { Address, BigInt, Bytes, DataSourceContext } from '@graphprotocol/graph-ts';
import { FixedProbabilitySeries } from '../generated/schema';
import { decodeConfig } from '../src/fixed-probability-config';
import { entityId, scopeId, uintKey } from '../src/fixed-probability-ids';
import * as h from '../src/fixed-probability';
import * as m from './fixed-probability-utils';
import { CONFIG_HASH, EMPTY_CONFIG, GOLDEN_CONFIG, POLICY, SCOPE } from './fixtures/fixed-probability-config';

const BUYER = Address.fromString('0x1111111111111111111111111111111111111111');
const NEXT = Address.fromString('0x2222222222222222222222222222222222222222');
const KEY = Bytes.fromHexString('0x' + '33'.repeat(32));
function n(value: i32): BigInt { return BigInt.fromI32(value); }
function points(value: i32): BigInt { return n(value).times(BigInt.fromString('1000000000000000000')); }

function setup(): void {
  h.handleEligibilityScopeRegistered(m.mockEligibilityScopeRegistered(Bytes.fromHexString(SCOPE), Bytes.fromHexString(POLICY), n(20)));
  h.handleSeriesCreated(m.mockSeriesCreated(n(1), Bytes.fromHexString(CONFIG_HASH), Bytes.fromHexString(GOLDEN_CONFIG)));
  h.handleSeriesStatusChanged(m.mockSeriesStatusChanged(n(1), n(1), n(2)));
}

function purchase(quantity: i32 = 2): string {
  h.handleEligibilityConsumed(m.mockEligibilityConsumed(Bytes.fromHexString(SCOPE), KEY, n(1), n(quantity), n(quantity)));
  const rebate = quantity >= 10 ? 60 : quantity >= 5 ? 20 : 0;
  const request = m.mockOrderRequested(n(1), n(101), BUYER, n(1), Bytes.fromHexString(CONFIG_HASH), KEY, n(quantity), n(1), points(100 * quantity), points(rebate), points(100 * quantity - rebate), true, KEY, n(3), n(0));
  h.handleOrderRequested(request);
  for (let i = 0; i < quantity; i++) h.handleTransfer(m.mockTransfer(Address.zero(), BUYER, n(i + 1)));
  return entityId(request, 'order', n(1));
}

beforeEach(() => {
  clearStore();
  m.resetLogs();
  const context = new DataSourceContext();
  context.setBigInt('chainId', n(421614));
  context.setBigInt('startBlock', n(312597121));
  context.setString('protocolVersion', '3');
  dataSourceMock.setAddressAndContext(m.LOTTERY, context);
});
afterEach(() => { clearStore(); dataSourceMock.resetValues(); });

test('v3 config keeps prize intervals and content bytes', () => {
  setup();
  const created = m.mockSeriesCreated(n(1), Bytes.fromHexString(CONFIG_HASH), Bytes.fromHexString(GOLDEN_CONFIG));
  const id = entityId(created, 'series', n(1));
  assert.fieldEquals('FixedProbabilitySeries', id, 'configData', GOLDEN_CONFIG);
  assert.fieldEquals('FixedProbabilitySeries', id, 'pricePoints', points(100).toString());
  assert.fieldEquals('FixedProbabilityPrize', id + ':prize:' + uintKey(n(4)), 'intervalEndExclusive', '10000');
  assert.entityCount('FixedProbabilityPrize', 4);
});

test('empty arrays and unicode content URI decode without losing offsets', () => {
  const series = new FixedProbabilitySeries('decode-only');
  decodeConfig(series, Bytes.fromHexString(EMPTY_CONFIG));
  assert.i32Equals(series.discountQuantities.length, 0);
  assert.stringEquals(series.contentURI, 'ipfs://測試/獎品.json');
});

test('purchase mints one NFT per draw before VRF settlement', () => {
  setup();
  const order = purchase(2);
  assert.entityCount('FixedProbabilityDraw', 2);
  assert.entityCount('FixedProbabilityNFT', 2);
  assert.fieldEquals('FixedProbabilityOrder', order, 'state', 'PENDING');
  assert.fieldEquals('FixedProbabilityOrder', order, 'claimedCount', '2');
  assert.fieldEquals('FixedProbabilityDraw', entityId(m.mockTransfer(Address.zero(), BUYER, n(1)), 'draw', n(1)), 'claimed', 'true');
});

test('VRF reveals the already minted NFTs and exchange updates the same asset', () => {
  setup();
  const order = purchase(2);
  h.handleRandomnessStored(m.mockRandomnessStored(n(1), n(101), [n(0), n(5000)]));
  h.handleDrawSettled(m.mockDrawSettled(n(1), n(1), n(0), n(0), n(1)));
  h.handleDrawSettled(m.mockDrawSettled(n(1), n(2), n(1), n(5000), n(4)));
  h.handleOrderSettled(m.mockOrderSettled(n(1), true, n(0), points(200)));
  h.handleUpdateTicketStatus(m.mockUpdateTicketStatus(n(1), n(1), n(1), false, true));
  h.handleUpdateTicketStatus(m.mockUpdateTicketStatus(n(1), n(1), n(1), true, true));
  assert.fieldEquals('FixedProbabilityOrder', order, 'state', 'SETTLED');
  assert.fieldEquals('FixedProbabilityDraw', entityId(m.mockTransfer(Address.zero(), BUYER, n(2)), 'draw', n(2)), 'prizeId', '4');
  assert.fieldEquals('FixedProbabilityNFT', entityId(m.mockTransfer(Address.zero(), BUYER, n(1)), 'nft', n(1)), 'exchanged', 'true');
});

test('NFT ownership transfers remain visible after purchase', () => {
  setup();
  purchase(1);
  const transfer = m.mockTransfer(BUYER, NEXT, n(1));
  h.handleTransfer(transfer);
  assert.fieldEquals('FixedProbabilityNFT', entityId(transfer, 'nft', n(1)), 'currentOwner', NEXT.toHexString());
});

test('incorrect VRF prize mapping is rejected', () => {
  setup();
  purchase(1);
  h.handleRandomnessStored(m.mockRandomnessStored(n(1), n(101), [n(0)]));
  h.handleDrawSettled(m.mockDrawSettled(n(1), n(1), n(0), n(0), n(4)));
}, true);

test('eligibility consumption remains scoped and accounting is independent', () => {
  setup();
  const order = purchase(1);
  assert.fieldEquals('FixedProbabilityEligibilityUsage', scopeId(m.mockTransfer(Address.zero(), BUYER, n(1)), Bytes.fromHexString(SCOPE)) + ':key:' + KEY.toHexString(), 'usedDraws', '1');
  h.handleRandomnessStored(m.mockRandomnessStored(n(1), n(101), [n(9999)]));
  h.handleDrawSettled(m.mockDrawSettled(n(1), n(1), n(0), n(9999), n(4)));
  h.handleOrderSettled(m.mockOrderSettled(n(1), false, n(65535), n(0)));
  h.handleOrderAccountingFinalized(m.mockOrderAccountingFinalized(n(1), BUYER, KEY, points(100), n(0), n(2), n(3), n(4), n(1900000000)));
  assert.fieldEquals('FixedProbabilityOrder', order, 'accountingFinalized', 'true');
  assert.fieldEquals('FixedProbabilityOrder', order, 'claimedCount', '1');
});
