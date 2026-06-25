import {
  CollectionRewardConfigSet as CollectionRewardConfigSetEvent,
  CollectionRewardMinted as CollectionRewardMintedEvent,
  SeriesUnlockedFor as SeriesUnlockedForEvent,
} from "../generated/DoudoCollectionRewardModule/DoudoCollectionRewardModuleUpgradeable";
import {
  CollectionRewardConfig,
  CollectionRewardMint,
  NewTicketStatus,
  SeriesUnlockedFor,
} from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

const TOKEN_SOURCE_COLLECTION_REWARD = "COLLECTION_REWARD";

function ticketId(tokenID: BigInt): Bytes {
  return Bytes.fromUTF8(tokenID.toString());
}

export function handleCollectionRewardConfigSet(
  event: CollectionRewardConfigSetEvent
): void {
  let entity = new CollectionRewardConfig(
    Bytes.fromUTF8(event.params.collectionBookID.toString())
  );
  entity.collectionBookID = event.params.collectionBookID;
  entity.rewardKind = event.params.rewardKind;
  entity.pointsAmount = event.params.pointsAmount;
  entity.seriesID = event.params.seriesID;
  entity.prizeID = event.params.prizeID;
  entity.active = event.params.active;
  entity.save();
}

export function handleCollectionRewardMinted(
  event: CollectionRewardMintedEvent
): void {
  let entity = new CollectionRewardMint(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.collectionBookID = event.params.collectionBookID;
  entity.user = event.params.user;
  entity.rewardKind = event.params.rewardKind;
  entity.amount = event.params.amount;
  entity.tokenID = event.params.tokenID;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  if (
    event.params.rewardKind == 0 &&
    !event.params.tokenID.equals(BigInt.fromI32(0))
  ) {
    let ticket = NewTicketStatus.load(ticketId(event.params.tokenID));
    if (ticket) {
      ticket.tokenSource = TOKEN_SOURCE_COLLECTION_REWARD;
      ticket.isReward = true;
      ticket.save();
    }
  }
}

export function handleSeriesUnlockedFor(event: SeriesUnlockedForEvent): void {
  let entity = new SeriesUnlockedFor(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.user = event.params.user;
  entity.expires = event.params.expires;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
