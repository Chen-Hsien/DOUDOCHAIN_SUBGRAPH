import { Address, BigInt, ethereum, store } from '@graphprotocol/graph-ts';
import {
  Approval, ApprovalForAll, DrawSettled,
  EligibilityConsumed, EligibilityScopeRegistered, OrderAccountingFinalized,
  OrderRequested, OrderSettled, RandomnessStored, SeriesCreated,
  SeriesStatusChanged, Transfer, UpdateTicketStatus,
} from '../generated/FixedProbabilityLottery/FixedProbabilityLottery';
import {
  FixedProbabilitySeries, FixedProbabilityPrize, FixedProbabilityOrder,
  FixedProbabilityRequest, FixedProbabilityDraw, FixedProbabilityNFT,
  FixedProbabilityEligibilityScope, FixedProbabilityEligibilityUsage,
  FixedProbabilityEligibilityConsumption, FixedProbabilityPendingEligibility,
} from '../generated/schema';
import { audit, deploymentId, entityId, eventId, scopeId, uintKey, ZERO, ZERO_BYTES, UINT_MAX } from './fixed-probability-ids';
import { contains, decodeConfig, prizeForRoll } from './fixed-probability-config';

function orderAt(e: ethereum.Event, id: BigInt): FixedProbabilityOrder {
  const order = FixedProbabilityOrder.load(entityId(e, 'order', id));
  assert(order != null, 'FixedProbability: missing order');
  return order!;
}
function orderByEntityId(id: string): FixedProbabilityOrder {
  const order = FixedProbabilityOrder.load(id);
  assert(order != null, 'FixedProbability: missing order');
  return order!;
}
function seriesAt(id: string): FixedProbabilitySeries {
  const series = FixedProbabilitySeries.load(id);
  assert(series != null, 'FixedProbability: missing series');
  return series!;
}
function drawAt(e: ethereum.Event, id: BigInt): FixedProbabilityDraw {
  const draw = FixedProbabilityDraw.load(entityId(e, 'draw', id));
  assert(draw != null, 'FixedProbability: missing draw');
  return draw!;
}
function statusName(value: i32): string {
  assert(value > 0 && value <= 4, 'FixedProbability: invalid series status');
  return ['NONE', 'DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'][value];
}
export function handleSeriesCreated(e: SeriesCreated): void {
  if (!audit(e, 'SeriesCreated')) return;
  const p = e.params, id = entityId(e, 'series', p.seriesId);
  assert(p.seriesId.gt(ZERO) && FixedProbabilitySeries.load(id) == null, 'FixedProbability: duplicate series');
  const s = new FixedProbabilitySeries(id);
  s.deployment = deploymentId(e); s.seriesId = p.seriesId; s.configHash = p.configHash;
  decodeConfig(s, p.configData);
  if (s.gateMode == 2 || s.gateMode == 3) {
    const scope = FixedProbabilityEligibilityScope.load(scopeId(e, s.eligibilityScope));
    assert(scope != null, 'FixedProbability: missing scope');
    assert(scope!.policyId.equals(s.eligibilityPolicyId) && scope!.maxEligibleDraws.equals(s.maxEligibleDraws), 'FixedProbability: scope conflict');
  }
  s.status = 'DRAFT'; s.acceptedDraws = ZERO;
  s.createdEvent = eventId(e); s.updatedEvent = eventId(e); s.save();
  const ids = s.prizeIds, weights = s.weights;
  let start = 0;
  for (let i = 0; i < ids.length; i++) {
    const prize = new FixedProbabilityPrize(id + ':prize:' + uintKey(ids[i]));
    prize.series = id; prize.prizeId = ids[i]; prize.prizeIndex = i;
    prize.weight = weights[i]; prize.intervalStart = start;
    start += weights[i]; prize.intervalEndExclusive = start; prize.save();
  }
}
export function handleSeriesStatusChanged(e: SeriesStatusChanged): void {
  if (!audit(e, 'SeriesStatusChanged')) return;
  const p = e.params, s = seriesAt(entityId(e, 'series', p.seriesId));
  if (p.previousStatus == 0) {
    // createSeries emits SeriesCreated, then NONE -> DRAFT in the same transaction.
    assert(p.nextStatus == 1 && s.status == 'DRAFT' && s.updatedEvent == s.createdEvent,
      'FixedProbability: invalid initialization');
  } else {
    assert(s.status == statusName(p.previousStatus), 'FixedProbability: previous status mismatch');
    // Match setSeriesStatus: NONE, CLOSED and unchanged transitions are rejected on-chain.
    assert(p.previousStatus < 4 && p.nextStatus > 0 && p.nextStatus <= 4 && p.previousStatus != p.nextStatus,
      'FixedProbability: invalid status transition');
  }
  s.status = statusName(p.nextStatus); s.updatedEvent = eventId(e); s.save();
}
export function handleEligibilityScopeRegistered(e: EligibilityScopeRegistered): void {
  if (!audit(e, 'EligibilityScopeRegistered')) return;
  const p = e.params, id = scopeId(e, p.scope);
  assert(!p.scope.equals(ZERO_BYTES) && !p.policyId.equals(ZERO_BYTES) && p.maxEligibleDraws.gt(ZERO), 'FixedProbability: invalid scope');
  assert(FixedProbabilityEligibilityScope.load(id) == null, 'FixedProbability: scope registered twice');
  const s = new FixedProbabilityEligibilityScope(id);
  s.deployment = deploymentId(e); s.scope = p.scope;
  s.policyId = p.policyId; s.maxEligibleDraws = p.maxEligibleDraws; s.save();
}
export function handleEligibilityConsumed(e: EligibilityConsumed): void {
  if (!audit(e, 'EligibilityConsumed')) return;
  const p = e.params, scopeKey = scopeId(e, p.scope);
  const scope = FixedProbabilityEligibilityScope.load(scopeKey);
  assert(scope != null && !p.eligibilityKey.equals(ZERO_BYTES), 'FixedProbability: missing scope/key');
  assert(p.quantity > 0 && p.quantity <= 10 && p.orderId.gt(ZERO), 'FixedProbability: consumption quantity');
  const usageId = scopeKey + ':key:' + p.eligibilityKey.toHexString();
  let usage = FixedProbabilityEligibilityUsage.load(usageId);
  if (usage == null) {
    usage = new FixedProbabilityEligibilityUsage(usageId);
    usage.scope = scopeKey; usage.eligibilityKey = p.eligibilityKey; usage.usedDraws = ZERO;
  }
  assert(p.usedAfter.equals(usage.usedDraws.plus(BigInt.fromI32(p.quantity))) && p.usedAfter.le(scope!.maxEligibleDraws), 'FixedProbability: usage mismatch');
  usage.usedDraws = p.usedAfter; usage.updatedEvent = eventId(e); usage.save();
  const c = new FixedProbabilityEligibilityConsumption(eventId(e));
  c.orderLocalId = p.orderId; c.scope = scopeKey; c.eligibilityKey = p.eligibilityKey;
  c.quantity = p.quantity; c.usedAfter = p.usedAfter; c.event = eventId(e); c.save();
  const id = entityId(e, 'order', p.orderId);
  assert(FixedProbabilityPendingEligibility.load(id) == null && FixedProbabilityOrder.load(id) == null, 'FixedProbability: duplicate consumption');
  const pending = new FixedProbabilityPendingEligibility(id);
  pending.consumption = c.id; pending.transactionHash = e.transaction.hash; pending.save();
}
export function handleOrderRequested(e: OrderRequested): void {
  if (!audit(e, 'OrderRequested')) return;
  const p = e.params, id = entityId(e, 'order', p.orderId);
  const s = seriesAt(entityId(e, 'series', p.seriesId));
  assert(p.orderId.gt(ZERO) && FixedProbabilityOrder.load(id) == null && s.status == 'ACTIVE', 'FixedProbability: invalid request');
  assert(p.quantity > 0 && p.quantity <= s.maxBatchSize && p.firstDrawId.gt(ZERO), 'FixedProbability: invalid quantity');
  assert(p.configHash.equals(s.configHash) && p.acceptedDrawsBefore.equals(s.acceptedDraws), 'FixedProbability: request config/counter');
  const after = s.acceptedDraws.plus(BigInt.fromI32(p.quantity));
  assert(after.le(UINT_MAX) && (s.drawCap.equals(ZERO) || after.le(s.drawCap)), 'FixedProbability: draw cap');
  const gross = s.pricePoints.times(BigInt.fromI32(p.quantity));
  let rebate = ZERO;
  const quantities = s.discountQuantities, discounts = s.discountPoints;
  for (let i = 0; i < quantities.length; i++) if (p.quantity >= quantities[i]) rebate = discounts[i];
  assert(gross.le(UINT_MAX) && p.grossPoints.equals(gross) && p.rebatePoints.equals(rebate) && p.netPoints.equals(gross.minus(rebate)), 'FixedProbability: quote mismatch');
  if (p.freeOrderChallenge) assert(p.netPoints.gt(ZERO) && (s.freeOrderMode == 2 || (s.freeOrderMode == 1 && after.le(s.freeOrderFirstDraws))), 'FixedProbability: challenge window');
  if (s.gateMode == 1 || s.gateMode == 3) assert(p.levelAtRequest >= s.minMemberLevel && p.levelAtRequest <= 5, 'FixedProbability: membership gate');
  const pending = FixedProbabilityPendingEligibility.load(id);
  if (s.gateMode == 2 || s.gateMode == 3) {
    assert(pending != null && pending!.transactionHash.equals(e.transaction.hash), 'FixedProbability: missing earlier consumption');
    const consumption = FixedProbabilityEligibilityConsumption.load(pending!.consumption)!;
    assert(consumption.orderLocalId.equals(p.orderId) && consumption.quantity == p.quantity && consumption.eligibilityKey.equals(p.eligibilityKey) && consumption.scope == scopeId(e, s.eligibilityScope), 'FixedProbability: consumption binding');
    consumption.order = id; consumption.save(); store.remove('FixedProbabilityPendingEligibility', id);
  } else assert(pending == null && p.eligibilityKey.equals(ZERO_BYTES), 'FixedProbability: unexpected consumption');
  const o = new FixedProbabilityOrder(id);
  o.deployment = deploymentId(e); o.orderId = p.orderId; o.series = s.id;
  o.buyer = p.buyer; o.authorizationId = p.authorizationId; o.configHash = p.configHash;
  o.requestId = p.requestId; o.quantity = p.quantity; o.firstDrawId = p.firstDrawId;
  o.grossPoints = p.grossPoints; o.rebatePoints = p.rebatePoints; o.netPoints = p.netPoints;
  o.freeOrderChallenge = p.freeOrderChallenge; o.eligibilityKey = p.eligibilityKey;
  o.levelAtRequest = p.levelAtRequest; o.acceptedDrawsBefore = p.acceptedDrawsBefore;
  o.state = 'PENDING'; o.randomWords = []; o.accountingFinalized = false; o.claimedCount = 0;
  o.createdEvent = eventId(e); o.updatedEvent = eventId(e); o.save();
  const requestId = entityId(e, 'request', p.requestId);
  assert(p.requestId.gt(ZERO) && FixedProbabilityRequest.load(requestId) == null, 'FixedProbability: duplicate request');
  const request = new FixedProbabilityRequest(requestId);
  request.requestId = p.requestId; request.order = id; request.save();
  for (let i = 0; i < p.quantity; i++) {
    const drawId = p.firstDrawId.plus(BigInt.fromI32(i));
    const drawKey = entityId(e, 'draw', drawId);
    assert(FixedProbabilityDraw.load(drawKey) == null, 'FixedProbability: duplicate draw');
    const draw = new FixedProbabilityDraw(drawKey);
    draw.deployment = deploymentId(e); draw.drawId = drawId; draw.order = id;
    draw.drawIndex = i; draw.settled = false; draw.claimed = false; draw.save();
  }
  s.acceptedDraws = after; s.updatedEvent = eventId(e); s.save();
}
export function handleRandomnessStored(e: RandomnessStored): void {
  if (!audit(e, 'RandomnessStored')) return;
  const p = e.params, o = orderAt(e, p.orderId);
  const request = FixedProbabilityRequest.load(entityId(e, 'request', p.requestId));
  assert(request != null && request!.order == o.id && p.requestId.equals(o.requestId), 'FixedProbability: request binding');
  assert(o.state == 'PENDING' && p.randomWords.length == o.quantity, 'FixedProbability: invalid randomness');
  o.randomWords = p.randomWords; o.state = 'RANDOM_READY';
  o.randomnessEvent = eventId(e); o.updatedEvent = eventId(e); o.save();
}
export function handleDrawSettled(e: DrawSettled): void {
  if (!audit(e, 'DrawSettled')) return;
  const p = e.params, o = orderAt(e, p.orderId), d = drawAt(e, p.drawId);
  assert(o.state == 'RANDOM_READY', 'FixedProbability: order is not ready');
  assert(!d.settled && d.claimed, 'FixedProbability: invalid draw settlement');
  assert(d.nft != null, 'FixedProbability: draw NFT is missing');
  assert(d.order == o.id, 'FixedProbability: draw order mismatch');
  assert(p.drawIndex >= 0 && p.drawIndex < o.quantity && d.drawIndex == p.drawIndex && p.drawId.equals(o.firstDrawId.plus(BigInt.fromI32(p.drawIndex))), 'FixedProbability: draw index');
  const roll = o.randomWords[p.drawIndex].mod(BigInt.fromI32(10000)).toI32();
  const expectedPrize = prizeForRoll(seriesAt(o.series), roll);
  const observedRoll = p.roll.toI32();
  assert(observedRoll == roll, 'FixedProbability: incorrect roll');
  assert(p.prizeId.equals(expectedPrize), 'FixedProbability: incorrect prize');
  d.settled = true; d.roll = observedRoll; d.prizeId = p.prizeId; d.settledEvent = eventId(e); d.save();
}
export function handleOrderSettled(e: OrderSettled): void {
  if (!audit(e, 'OrderSettled')) return;
  const p = e.params, o = orderAt(e, p.orderId), s = seriesAt(o.series);
  assert(o.state == 'RANDOM_READY', 'FixedProbability: invalid order settlement');
  let first = 65535;
  for (let i = 0; i < o.quantity; i++) {
    const d = drawAt(e, o.firstDrawId.plus(BigInt.fromI32(i)));
    assert(d.settled && d.order == o.id, 'FixedProbability: incomplete settlement');
    if (first == 65535 && o.freeOrderChallenge && contains(s.freeOrderPrizeIds, d.prizeId!)) first = i;
  }
  const won = first != 65535, refund = won ? o.netPoints : ZERO;
  assert(p.freeOrderWon == won && p.firstTriggerIndex == first && p.refundPoints.equals(refund), 'FixedProbability: incorrect refund');
  o.freeOrderWon = won; o.firstTriggerIndex = first; o.refundPoints = refund;
  o.finalPointsConsumed = o.netPoints.minus(refund); o.state = 'SETTLED';
  o.settledEvent = eventId(e); o.updatedEvent = eventId(e); o.save();
}
export function handleOrderAccountingFinalized(e: OrderAccountingFinalized): void {
  if (!audit(e, 'OrderAccountingFinalized')) return;
  const p = e.params, o = orderAt(e, p.orderId);
  assert(o.state == 'SETTLED' && !o.accountingFinalized, 'FixedProbability: invalid accounting');
  assert(p.buyer.equals(o.buyer) && p.refundPoints.equals(o.refundPoints!) && p.finalPointsConsumed.equals(o.finalPointsConsumed!), 'FixedProbability: accounting binding');
  assert(p.membershipRewardPoints.le(p.finalPointsConsumed) && p.previousLevel <= 5 && p.newLevel <= 5, 'FixedProbability: membership response');
  if (p.finalPointsConsumed.equals(ZERO)) assert(p.membershipRewardPoints.equals(ZERO), 'FixedProbability: refunded reward');
  if (o.netPoints.equals(ZERO)) assert(p.previousLevel == 0 && p.newLevel == 0 && p.expiresAt.equals(ZERO), 'FixedProbability: free consumption snapshot');
  o.accountingFinalized = true; o.membershipConsumptionId = p.membershipConsumptionId;
  o.observedMembershipRewardPoints = p.membershipRewardPoints;
  o.previousLevel = p.previousLevel; o.newLevel = p.newLevel; o.expiresAt = p.expiresAt;
  o.accountingEvent = eventId(e); o.updatedEvent = eventId(e); o.save();
  // MembershipV2Member is owned by the existing membership template. Never increment it here.
}
export function handleTransfer(e: Transfer): void {
  if (!audit(e, 'Transfer')) return;
  const p = e.params, d = drawAt(e, p.tokenId), id = entityId(e, 'nft', p.tokenId);
  assert(!p.to.equals(Address.zero()), 'FixedProbability: burned NFT');
  let nft = FixedProbabilityNFT.load(id);
  if (p.from.equals(Address.zero())) {
    assert(nft == null && !d.claimed && !d.settled, 'FixedProbability: duplicate/late mint');
    nft = new FixedProbabilityNFT(id); nft.deployment = deploymentId(e); nft.tokenId = p.tokenId;
    nft.draw = d.id; nft.mintRecipient = p.to; nft.claimRecipient = p.to;
    nft.mintEvent = eventId(e); nft.claimEvent = eventId(e); nft.exchanged = false;
    d.claimed = true; d.initialRecipient = p.to; d.nft = id; d.claimEvent = eventId(e); d.save();
    const order = orderByEntityId(d.order);
    order.claimedCount += 1; assert(order.claimedCount <= order.quantity, 'FixedProbability: mint count');
    order.updatedEvent = eventId(e); order.save();
  } else {
    assert(nft != null && nft!.currentOwner.equals(p.from), 'FixedProbability: transfer owner mismatch');
  }
  nft!.currentOwner = p.to; nft!.lastTransferEvent = eventId(e); nft!.save();
}
export function handleUpdateTicketStatus(e: UpdateTicketStatus): void {
  if (!audit(e, 'UpdateTicketStatus')) return;
  const p = e.params, d = drawAt(e, p.tokenID);
  const order = orderByEntityId(d.order);
  assert(p.seriesID.equals(seriesAt(order.series).seriesId), 'FixedProbability: ticket series mismatch');
  if (p.tokenRevealed) {
    assert(d.settled, 'FixedProbability: ticket reveal before settlement');
    assert(p.tokenRevealedPrize.equals(d.prizeId!), 'FixedProbability: reveal mismatch');
  }
  const nft = FixedProbabilityNFT.load(entityId(e, 'nft', p.tokenID));
  assert(nft != null, 'FixedProbability: missing NFT');
  if (p.tokenExchange) nft!.exchanged = true;
  nft!.save();
}
export function handleApproval(e: Approval): void { audit(e, 'Approval'); }
export function handleApprovalForAll(e: ApprovalForAll): void { audit(e, 'ApprovalForAll'); }
