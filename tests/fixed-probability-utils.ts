import { Address, BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { newMockEvent } from 'matchstick-as';
import { Approval, ApprovalForAll, CallbackIgnored, DrawSettled, EIP712DomainChanged, EligibilityConsumed, EligibilityScopeRegistered, OrderAccountingFinalized, OrderRequested, OrderSettled, PrizeClaimed, RandomnessStored, SeriesCreated, SeriesStatusChanged, Transfer } from '../generated/FixedProbabilityLottery/FixedProbabilityLottery';
export const LOTTERY = '0x51f8fff05d504d9e4f8e95276e12099feb357fef';
let nextLog: i32 = 0;
export function resetLogs(): void { nextLog = 0; }
export function mockApproval(owner: Address, approved: Address, tokenId: BigInt): Approval {
  const e = changetype<Approval>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('owner', ethereum.Value.fromAddress(owner)));
  e.parameters.push(new ethereum.EventParam('approved', ethereum.Value.fromAddress(approved)));
  e.parameters.push(new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)));
  return e;
}
export function mockApprovalForAll(owner: Address, operator: Address, approved: boolean): ApprovalForAll {
  const e = changetype<ApprovalForAll>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('owner', ethereum.Value.fromAddress(owner)));
  e.parameters.push(new ethereum.EventParam('operator', ethereum.Value.fromAddress(operator)));
  e.parameters.push(new ethereum.EventParam('approved', ethereum.Value.fromBoolean(approved)));
  return e;
}
export function mockCallbackIgnored(requestId: BigInt, reason: BigInt): CallbackIgnored {
  const e = changetype<CallbackIgnored>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('requestId', ethereum.Value.fromUnsignedBigInt(requestId)));
  e.parameters.push(new ethereum.EventParam('reason', ethereum.Value.fromUnsignedBigInt(reason)));
  return e;
}
export function mockDrawSettled(orderId: BigInt, drawId: BigInt, drawIndex: BigInt, roll: BigInt, prizeId: BigInt): DrawSettled {
  const e = changetype<DrawSettled>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('orderId', ethereum.Value.fromUnsignedBigInt(orderId)));
  e.parameters.push(new ethereum.EventParam('drawId', ethereum.Value.fromUnsignedBigInt(drawId)));
  e.parameters.push(new ethereum.EventParam('drawIndex', ethereum.Value.fromUnsignedBigInt(drawIndex)));
  e.parameters.push(new ethereum.EventParam('roll', ethereum.Value.fromUnsignedBigInt(roll)));
  e.parameters.push(new ethereum.EventParam('prizeId', ethereum.Value.fromUnsignedBigInt(prizeId)));
  return e;
}
export function mockEIP712DomainChanged(): EIP712DomainChanged {
  const e = changetype<EIP712DomainChanged>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  return e;
}
export function mockEligibilityConsumed(scope: Bytes, eligibilityKey: Bytes, orderId: BigInt, quantity: BigInt, usedAfter: BigInt): EligibilityConsumed {
  const e = changetype<EligibilityConsumed>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('scope', ethereum.Value.fromFixedBytes(scope)));
  e.parameters.push(new ethereum.EventParam('eligibilityKey', ethereum.Value.fromFixedBytes(eligibilityKey)));
  e.parameters.push(new ethereum.EventParam('orderId', ethereum.Value.fromUnsignedBigInt(orderId)));
  e.parameters.push(new ethereum.EventParam('quantity', ethereum.Value.fromUnsignedBigInt(quantity)));
  e.parameters.push(new ethereum.EventParam('usedAfter', ethereum.Value.fromUnsignedBigInt(usedAfter)));
  return e;
}
export function mockEligibilityScopeRegistered(scope: Bytes, policyId: Bytes, maxEligibleDraws: BigInt): EligibilityScopeRegistered {
  const e = changetype<EligibilityScopeRegistered>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('scope', ethereum.Value.fromFixedBytes(scope)));
  e.parameters.push(new ethereum.EventParam('policyId', ethereum.Value.fromFixedBytes(policyId)));
  e.parameters.push(new ethereum.EventParam('maxEligibleDraws', ethereum.Value.fromUnsignedBigInt(maxEligibleDraws)));
  return e;
}
export function mockOrderAccountingFinalized(orderId: BigInt, buyer: Address, membershipConsumptionId: Bytes, finalPointsConsumed: BigInt, refundPoints: BigInt, membershipRewardPoints: BigInt, previousLevel: BigInt, newLevel: BigInt, expiresAt: BigInt): OrderAccountingFinalized {
  const e = changetype<OrderAccountingFinalized>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('orderId', ethereum.Value.fromUnsignedBigInt(orderId)));
  e.parameters.push(new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)));
  e.parameters.push(new ethereum.EventParam('membershipConsumptionId', ethereum.Value.fromFixedBytes(membershipConsumptionId)));
  e.parameters.push(new ethereum.EventParam('finalPointsConsumed', ethereum.Value.fromUnsignedBigInt(finalPointsConsumed)));
  e.parameters.push(new ethereum.EventParam('refundPoints', ethereum.Value.fromUnsignedBigInt(refundPoints)));
  e.parameters.push(new ethereum.EventParam('membershipRewardPoints', ethereum.Value.fromUnsignedBigInt(membershipRewardPoints)));
  e.parameters.push(new ethereum.EventParam('previousLevel', ethereum.Value.fromUnsignedBigInt(previousLevel)));
  e.parameters.push(new ethereum.EventParam('newLevel', ethereum.Value.fromUnsignedBigInt(newLevel)));
  e.parameters.push(new ethereum.EventParam('expiresAt', ethereum.Value.fromUnsignedBigInt(expiresAt)));
  return e;
}
export function mockOrderRequested(orderId: BigInt, requestId: BigInt, buyer: Address, seriesId: BigInt, configHash: Bytes, authorizationId: Bytes, quantity: BigInt, firstDrawId: BigInt, grossPoints: BigInt, rebatePoints: BigInt, netPoints: BigInt, freeOrderChallenge: boolean, eligibilityKey: Bytes, levelAtRequest: BigInt, acceptedDrawsBefore: BigInt): OrderRequested {
  const e = changetype<OrderRequested>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('orderId', ethereum.Value.fromUnsignedBigInt(orderId)));
  e.parameters.push(new ethereum.EventParam('requestId', ethereum.Value.fromUnsignedBigInt(requestId)));
  e.parameters.push(new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)));
  e.parameters.push(new ethereum.EventParam('seriesId', ethereum.Value.fromUnsignedBigInt(seriesId)));
  e.parameters.push(new ethereum.EventParam('configHash', ethereum.Value.fromFixedBytes(configHash)));
  e.parameters.push(new ethereum.EventParam('authorizationId', ethereum.Value.fromFixedBytes(authorizationId)));
  e.parameters.push(new ethereum.EventParam('quantity', ethereum.Value.fromUnsignedBigInt(quantity)));
  e.parameters.push(new ethereum.EventParam('firstDrawId', ethereum.Value.fromUnsignedBigInt(firstDrawId)));
  e.parameters.push(new ethereum.EventParam('grossPoints', ethereum.Value.fromUnsignedBigInt(grossPoints)));
  e.parameters.push(new ethereum.EventParam('rebatePoints', ethereum.Value.fromUnsignedBigInt(rebatePoints)));
  e.parameters.push(new ethereum.EventParam('netPoints', ethereum.Value.fromUnsignedBigInt(netPoints)));
  e.parameters.push(new ethereum.EventParam('freeOrderChallenge', ethereum.Value.fromBoolean(freeOrderChallenge)));
  e.parameters.push(new ethereum.EventParam('eligibilityKey', ethereum.Value.fromFixedBytes(eligibilityKey)));
  e.parameters.push(new ethereum.EventParam('levelAtRequest', ethereum.Value.fromUnsignedBigInt(levelAtRequest)));
  e.parameters.push(new ethereum.EventParam('acceptedDrawsBefore', ethereum.Value.fromUnsignedBigInt(acceptedDrawsBefore)));
  return e;
}
export function mockOrderSettled(orderId: BigInt, freeOrderWon: boolean, firstTriggerIndex: BigInt, refundPoints: BigInt): OrderSettled {
  const e = changetype<OrderSettled>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('orderId', ethereum.Value.fromUnsignedBigInt(orderId)));
  e.parameters.push(new ethereum.EventParam('freeOrderWon', ethereum.Value.fromBoolean(freeOrderWon)));
  e.parameters.push(new ethereum.EventParam('firstTriggerIndex', ethereum.Value.fromUnsignedBigInt(firstTriggerIndex)));
  e.parameters.push(new ethereum.EventParam('refundPoints', ethereum.Value.fromUnsignedBigInt(refundPoints)));
  return e;
}
export function mockPrizeClaimed(orderId: BigInt, drawId: BigInt, buyer: Address, recipient: Address, tokenId: BigInt, seriesId: BigInt, prizeId: BigInt): PrizeClaimed {
  const e = changetype<PrizeClaimed>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('orderId', ethereum.Value.fromUnsignedBigInt(orderId)));
  e.parameters.push(new ethereum.EventParam('drawId', ethereum.Value.fromUnsignedBigInt(drawId)));
  e.parameters.push(new ethereum.EventParam('buyer', ethereum.Value.fromAddress(buyer)));
  e.parameters.push(new ethereum.EventParam('recipient', ethereum.Value.fromAddress(recipient)));
  e.parameters.push(new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)));
  e.parameters.push(new ethereum.EventParam('seriesId', ethereum.Value.fromUnsignedBigInt(seriesId)));
  e.parameters.push(new ethereum.EventParam('prizeId', ethereum.Value.fromUnsignedBigInt(prizeId)));
  return e;
}
export function mockRandomnessStored(orderId: BigInt, requestId: BigInt, randomWords: BigInt[]): RandomnessStored {
  const e = changetype<RandomnessStored>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('orderId', ethereum.Value.fromUnsignedBigInt(orderId)));
  e.parameters.push(new ethereum.EventParam('requestId', ethereum.Value.fromUnsignedBigInt(requestId)));
  e.parameters.push(new ethereum.EventParam('randomWords', ethereum.Value.fromUnsignedBigIntArray(randomWords)));
  return e;
}
export function mockSeriesCreated(seriesId: BigInt, configHash: Bytes, configData: Bytes): SeriesCreated {
  const e = changetype<SeriesCreated>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('seriesId', ethereum.Value.fromUnsignedBigInt(seriesId)));
  e.parameters.push(new ethereum.EventParam('configHash', ethereum.Value.fromFixedBytes(configHash)));
  e.parameters.push(new ethereum.EventParam('configData', ethereum.Value.fromBytes(configData)));
  return e;
}
export function mockSeriesStatusChanged(seriesId: BigInt, previousStatus: BigInt, nextStatus: BigInt): SeriesStatusChanged {
  const e = changetype<SeriesStatusChanged>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('seriesId', ethereum.Value.fromUnsignedBigInt(seriesId)));
  e.parameters.push(new ethereum.EventParam('previousStatus', ethereum.Value.fromUnsignedBigInt(previousStatus)));
  e.parameters.push(new ethereum.EventParam('nextStatus', ethereum.Value.fromUnsignedBigInt(nextStatus)));
  return e;
}
export function mockTransfer(from: Address, to: Address, tokenId: BigInt): Transfer {
  const e = changetype<Transfer>(newMockEvent());
  e.address = Address.fromString(LOTTERY); e.logIndex = BigInt.fromI32(nextLog++);
  e.block.number = BigInt.fromI32(312597200); e.parameters = [];
  e.parameters.push(new ethereum.EventParam('from', ethereum.Value.fromAddress(from)));
  e.parameters.push(new ethereum.EventParam('to', ethereum.Value.fromAddress(to)));
  e.parameters.push(new ethereum.EventParam('tokenId', ethereum.Value.fromUnsignedBigInt(tokenId)));
  return e;
}
