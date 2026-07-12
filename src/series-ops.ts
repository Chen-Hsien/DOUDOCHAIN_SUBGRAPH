import {
  MintLockUpdated as MintLockUpdatedEvent,
  SeriesMaxPerWalletUpdated as SeriesMaxPerWalletUpdatedEvent,
} from "../generated/DoudoSeriesOpsModule/DoudoSeriesOpsModuleUpgradeable";
import {
  MintLockUpdated,
  NewSeries,
  SeriesMaxPerWalletUpdated,
} from "../generated/schema";

import { Bytes, log } from "@graphprotocol/graph-ts";
import { updateCurrentMintLock } from "./series-runtime";

export function handleSeriesOpsMintLockUpdated(
  event: MintLockUpdatedEvent
): void {
  let id = event.params.seriesID
    .toString()
    .concat("-")
    .concat(event.params.owner.toHexString());
  let entity = new MintLockUpdated(Bytes.fromUTF8(id));
  entity.seriesID = event.params.seriesID;
  entity.owner = event.params.owner;
  entity.until = event.params.until;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
  updateCurrentMintLock(
    event.params.seriesID,
    event.params.owner,
    event.params.until,
    event.block.number,
    event.block.timestamp,
    event.transaction.hash
  );
}

export function handleSeriesMaxPerWalletUpdated(
  event: SeriesMaxPerWalletUpdatedEvent
): void {
  let entity = new SeriesMaxPerWalletUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.maxPerWallet = event.params.maxPerWallet;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let series = NewSeries.load(Bytes.fromUTF8(event.params.seriesID.toString()));
  if (series == null) {
    log.warning("SeriesMaxPerWalletUpdated skipped missing series {}", [
      event.params.seriesID.toString(),
    ]);
    return;
  }

  series.maxPerWallet = event.params.maxPerWallet;
  series.save();
}
