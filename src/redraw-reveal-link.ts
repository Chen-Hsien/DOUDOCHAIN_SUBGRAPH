import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  RedrawRevealBatchContext,
  RedrawRevealCandidate,
  RevealDrawSent,
} from "../generated/schema";

export const REDRAW_REVEAL_SOURCE = "REDRAW_MAIN";

export function redrawRevealBatchId(
  transactionHash: Bytes,
  tokenStart: BigInt
): Bytes {
  return transactionHash.concat(Bytes.fromUTF8("-")).concat(
    Bytes.fromUTF8(tokenStart.toString())
  );
}

export function saveRedrawRevealCandidate(
  id: Bytes,
  requestId: BigInt,
  revealDrawSentId: Bytes,
  transactionHash: Bytes,
  tokenStart: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt
): void {
  let candidate = new RedrawRevealCandidate(id);
  candidate.requestId = requestId;
  candidate.revealDrawSent = revealDrawSentId;
  candidate.transactionHash = transactionHash;
  candidate.tokenStart = tokenStart;
  candidate.blockNumber = blockNumber;
  candidate.blockTimestamp = blockTimestamp;
  candidate.save();
}

export function saveRedrawRevealBatchContext(
  id: Bytes,
  redrawMintId: Bytes,
  batchIndex: i32,
  transactionHash: Bytes,
  tokenStart: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt
): void {
  let context = new RedrawRevealBatchContext(id);
  context.redrawMint = redrawMintId;
  context.batchIndex = batchIndex;
  context.transactionHash = transactionHash;
  context.tokenStart = tokenStart;
  context.blockNumber = blockNumber;
  context.blockTimestamp = blockTimestamp;
  context.save();
}

export function applyRedrawRevealLink(
  revealDrawSent: RevealDrawSent,
  redrawMintId: Bytes,
  batchIndex: i32
): void {
  revealDrawSent.source = REDRAW_REVEAL_SOURCE;
  revealDrawSent.redrawMint = redrawMintId;
  revealDrawSent.redrawBatchIndex = batchIndex;
}

export function linkExistingRedrawRevealCandidate(
  id: Bytes,
  redrawMintId: Bytes,
  batchIndex: i32
): void {
  let candidate = RedrawRevealCandidate.load(id);
  if (!candidate) {
    return;
  }

  let revealDrawSent = RevealDrawSent.load(candidate.revealDrawSent);
  if (!revealDrawSent) {
    return;
  }

  applyRedrawRevealLink(revealDrawSent, redrawMintId, batchIndex);
  revealDrawSent.save();
}
