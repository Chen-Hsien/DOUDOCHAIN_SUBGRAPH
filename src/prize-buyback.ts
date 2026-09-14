import { BigInt, dataSource } from "@graphprotocol/graph-ts";
import { PrizeBuybackBurned } from "../generated/templates/PrizeBuybackModule/DoudoPrizeBuybackModuleUpgradeable";
import { PrizeBuybackBurn } from "../generated/schema";

export function handlePrizeBuybackBurned(event: PrizeBuybackBurned): void {
  if (!event.params.coreAddress.equals(dataSource.context().getBytes("core"))) return;
  if (event.params.tokenIds.length == 0 || event.params.tokenIds.length != event.params.points.length) return;
  let total = BigInt.zero();
  for (let i = 0; i < event.params.points.length; i++) total = total.plus(event.params.points[i]);
  if (!total.equals(event.params.totalPoints)) return;
  const id = event.address.concat(event.params.batchId);
  if (PrizeBuybackBurn.load(id) != null) return;
  const entity = new PrizeBuybackBurn(id);
  entity.batchId = event.params.batchId;
  entity.module = event.address;
  entity.core = event.params.coreAddress;
  entity.buyer = event.params.buyer;
  entity.tokenIds = event.params.tokenIds;
  entity.pointsRaw = event.params.points;
  entity.totalPointsRaw = event.params.totalPoints;
  entity.quoteHash = event.params.quoteHash;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
