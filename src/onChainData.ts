import {
  RevealDrawFulfilled as RevealDrawFulfilledEvent,
  RevealDrawSent as RevealDrawSentEvent,
  ICHICHAIN,
} from "../generated/ICHICHAIN/ICHICHAIN";

import { RevealDrawFulfilled, RevealDrawSent } from "../generated/schema";

import {
  json,
  BigInt,
  Bytes,
  log,
  dataSource,
  DataSourceContext,
  DataSourceTemplate,
  JSONValueKind,
} from "@graphprotocol/graph-ts";

export function handleRevealDrawFulfilled(
  event: RevealDrawFulfilledEvent
): void {
  let entity = new RevealDrawFulfilled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.requestId = event.params.requestId;
  entity.randomWords = event.params.randomWords;
  entity.seriesID = event.params.seriesID;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // fill in subprize details
  let contract = ICHICHAIN.bind(event.address);
  let subPrizesDetail = contract.getSubPrizesDetail(event.params.seriesID);

  // Iterate through each subprize and construct a comma-separated string
  let subPrizesRemainingQuantities: BigInt[] = [];
  for (let i = 0; i < subPrizesDetail.length; i++) {
    let subprize = subPrizesDetail[i];
    subPrizesRemainingQuantities.push(subprize.subPrizeRemainingQuantity);
  }

  // update revealDrawSent entity
  let revealDrawSentID = Bytes.fromUTF8(event.params.requestId.toString());
  let revealDrawSent = RevealDrawSent.load(revealDrawSentID);
  if (revealDrawSent) {
    revealDrawSent.seriesID = event.params.seriesID;
    revealDrawSent.randomWords = event.params.randomWords;
    revealDrawSent.subPrizesRemainingQuantities = subPrizesRemainingQuantities;
    revealDrawSent.save();
  }
}

export function handleRevealDrawSent(event: RevealDrawSentEvent): void {
  let entity = new RevealDrawSent(
    Bytes.fromUTF8(event.params.requestId.toString())
  );
  entity.requestId = event.params.requestId;
  entity.tokenIDs = event.params.tokenIDs;
  entity.randomWords = [];
  entity.subPrizesRemainingQuantities = [];

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
