import { BigInt, Bytes, log } from "@graphprotocol/graph-ts";
import { SeriesRuntimeState } from "../generated/schema";

export function seriesRuntimeId(seriesID: BigInt): Bytes {
  return Bytes.fromUTF8(seriesID.toString());
}

export function ensureSeriesRuntimeState(
  seriesID: BigInt
): SeriesRuntimeState {
  let id = seriesRuntimeId(seriesID);
  let state = SeriesRuntimeState.load(id);

  if (state == null) {
    state = new SeriesRuntimeState(id);
    state.series = id;
    state.seriesID = seriesID;
    state.unrevealedCount = BigInt.zero();
    state.mintLockUntil = BigInt.zero();
  }

  return state;
}

export function initializeSeriesRuntimeState(seriesID: BigInt): void {
  ensureSeriesRuntimeState(seriesID).save();
}

export function adjustUnrevealedCount(seriesID: BigInt, delta: i32): void {
  if (delta == 0) return;

  let state = ensureSeriesRuntimeState(seriesID);
  if (delta > 0) {
    state.unrevealedCount = state.unrevealedCount.plus(
      BigInt.fromI32(delta)
    );
  } else {
    let decrement = BigInt.fromI32(-delta);
    if (state.unrevealedCount.lt(decrement)) {
      log.warning(
        "Series {} unrevealedCount underflow prevented: current {}, delta {}",
        [
          seriesID.toString(),
          state.unrevealedCount.toString(),
          delta.toString(),
        ]
      );
      state.unrevealedCount = BigInt.zero();
    } else {
      state.unrevealedCount = state.unrevealedCount.minus(decrement);
    }
  }

  state.save();
}

export function updateCurrentMintLock(
  seriesID: BigInt,
  owner: Bytes,
  until: BigInt,
  blockNumber: BigInt,
  blockTimestamp: BigInt,
  transactionHash: Bytes
): void {
  let state = ensureSeriesRuntimeState(seriesID);
  state.mintLockOwner = owner;
  state.mintLockUntil = until;
  state.mintLockBlockNumber = blockNumber;
  state.mintLockBlockTimestamp = blockTimestamp;
  state.mintLockTransactionHash = transactionHash;
  state.save();
}
