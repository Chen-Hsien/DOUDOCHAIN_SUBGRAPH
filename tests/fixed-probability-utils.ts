import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import {
  DrawSettled,
  EligibilityConsumed,
  EligibilityScopeRegistered,
  OrderAccountingFinalized,
  OrderRequested,
  OrderSettled,
  RandomnessStored,
  SeriesCreated,
  SeriesStatusChanged,
  Transfer,
  UpdateTicketStatus,
} from '../generated/FixedProbabilityLottery/FixedProbabilityLottery';

export const LOTTERY = '0x51f8fff05d504d9e4f8e95276e12099feb357fef';
let nextLog: i32 = 0;
export function resetLogs(): void { nextLog = 0; }

function event<T>(): T {
  const e = changetype<ethereum.Event>(newMockEvent());
  e.address = Address.fromString(LOTTERY);
  e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200);
  e.parameters = [];
  return changetype<T>(e);
}
function uint(name: string, value: BigInt): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromUnsignedBigInt(value));
}
function bytes(name: string, value: Bytes): ethereum.EventParam {
  return new ethereum.EventParam(name, ethereum.Value.fromFixedBytes(value));
}

export function mockEligibilityScopeRegistered(scope: Bytes, policyId: Bytes, maxEligibleDraws: BigInt): EligibilityScopeRegistered {
  const e = event<EligibilityScopeRegistered>();
  e.parameters.push(bytes('scope', scope));
  e.parameters.push(bytes('policyId', policyId));
  e.parameters.push(uint('maxEligibleDraws', maxEligibleDraws));
  return e;
}
export function mockEligibilityConsumed(scope: Bytes, eligibilityKey: Bytes, orderId: BigInt, quantity: BigInt, usedAfter: BigInt): EligibilityConsumed {
  const e = event<EligibilityConsumed>();
  e.parameters.push(bytes('scope', scope));
  e.parameters.push(bytes('eligibilityKey', eligibilityKey));
  e.parameters.push(uint('orderId', orderId));
  e.parameters.push(uint('quantity', quantity));
  e.parameters.push(uint('usedAfter', usedAfter));
  return e;
}
export function mockSeriesCreated(seriesId: BigInt, configHash: Bytes, configData: Bytes): SeriesCreated {
  const e = event<SeriesCreated>();
  e.parameters.push(uint('seriesId', seriesId));
  e.parameters.push(bytes('configHash', configHash));
  e.parameters.push(new ethereum.EventParam('configData', ethereum.Value.fromBytes(configData)));
  return e;
}
export function mockSeriesStatusChanged(seriesId: BigInt, previousStatus: BigInt, nextStatus: BigInt): SeriesStatusChanged {
  const e = event<SeriesStatusChanged>();
  e.parameters.push(uint('seriesId', seriesId));
  e.parameters.push(uint('previousStatus', previousStatus));
  e.parameters.push(uint('nextStatus', nextStatus));
  return e;
}
export function mockOrderRequested(orderId: BigInt, requestId: BigInt, buyer: Address, seriesId: BigInt, configHash: Bytes, authorizationId: Bytes, quantity: BigInt, firstDrawId: BigInt, grossPoints: BigInt, rebatePoints: BigInt, netPoints: BigInt, freeOrderChallenge: boolean, eligibilityKey: Bytes, levelAtRequest: BigInt, acceptedDrawsBefore: BigInt): OrderRequested {
  const e = event<OrderRequested>();
  e.parameters.push(uint('orderId', orderId));
  e.parameters.push(uint('requestId', requestId));
  e.parameters.push(new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)));
  e.parameters.push(uint('seriesId', seriesId));
  e.parameters.push(bytes('configHash', configHash));
  e.parameters.push(bytes('authorizationId', authorizationId));
  e.parameters.push(uint('quantity', quantity));
  e.parameters.push(uint('firstDrawId', firstDrawId));
  e.parameters.push(uint('grossPoints', grossPoints));
  e.parameters.push(uint('rebatePoints', rebatePoints));
  e.parameters.push(uint('netPoints', netPoints));
  e.parameters.push(new ethereum.EventParam('freeOrderChallenge', ethereum.Value.fromBoolean(freeOrderChallenge)));
  e.parameters.push(bytes('eligibilityKey', eligibilityKey));
  e.parameters.push(uint('levelAtRequest', levelAtRequest));
  e.parameters.push(uint('acceptedDrawsBefore', acceptedDrawsBefore));
  return e;
}
export function mockTransfer(from: Address, to: Address, tokenId: BigInt): Transfer {
  const e = event<Transfer>();
  e.parameters.push(new ethereum.EventParam('from', ethereum.Value.fromAddress(from)));
  e.parameters.push(new ethereum.EventParam('to', ethereum.Value.fromAddress(to)));
  e.parameters.push(uint('tokenId', tokenId));
  return e;
}
export function mockRandomnessStored(orderId: BigInt, requestId: BigInt, randomWords: BigInt[]): RandomnessStored {
  const e = event<RandomnessStored>();
  e.parameters.push(uint('orderId', orderId));
  e.parameters.push(uint('requestId', requestId));
  e.parameters.push(new ethereum.EventParam('randomWords', ethereum.Value.fromUnsignedBigIntArray(randomWords)));
  return e;
}
export function mockDrawSettled(orderId: BigInt, drawId: BigInt, drawIndex: BigInt, roll: BigInt, prizeId: BigInt): DrawSettled {
  const e = event<DrawSettled>();
  e.parameters.push(uint('orderId', orderId));
  e.parameters.push(uint('drawId', drawId));
  e.parameters.push(uint('drawIndex', drawIndex));
  e.parameters.push(uint('roll', roll));
  e.parameters.push(uint('prizeId', prizeId));
  return e;
}
export function mockOrderSettled(orderId: BigInt, freeOrderWon: boolean, firstTriggerIndex: BigInt, refundPoints: BigInt): OrderSettled {
  const e = event<OrderSettled>();
  e.parameters.push(uint('orderId', orderId));
  e.parameters.push(new ethereum.EventParam('freeOrderWon', ethereum.Value.fromBoolean(freeOrderWon)));
  e.parameters.push(uint('firstTriggerIndex', firstTriggerIndex));
  e.parameters.push(uint('refundPoints', refundPoints));
  return e;
}
export function mockOrderAccountingFinalized(orderId: BigInt, buyer: Address, membershipConsumptionId: Bytes, finalPointsConsumed: BigInt, refundPoints: BigInt, membershipRewardPoints: BigInt, previousLevel: BigInt, newLevel: BigInt, expiresAt: BigInt): OrderAccountingFinalized {
  const e = event<OrderAccountingFinalized>();
  e.parameters.push(uint('orderId', orderId));
  e.parameters.push(new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)));
  e.parameters.push(bytes('membershipConsumptionId', membershipConsumptionId));
  e.parameters.push(uint('finalPointsConsumed', finalPointsConsumed));
  e.parameters.push(uint('refundPoints', refundPoints));
  e.parameters.push(uint('membershipRewardPoints', membershipRewardPoints));
  e.parameters.push(uint('previousLevel', previousLevel));
  e.parameters.push(uint('newLevel', newLevel));
  e.parameters.push(uint('expiresAt', expiresAt));
  return e;
}
export function mockUpdateTicketStatus(tokenID: BigInt, seriesID: BigInt, prizeId: BigInt, exchanged: boolean, revealed: boolean): UpdateTicketStatus {
  const e = event<UpdateTicketStatus>();
  e.parameters.push(uint('tokenID', tokenID));
  e.parameters.push(uint('seriesID', seriesID));
  e.parameters.push(uint('tokenRevealedPrize', prizeId));
  e.parameters.push(new ethereum.EventParam('tokenExchange', ethereum.Value.fromBoolean(exchanged)));
  e.parameters.push(new ethereum.EventParam('tokenRevealed', ethereum.Value.fromBoolean(revealed)));
  return e;
}
