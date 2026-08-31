import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  MembershipConsumptionRecorded as MembershipConsumptionRecordedEvent,
  MembershipConsumptionReversed as MembershipConsumptionReversedEvent,
  MembershipExpired as MembershipExpiredEvent,
  MembershipMigrated as MembershipMigratedEvent,
  MembershipRestored as MembershipRestoredEvent,
} from "../generated/templates/DoudoMembershipV2/DoudoMembershipV2Upgradeable";
import {
  MembershipV2Consumption,
  MembershipV2Expiration,
  MembershipV2Member,
  MembershipV2Migration,
  MembershipV2Reversal,
  MembershipV2Restoration,
} from "../generated/schema";

function eventId(transactionHash: Bytes, logIndex: BigInt): Bytes {
  return transactionHash.concatI32(logIndex.toI32());
}

export function handleMembershipConsumptionReversed(
  event: MembershipConsumptionReversedEvent,
): void {
  let member = MembershipV2Member.load(event.params.wallet);
  if (member == null) {
    member = new MembershipV2Member(event.params.wallet);
    member.wallet = event.params.wallet;
    member.tokenId = event.params.tokenId;
    member.lastActivityAt = BigInt.zero();
    member.expiresAt = BigInt.zero();
  }
  member.level = event.params.newLevel;
  member.currentQualifyingSpend = event.params.currentQualifyingSpend;
  member.lifetimeSpend = event.params.lifetimeSpend;
  member.updatedAt = event.block.timestamp;
  member.transactionHash = event.transaction.hash;
  member.save();

  let entity = new MembershipV2Reversal(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.reversalId = event.params.reversalId;
  entity.wallet = event.params.wallet;
  entity.tokenId = event.params.tokenId;
  entity.pointsReversed = event.params.pointsReversed;
  entity.previousLevel = event.params.previousLevel;
  entity.newLevel = event.params.newLevel;
  entity.currentQualifyingSpend = event.params.currentQualifyingSpend;
  entity.lifetimeSpend = event.params.lifetimeSpend;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipConsumptionRecorded(
  event: MembershipConsumptionRecordedEvent,
): void {
  let member = new MembershipV2Member(event.params.wallet);
  member.wallet = event.params.wallet;
  member.tokenId = event.params.tokenId;
  member.level = event.params.newLevel;
  member.currentQualifyingSpend = event.params.currentQualifyingSpend;
  member.lifetimeSpend = event.params.lifetimeSpend;
  member.lastActivityAt = event.params.lastActivityAt;
  member.expiresAt = event.params.expiresAt;
  member.updatedAt = event.block.timestamp;
  member.transactionHash = event.transaction.hash;
  member.save();

  let entity = new MembershipV2Consumption(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.authorizationId = event.params.authorizationId;
  entity.wallet = event.params.wallet;
  entity.tokenId = event.params.tokenId;
  entity.pointsConsumed = event.params.pointsConsumed;
  entity.rewardPoints = event.params.rewardPoints;
  entity.previousLevel = event.params.previousLevel;
  entity.newLevel = event.params.newLevel;
  entity.currentQualifyingSpend = event.params.currentQualifyingSpend;
  entity.lifetimeSpend = event.params.lifetimeSpend;
  entity.lastActivityAt = event.params.lastActivityAt;
  entity.expiresAt = event.params.expiresAt;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipExpired(event: MembershipExpiredEvent): void {
  let member = MembershipV2Member.load(event.params.wallet);
  if (member == null) {
    member = new MembershipV2Member(event.params.wallet);
    member.wallet = event.params.wallet;
    member.tokenId = event.params.tokenId;
    member.lastActivityAt = event.params.expiredAt;
  }
  member.level = 0;
  member.currentQualifyingSpend = BigInt.zero();
  member.lifetimeSpend = event.params.lifetimeSpend;
  member.expiresAt = event.params.expiredAt;
  member.updatedAt = event.block.timestamp;
  member.transactionHash = event.transaction.hash;
  member.save();

  let entity = new MembershipV2Expiration(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.wallet = event.params.wallet;
  entity.tokenId = event.params.tokenId;
  entity.previousLevel = event.params.previousLevel;
  entity.lifetimeSpend = event.params.lifetimeSpend;
  entity.expiredAt = event.params.expiredAt;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipRestored(event: MembershipRestoredEvent): void {
  let member = new MembershipV2Member(event.params.wallet);
  member.wallet = event.params.wallet;
  member.tokenId = event.params.tokenId;
  member.level = event.params.level;
  member.currentQualifyingSpend = event.params.currentQualifyingSpend;
  member.lifetimeSpend = event.params.lifetimeSpend;
  member.lastActivityAt = event.params.lastActivityAt;
  member.expiresAt = event.params.expiresAt;
  member.updatedAt = event.block.timestamp;
  member.transactionHash = event.transaction.hash;
  member.save();

  let entity = new MembershipV2Restoration(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.caseId = event.params.caseId;
  entity.wallet = event.params.wallet;
  entity.tokenId = event.params.tokenId;
  entity.level = event.params.level;
  entity.currentQualifyingSpend = event.params.currentQualifyingSpend;
  entity.lifetimeSpend = event.params.lifetimeSpend;
  entity.lastActivityAt = event.params.lastActivityAt;
  entity.expiresAt = event.params.expiresAt;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipMigrated(event: MembershipMigratedEvent): void {
  let previous = MembershipV2Member.load(event.params.from);
  if (previous != null) {
    previous.migratedTo = event.params.to;
    previous.updatedAt = event.block.timestamp;
    previous.transactionHash = event.transaction.hash;
    previous.save();
  }

  let member = new MembershipV2Member(event.params.to);
  member.wallet = event.params.to;
  member.tokenId = event.params.newTokenId;
  member.level = event.params.level;
  member.currentQualifyingSpend = event.params.currentQualifyingSpend;
  member.lifetimeSpend = event.params.lifetimeSpend;
  member.lastActivityAt = event.params.lastActivityAt;
  member.expiresAt = event.params.expiresAt;
  member.updatedAt = event.block.timestamp;
  member.transactionHash = event.transaction.hash;
  member.save();

  let entity = new MembershipV2Migration(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.caseId = event.params.caseId;
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.oldTokenId = event.params.oldTokenId;
  entity.newTokenId = event.params.newTokenId;
  entity.level = event.params.level;
  entity.currentQualifyingSpend = event.params.currentQualifyingSpend;
  entity.lifetimeSpend = event.params.lifetimeSpend;
  entity.lastActivityAt = event.params.lastActivityAt;
  entity.expiresAt = event.params.expiresAt;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
