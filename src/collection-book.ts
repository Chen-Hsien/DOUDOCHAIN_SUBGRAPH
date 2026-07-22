import {
  CollectionBookClaimed as CollectionBookClaimedEvent,
  CollectionBookCreated as CollectionBookCreatedEvent,
  CollectionBookExpirationUpdated as CollectionBookExpirationUpdatedEvent,
  CollectionBookRewardTargetUpdated as CollectionBookRewardTargetUpdatedEvent,
  CollectionBookSlotDefined as CollectionBookSlotDefinedEvent,
  CollectionBookSlotEmptied as CollectionBookSlotEmptiedEvent,
  CollectionBookSlotFilled as CollectionBookSlotFilledEvent,
  CollectionBookStatusUpdated as CollectionBookStatusUpdatedEvent,
} from "../generated/CollectionBookUpgradeable/CollectionBookUpgradeable";
import {
  CollectionBook,
  CollectionBookClaim,
  CollectionBookDeposit,
  CollectionBookRewardTargetUpdated,
  CollectionBookSlot,
  CollectionBookUserProgress,
} from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

function bookId(bookIdValue: BigInt): Bytes {
  return Bytes.fromUTF8(bookIdValue.toString());
}

function slotId(bookIdValue: BigInt, slotIndex: BigInt): Bytes {
  return Bytes.fromUTF8(
    bookIdValue.toString().concat("-").concat(slotIndex.toString())
  );
}

function progressId(user: Bytes, bookIdValue: BigInt): Bytes {
  return Bytes.fromUTF8(user.toHexString().concat("-").concat(bookIdValue.toString()));
}

function depositId(
  user: Bytes,
  bookIdValue: BigInt,
  slotIndex: BigInt,
  sourceContract: Bytes,
  tokenId: BigInt
): Bytes {
  return Bytes.fromUTF8(
    user
      .toHexString()
      .concat("-")
      .concat(bookIdValue.toString())
      .concat("-")
      .concat(slotIndex.toString())
      .concat("-")
      .concat(sourceContract.toHexString())
      .concat("-")
      .concat(tokenId.toString())
  );
}

function loadOrCreateBook(bookIdValue: BigInt): CollectionBook {
  let entity = CollectionBook.load(bookId(bookIdValue));
  if (!entity) {
    entity = new CollectionBook(bookId(bookIdValue));
    entity.bookId = bookIdValue;
    entity.name = "";
    entity.rewardKind = 0;
    entity.rewardData = BigInt.fromI32(0);
    entity.active = false;
    entity.expiresAt = BigInt.fromI32(0);
    entity.totalRequired = BigInt.fromI32(0);
    entity.blockNumber = BigInt.fromI32(0);
    entity.blockTimestamp = BigInt.fromI32(0);
    entity.transactionHash = Bytes.empty();
  }
  return entity;
}

function loadOrCreateProgress(
  user: Bytes,
  book: CollectionBook,
  timestamp: BigInt
): CollectionBookUserProgress {
  let entity = CollectionBookUserProgress.load(progressId(user, book.bookId));
  if (!entity) {
    entity = new CollectionBookUserProgress(progressId(user, book.bookId));
    entity.user = user;
    entity.book = book.id;
    entity.filledCount = BigInt.fromI32(0);
    entity.claimed = false;
  }
  entity.updatedAt = timestamp;
  return entity;
}

function applyProgressDelta(
  user: Bytes,
  book: CollectionBook,
  timestamp: BigInt,
  delta: i32
): CollectionBookUserProgress {
  let progress = loadOrCreateProgress(user, book, timestamp);
  if (delta > 0) {
    progress.filledCount = progress.filledCount.plus(BigInt.fromI32(delta));
  } else if (delta < 0) {
    let decrement = BigInt.fromI32(0 - delta);
    if (progress.filledCount.gt(decrement)) {
      progress.filledCount = progress.filledCount.minus(decrement);
    } else {
      progress.filledCount = BigInt.fromI32(0);
    }
  }
  progress.save();
  return progress;
}

export function handleCollectionBookCreated(
  event: CollectionBookCreatedEvent
): void {
  let entity = loadOrCreateBook(event.params.bookId);
  entity.name = event.params.name;
  entity.rewardKind = event.params.rewardKind;
  entity.rewardData = event.params.rewardData;
  entity.active = event.params.active;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleCollectionBookSlotDefined(
  event: CollectionBookSlotDefinedEvent
): void {
  let book = loadOrCreateBook(event.params.bookId);
  let id = slotId(event.params.bookId, event.params.slotIndex);
  let previous = CollectionBookSlot.load(id);
  let quantity = event.params.quantity;

  if (previous) {
    book.totalRequired = book.totalRequired.minus(previous.quantity).plus(quantity);
  } else {
    book.totalRequired = book.totalRequired.plus(quantity);
  }
  book.save();

  let entity = new CollectionBookSlot(id);
  entity.book = book.id;
  entity.bookId = event.params.bookId;
  entity.slotIndex = event.params.slotIndex;
  entity.sourceContract = event.params.sourceContract;
  entity.seriesID = event.params.seriesID;
  entity.prizeId = event.params.prizeId;
  entity.quantity = quantity;
  entity.save();
}

export function handleCollectionBookStatusUpdated(
  event: CollectionBookStatusUpdatedEvent
): void {
  let entity = loadOrCreateBook(event.params.bookId);
  entity.active = event.params.active;
  entity.save();
}

export function handleCollectionBookExpirationUpdated(
  event: CollectionBookExpirationUpdatedEvent
): void {
  let entity = loadOrCreateBook(event.params.bookId);
  entity.expiresAt = event.params.expiresAt;
  entity.save();
}

export function handleCollectionBookRewardTargetUpdated(
  event: CollectionBookRewardTargetUpdatedEvent
): void {
  let entity = new CollectionBookRewardTargetUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.doudochainV2RewardTarget = event.params.doudochainV2RewardTarget;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleCollectionBookSlotFilled(
  event: CollectionBookSlotFilledEvent
): void {
  let book = loadOrCreateBook(event.params.bookId);
  let id = depositId(
    event.params.user,
    event.params.bookId,
    event.params.slotIndex,
    event.params.sourceContract,
    event.params.tokenId
  );
  let existingDeposit = CollectionBookDeposit.load(id);
  let shouldIncrement = !existingDeposit || !existingDeposit.deposited;
  let deposit = new CollectionBookDeposit(id);
  deposit.user = event.params.user;
  deposit.book = book.id;
  deposit.slotIndex = event.params.slotIndex;
  deposit.sourceContract = event.params.sourceContract;
  deposit.tokenId = event.params.tokenId;
  deposit.deposited = true;
  deposit.blockNumber = event.block.number;
  deposit.blockTimestamp = event.block.timestamp;
  deposit.transactionHash = event.transaction.hash;
  deposit.save();

  if (shouldIncrement) {
    applyProgressDelta(event.params.user, book, event.block.timestamp, 1);
  } else {
    let progress = loadOrCreateProgress(event.params.user, book, event.block.timestamp);
    progress.save();
  }
}

export function handleCollectionBookSlotEmptied(
  event: CollectionBookSlotEmptiedEvent
): void {
  let book = loadOrCreateBook(event.params.bookId);
  let id = depositId(
    event.params.user,
    event.params.bookId,
    event.params.slotIndex,
    event.params.sourceContract,
    event.params.tokenId
  );
  let existingDeposit = CollectionBookDeposit.load(id);
  let shouldDecrement = !existingDeposit || existingDeposit.deposited;
  let deposit = new CollectionBookDeposit(id);
  deposit.user = event.params.user;
  deposit.book = book.id;
  deposit.slotIndex = event.params.slotIndex;
  deposit.sourceContract = event.params.sourceContract;
  deposit.tokenId = event.params.tokenId;
  deposit.deposited = false;
  deposit.blockNumber = event.block.number;
  deposit.blockTimestamp = event.block.timestamp;
  deposit.transactionHash = event.transaction.hash;
  deposit.save();

  if (shouldDecrement) {
    applyProgressDelta(event.params.user, book, event.block.timestamp, -1);
  } else {
    let progress = loadOrCreateProgress(event.params.user, book, event.block.timestamp);
    progress.save();
  }
}

export function handleCollectionBookClaimed(
  event: CollectionBookClaimedEvent
): void {
  let book = loadOrCreateBook(event.params.bookId);
  let progress = loadOrCreateProgress(
    event.params.user,
    book,
    event.block.timestamp
  );
  progress.claimed = true;
  progress.filledCount = book.totalRequired;
  progress.save();

  let claim = new CollectionBookClaim(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  claim.user = event.params.user;
  claim.book = book.id;
  claim.rewardKind = event.params.rewardKind;
  claim.rewardData = event.params.rewardData;
  claim.blockNumber = event.block.number;
  claim.blockTimestamp = event.block.timestamp;
  claim.transactionHash = event.transaction.hash;
  claim.save();
}
