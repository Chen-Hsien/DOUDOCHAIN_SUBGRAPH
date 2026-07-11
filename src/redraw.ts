import {
  ConsolationDrawBalanceUpdated as ConsolationDrawBalanceUpdatedEvent,
  NewConsolationPrize as NewConsolationPrizeEvent,
  RedrawConfigUpdated as RedrawConfigUpdatedEvent,
  RedrawEnabledUpdated as RedrawEnabledUpdatedEvent,
  RedrawFulfilled as RedrawFulfilledEvent,
  RedrawMainConfigUpdated as RedrawMainConfigUpdatedEvent,
  RedrawMinted as RedrawMintedEvent,
  RedrawRequested as RedrawRequestedEvent,
  RouterUpdated as RouterUpdatedEvent,
  UpdateConsolationPrize as UpdateConsolationPrizeEvent,
} from "../generated/DoudoRedrawModule/DoudoRedrawModuleUpgradeable";
import {
  ConsolationDraw,
  ConsolationDrawBalance,
  ConsolationPrize,
  NewTicketStatus,
  RedrawConfig,
  RedrawMint,
  RouterUpdated,
} from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  linkExistingRedrawRevealCandidate,
  redrawRevealBatchId,
  saveRedrawRevealBatchContext,
} from "./redraw-reveal-link";

const TOKEN_SOURCE_CONSOLATION = "CONSOLATION";
const MAX_REVEAL_BATCH = 20;

function seriesId(seriesID: BigInt): Bytes {
  return Bytes.fromUTF8(seriesID.toString());
}

function ticketId(tokenID: BigInt): Bytes {
  return Bytes.fromUTF8(tokenID.toString());
}

function userSeriesId(seriesID: BigInt, user: Bytes): Bytes {
  return Bytes.fromUTF8(seriesID.toString().concat("-").concat(user.toHexString()));
}

function prizeId(seriesID: BigInt, subPrizeID: BigInt): Bytes {
  return Bytes.fromUTF8(
    seriesID.toString().concat("-").concat(subPrizeID.toString())
  );
}

function requestId(requestIdValue: BigInt): Bytes {
  return Bytes.fromUTF8(requestIdValue.toString());
}

function ensureRedrawConfig(seriesID: BigInt): RedrawConfig {
  let entity = RedrawConfig.load(seriesId(seriesID));
  if (!entity) {
    entity = new RedrawConfig(seriesId(seriesID));
    entity.seriesID = seriesID;
    entity.mainBurnCount = 0;
    entity.mainMintCount = 0;
    entity.consolationBurnCount = 0;
    entity.enabled = false;
  }

  return entity;
}

export function handleRouterUpdated(event: RouterUpdatedEvent): void {
  let entity = new RouterUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.router = event.params.router;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleRedrawConfigUpdated(
  event: RedrawConfigUpdatedEvent
): void {
  let entity = ensureRedrawConfig(event.params.seriesID);
  entity.mainBurnCount = event.params.mainBurnCount;
  entity.mainMintCount = event.params.mainBurnCount;
  entity.consolationBurnCount = event.params.consolationBurnCount;
  entity.save();
}

export function handleRedrawMainConfigUpdated(
  event: RedrawMainConfigUpdatedEvent
): void {
  let entity = ensureRedrawConfig(event.params.seriesID);
  entity.mainBurnCount = event.params.mainBurnCount;
  entity.mainMintCount = event.params.mainMintCount;
  entity.save();
}

export function handleRedrawEnabledUpdated(
  event: RedrawEnabledUpdatedEvent
): void {
  let entity = ensureRedrawConfig(event.params.seriesID);
  entity.enabled = event.params.enabled;
  entity.save();
}

export function handleRedrawRequested(event: RedrawRequestedEvent): void {
  if (!event.params.consolation) {
    return;
  }

  let entity = new ConsolationDraw(requestId(event.params.requestId));
  entity.requestId = event.params.requestId;
  entity.seriesID = event.params.seriesID;
  entity.user = event.params.user;
  entity.fulfilled = false;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleRedrawFulfilled(event: RedrawFulfilledEvent): void {
  if (!event.params.consolation) {
    return;
  }

  let entity = ConsolationDraw.load(requestId(event.params.requestId));
  if (!entity) {
    entity = new ConsolationDraw(requestId(event.params.requestId));
    entity.requestId = event.params.requestId;
    entity.seriesID = event.params.seriesID;
    entity.user = event.params.user;
    entity.blockNumber = event.block.number;
    entity.blockTimestamp = event.block.timestamp;
    entity.transactionHash = event.transaction.hash;
  }
  entity.tokenID = event.params.tokenID;
  entity.fulfilled = true;
  entity.save();

  let ticket = NewTicketStatus.load(ticketId(event.params.tokenID));
  if (ticket) {
    ticket.tokenSource = TOKEN_SOURCE_CONSOLATION;
    ticket.isReward = true;
    ticket.save();
  }
}

export function handleRedrawMinted(event: RedrawMintedEvent): void {
  let entity = new RedrawMint(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.user = event.params.user;
  entity.quantity = event.params.quantity;
  entity.firstTokenID = event.params.firstTokenID;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let quantity = event.params.quantity.toI32();
  for (
    let offset = 0, batchIndex = 0;
    offset < quantity;
    offset += MAX_REVEAL_BATCH, batchIndex++
  ) {
    let tokenStart = event.params.firstTokenID.plus(BigInt.fromI32(offset));
    let batchId = redrawRevealBatchId(event.transaction.hash, tokenStart);
    saveRedrawRevealBatchContext(
      batchId,
      entity.id,
      batchIndex,
      event.transaction.hash,
      tokenStart,
      event.block.number,
      event.block.timestamp
    );
    linkExistingRedrawRevealCandidate(batchId, entity.id, batchIndex);
  }
}

export function handleConsolationDrawBalanceUpdated(
  event: ConsolationDrawBalanceUpdatedEvent
): void {
  let entity = new ConsolationDrawBalance(
    userSeriesId(event.params.seriesID, event.params.user)
  );
  entity.seriesID = event.params.seriesID;
  entity.user = event.params.user;
  entity.balance = event.params.balance;
  entity.save();
}

export function handleNewConsolationPrize(
  event: NewConsolationPrizeEvent
): void {
  let entity = new ConsolationPrize(
    prizeId(event.params.seriesID, event.params.subPrizeID)
  );
  entity.seriesID = event.params.seriesID;
  entity.subPrizeID = event.params.subPrizeID;
  entity.prizeGroup = event.params.prizeGroup;
  entity.subPrizeName = event.params.subPrizeName;
  entity.remainingQuantity = event.params.remainingQuantity;
  entity.save();
}

export function handleUpdateConsolationPrize(
  event: UpdateConsolationPrizeEvent
): void {
  let entity = ConsolationPrize.load(
    prizeId(event.params.seriesID, event.params.subPrizeID)
  );
  if (!entity) {
    entity = new ConsolationPrize(
      prizeId(event.params.seriesID, event.params.subPrizeID)
    );
    entity.seriesID = event.params.seriesID;
    entity.subPrizeID = event.params.subPrizeID;
    entity.prizeGroup = "";
    entity.subPrizeName = "";
  }
  entity.remainingQuantity = event.params.remainingQuantity;
  entity.save();
}
