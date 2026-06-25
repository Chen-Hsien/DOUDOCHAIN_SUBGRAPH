import {
  BundleConfigured as BundleConfiguredEvent,
  BundleMinted as BundleMintedEvent,
} from "../generated/DoudoBundleModule/DoudoBundleModuleUpgradeable";
import { BundleConfig, BundleMint } from "../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";

function bundleConfigId(seriesID: string, bundleID: string): Bytes {
  return Bytes.fromUTF8(seriesID.concat("-").concat(bundleID));
}

export function handleBundleConfigured(event: BundleConfiguredEvent): void {
  let entity = new BundleConfig(
    bundleConfigId(
      event.params.seriesID.toString(),
      event.params.bundleID.toString()
    )
  );
  entity.seriesID = event.params.seriesID;
  entity.bundleID = event.params.bundleID;
  entity.ticketQuantity = event.params.ticketQuantity;
  entity.priceInPoints = event.params.priceInPoints;
  entity.rebatePoints = event.params.rebatePoints;
  entity.consolationDrawCredits = event.params.consolationDrawCredits;
  entity.active = event.params.active;
  entity.save();
}

export function handleBundleMinted(event: BundleMintedEvent): void {
  let entity = new BundleMint(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.bundleID = event.params.bundleID;
  entity.buyer = event.params.buyer;
  entity.quantity = event.params.quantity;
  entity.firstTokenID = event.params.firstTokenID;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
