import { BigInt, Bytes, ethereum } from '@graphprotocol/graph-ts';
import { DatabasePointsPurchaseMintV2 } from '../generated/schema';

// Both contracts emit the same V2 ABI; transaction log IDs remain unique across modes.
export function saveCouponPurchase(event: ethereum.Event, sourceMode: string): void {
  const p = event.parameters;
  assert(p.length == 15, 'Coupon purchase: invalid event shape');
  const entity = new DatabasePointsPurchaseMintV2(event.transaction.hash.concatI32(event.logIndex.toI32()));
  entity.contractAddress = event.address;
  entity.sourceMode = sourceMode;
  entity.authorizationId = p[0].value.toBytes();
  entity.seriesID = p[1].value.toBigInt();
  entity.buyer = p[2].value.toAddress();
  entity.ticketQuantity = p[3].value.toBigInt();
  entity.grossPoints = p[4].value.toBigInt();
  entity.rebatePoints = p[5].value.toBigInt();
  entity.netPointsConsumed = p[6].value.toBigInt();
  entity.membershipRewardPoints = p[7].value.toBigInt();
  entity.revealImmediately = p[8].value.toBoolean();
  entity.freeOrderChallenge = p[9].value.toBoolean();
  entity.firstTokenID = p[10].value.toBigInt();
  entity.challengeRequestId = p[11].value.toBigInt();
  entity.couponDiscount = p[12].value.toBigInt();
  entity.pricingSnapshotHash = p[13].value.toBytes();
  entity.pricingVersion = p[14].value.toBigInt();
  const unit = BigInt.fromString('1000000000000000000');
  assert(entity.pricingVersion.equals(BigInt.fromI32(2)) && !entity.pricingSnapshotHash.equals(Bytes.fromHexString('0x0000000000000000000000000000000000000000000000000000000000000000')), 'Coupon purchase: invalid version/snapshot');
  assert(entity.rebatePoints.le(entity.grossPoints), 'Coupon purchase: invalid rebate');
  assert(entity.couponDiscount.gt(BigInt.zero()) && entity.couponDiscount.mod(unit).equals(BigInt.zero()) && entity.couponDiscount.le(entity.grossPoints.minus(entity.rebatePoints)), 'Coupon purchase: invalid discount');
  entity.debitNowPoints = entity.grossPoints.minus(entity.couponDiscount);
  assert(entity.netPointsConsumed.equals(entity.debitNowPoints.minus(entity.rebatePoints)) && entity.netPointsConsumed.ge(unit), 'Coupon purchase: invalid net');
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
