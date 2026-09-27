import { BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { FixedProbabilitySeries } from '../generated/schema';
import { ZERO, ZERO_BYTES, UINT_MAX } from './fixed-probability-ids';

const TYPES = '(uint256,uint256,uint16,uint256[],uint16[],uint16[],uint256[],uint8,uint256,uint256[],uint8,uint8,bytes32,bytes32,uint256,bytes32,string)';

export function decodeConfig(series: FixedProbabilitySeries, data: Bytes): void {
  const prefix = Bytes.fromHexString('0x' + '00'.repeat(31) + '20');
  const decoded = ethereum.decode(TYPES, prefix.concat(data));
  assert(decoded != null, 'FixedProbability: invalid flat configData');
  const c = decoded!.toTuple();
  assert(c.length == 17, 'FixedProbability: config field count');
  series.configData = data;
  series.pricePoints = c[0].toBigInt();
  series.drawCap = c[1].toBigInt();
  series.maxBatchSize = c[2].toI32();
  series.prizeIds = c[3].toBigIntArray();
  series.weights = c[4].toI32Array();
  series.discountQuantities = c[5].toI32Array();
  series.discountPoints = c[6].toBigIntArray();
  series.freeOrderMode = c[7].toI32();
  series.freeOrderFirstDraws = c[8].toBigInt();
  series.freeOrderPrizeIds = c[9].toBigIntArray();
  series.gateMode = c[10].toI32();
  series.minMemberLevel = c[11].toI32();
  series.eligibilityPolicyId = c[12].toBytes();
  series.eligibilityScope = c[13].toBytes();
  series.maxEligibleDraws = c[14].toBigInt();
  series.contentHash = c[15].toBytes();
  series.contentURI = c[16].toString();
  const n = series.maxBatchSize;
  const ids = series.prizeIds, weights = series.weights;
  assert(series.pricePoints.gt(ZERO) && n > 0 && n <= 10, 'FixedProbability: price/batch');
  assert(ids.length > 0 && ids.length <= 32 && ids.length == weights.length, 'FixedProbability: prizes');
  let total = 0;
  for (let i = 0; i < ids.length; i++) {
    assert(ids[i].gt(ZERO) && weights[i] > 0 && weights[i] <= 10000, 'FixedProbability: weight/id');
    for (let j = 0; j < i; j++) assert(!ids[i].equals(ids[j]), 'FixedProbability: duplicate prize');
    total += weights[i];
  }
  assert(total == 10000, 'FixedProbability: total weight');
  const quantities = series.discountQuantities, discounts = series.discountPoints;
  assert(quantities.length <= 10 && quantities.length == discounts.length, 'FixedProbability: discounts');
  let previousQuantity = 0;
  let previousDiscount = ZERO;
  for (let i = 0; i < quantities.length; i++) {
    const gross = series.pricePoints.times(BigInt.fromI32(quantities[i]));
    assert(quantities[i] > previousQuantity && quantities[i] <= n, 'FixedProbability: discount threshold');
    assert(gross.le(UINT_MAX) && discounts[i].ge(previousDiscount) && discounts[i].le(gross), 'FixedProbability: discount amount');
    previousQuantity = quantities[i]; previousDiscount = discounts[i];
  }
  const mode = series.freeOrderMode, triggers = series.freeOrderPrizeIds;
  assert(mode >= 0 && mode <= 2, 'FixedProbability: free mode');
  for (let i = 0; i < triggers.length; i++) {
    assert(contains(ids, triggers[i]), 'FixedProbability: foreign trigger');
    for (let j = 0; j < i; j++) assert(!triggers[i].equals(triggers[j]), 'FixedProbability: duplicate trigger');
  }
  if (mode == 0) assert(triggers.length == 0 && series.freeOrderFirstDraws.equals(ZERO), 'FixedProbability: disabled promotion');
  else {
    assert(triggers.length > 0, 'FixedProbability: no trigger');
    if (mode == 1) assert(series.freeOrderFirstDraws.gt(ZERO) && (series.drawCap.equals(ZERO) || series.freeOrderFirstDraws.le(series.drawCap)), 'FixedProbability: first N');
    else assert(series.freeOrderFirstDraws.equals(ZERO), 'FixedProbability: all draws');
  }
  const gate = series.gateMode, level = series.minMemberLevel;
  assert(gate >= 0 && gate <= 3, 'FixedProbability: gate mode');
  if (gate == 1 || gate == 3) assert(level > 0 && level <= 5, 'FixedProbability: min level');
  else assert(level == 0, 'FixedProbability: unused level');
  if (gate == 2 || gate == 3) assert(!series.eligibilityPolicyId.equals(ZERO_BYTES) && !series.eligibilityScope.equals(ZERO_BYTES) && series.maxEligibleDraws.gt(ZERO), 'FixedProbability: signed gate');
  else assert(series.eligibilityPolicyId.equals(ZERO_BYTES) && series.eligibilityScope.equals(ZERO_BYTES) && series.maxEligibleDraws.equals(ZERO), 'FixedProbability: unused signed gate');
  const uriBytes = Bytes.fromUTF8(series.contentURI);
  assert(!series.contentHash.equals(ZERO_BYTES) && uriBytes.length > 0 && uriBytes.length <= 512, 'FixedProbability: content');
}
export function contains(values: BigInt[], value: BigInt): boolean {
  for (let i = 0; i < values.length; i++) if (values[i].equals(value)) return true;
  return false;
}
export function prizeForRoll(series: FixedProbabilitySeries, roll: i32): BigInt {
  assert(roll >= 0 && roll < 10000, 'FixedProbability: roll range');
  const weights = series.weights, prizes = series.prizeIds;
  let end = 0;
  for (let i = 0; i < weights.length; i++) { end += weights[i]; if (roll < end) return prizes[i]; }
  assert(false, 'FixedProbability: uncovered roll');
  return ZERO;
}
