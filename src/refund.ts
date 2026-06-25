import {
  RefundClaimed as RefundClaimedEvent,
  RefundSeries as RefundSeriesEvent,
} from "../generated/DoudoRefundModule/DoudoRefundModuleUpgradeable";
import {
  NewSeries,
  RefundClaim,
  RefundConfig,
  RefundSeries,
} from "../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";

export function handleRefundSeries(event: RefundSeriesEvent): void {
  let config = new RefundConfig(Bytes.fromUTF8(event.params.seriesID.toString()));
  config.seriesID = event.params.seriesID;
  config.isRefund = event.params.isRefund;
  config.refundPointsPerTicket = event.params.refundPointsPerTicket;
  config.save();

  let entity = new RefundSeries(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.isRefund = event.params.isRefund;
  entity.refundPointsPerTicket = event.params.refundPointsPerTicket;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let series = NewSeries.load(Bytes.fromUTF8(event.params.seriesID.toString()));
  if (series) {
    series.isRefund = event.params.isRefund;
    series.save();
  }
}

export function handleRefundClaimed(event: RefundClaimedEvent): void {
  let entity = new RefundClaim(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.user = event.params.user;
  entity.tokenIDs = event.params.tokenIDs;
  entity.refundPoints = event.params.refundPoints;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
