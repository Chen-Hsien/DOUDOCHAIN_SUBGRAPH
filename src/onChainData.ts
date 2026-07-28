import {
  RevealDrawFulfilled as RevealDrawFulfilledEvent,
  RevealDrawSent as RevealDrawSentEvent,
} from "../generated/ICHICHAIN/ICHICHAIN";

import {
  RevealDrawFulfilled,
  RedrawRevealBatchContext,
  RevealDrawSent,
  SeriesRevealSummary,
  SeriesRevealToken,
  VrfRequest,
} from "../generated/schema";

import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import {
  applyRedrawRevealLink,
  redrawRevealBatchId,
  saveRedrawRevealCandidate,
} from "./redraw-reveal-link";
import { snapshotSeriesPrizePool } from "./reveal-prize-pool";

function seriesRevealSummaryId(seriesID: BigInt): Bytes {
  return Bytes.fromUTF8(seriesID.toString());
}

function recordSeriesRevealProof(
  seriesID: BigInt,
  revealDrawSent: RevealDrawSent | null
): void {
  if (revealDrawSent == null) {
    log.warning(
      "Skipping SeriesRevealSummary for series {} because RevealDrawSent is missing",
      [seriesID.toString()]
    );
    return;
  }

  let id = seriesRevealSummaryId(seriesID);
  let summary = SeriesRevealSummary.load(id);
  if (summary == null) {
    summary = new SeriesRevealSummary(id);
    summary.series = id;
    summary.seriesID = seriesID;
    summary.proofCount = BigInt.zero();
    summary.tokenCount = BigInt.zero();
    summary.latestBlockTimestamp = BigInt.zero();
    summary.latestTransactionHash = Bytes.empty();
  }

  summary.proofCount = summary.proofCount.plus(BigInt.fromI32(1));

  for (let i = 0; i < revealDrawSent.tokenIDs.length; i++) {
    let tokenID = revealDrawSent.tokenIDs[i];
    let tokenEntityId = revealDrawSent.id.concatI32(i);
    if (SeriesRevealToken.load(tokenEntityId) != null) continue;

    let token = new SeriesRevealToken(tokenEntityId);
    token.summary = id;
    token.seriesID = seriesID;
    token.tokenID = tokenID;
    token.ticket = Bytes.fromUTF8(tokenID.toString());
    token.blockNumber = revealDrawSent.blockNumber;
    token.blockTimestamp = revealDrawSent.blockTimestamp;
    token.transactionHash = revealDrawSent.transactionHash;
    token.save();
  }

  summary.tokenCount = summary.tokenCount.plus(
    BigInt.fromI32(revealDrawSent.revealTokenCount)
  );

  if (!revealDrawSent.blockTimestamp.lt(summary.latestBlockTimestamp)) {
    summary.latestBlockTimestamp = revealDrawSent.blockTimestamp;
    summary.latestTransactionHash = revealDrawSent.transactionHash;
  }

  summary.save();
}

export function handleRevealDrawFulfilled(
  event: RevealDrawFulfilledEvent
): void {
  let entity = new RevealDrawFulfilled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.requestId = event.params.requestId;
  entity.randomWords = event.params.randomWords;
  entity.seriesID = event.params.seriesID;
  entity.randomSeed =
    event.params.randomWords.length > 0 ? event.params.randomWords[0] : null;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  // update revealDrawSent entity
  let revealDrawSentID = Bytes.fromUTF8(event.params.requestId.toString());
  let revealDrawSent = RevealDrawSent.load(revealDrawSentID);
  if (revealDrawSent) {
    revealDrawSent.seriesID = event.params.seriesID;
    revealDrawSent.randomWords = event.params.randomWords;
    revealDrawSent.randomSeed = entity.randomSeed;
    let postDrawRemaining = snapshotSeriesPrizePool(event.params.seriesID);
    if (postDrawRemaining != null) {
      revealDrawSent.subPrizesRemainingQuantities = postDrawRemaining;
    }
    revealDrawSent.save();
    entity.revealTokenCount = revealDrawSent.revealTokenCount;
  } else {
    entity.revealTokenCount = 0;
  }

  recordSeriesRevealProof(event.params.seriesID, revealDrawSent);
  entity.save();
}

export function handleRevealDrawSent(event: RevealDrawSentEvent): void {
  let entity = new RevealDrawSent(
    Bytes.fromUTF8(event.params.requestId.toString())
  );
  entity.requestId = event.params.requestId;
  entity.tokenIDs = event.params.tokenIDs;
  entity.randomWords = [];
  entity.randomSeed = null;
  entity.revealTokenCount = event.params.tokenIDs.length;
  entity.subPrizesRemainingQuantities = [];
  let vrfRequest = VrfRequest.load(Bytes.fromUTF8(event.params.requestId.toString()));
  entity.vrfNumWords = vrfRequest ? vrfRequest.numWords : null;

  if (event.params.tokenIDs.length > 0) {
    let batchId = redrawRevealBatchId(
      event.transaction.hash,
      event.params.tokenIDs[0]
    );
    let redrawContext = RedrawRevealBatchContext.load(batchId);
    if (redrawContext) {
      applyRedrawRevealLink(
        entity,
        redrawContext.redrawMint,
        redrawContext.batchIndex
      );
    } else {
      saveRedrawRevealCandidate(
        batchId,
        event.params.requestId,
        entity.id,
        event.transaction.hash,
        event.params.tokenIDs[0],
        event.block.number,
        event.block.timestamp
      );
    }
  }

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
