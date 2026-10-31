import { Address, BigInt } from "@graphprotocol/graph-ts";
import { PrizeBuybackBurned } from "../generated/templates/FixedProbabilityBuyback/FixedProbabilityLotteryBuyback";
import {
  FixedProbabilityNFT,
  FixedProbabilityEvent,
  PrizeBuybackBurn,
} from "../generated/schema";
import { audit, entityId } from "./fixed-probability-ids";

export function handleNativePrizeBuybackBurned(e: PrizeBuybackBurned): void {
  if (!audit(e, "PrizeBuybackBurned")) return;
  const p = e.params;
  assert(p.coreAddress.equals(e.address), "Buyback: wrong NFT deployment");
  assert(
    p.tokenIds.length > 0 &&
      p.tokenIds.length <= 50 &&
      p.tokenIds.length == p.points.length,
    "Buyback: invalid batch",
  );
  let total = BigInt.zero();
  const burnId = e.address.concat(p.batchId);
  assert(PrizeBuybackBurn.load(burnId) == null, "Buyback: reused batch");
  for (let i = 0; i < p.tokenIds.length; i++) {
    assert(
      p.points[i].gt(BigInt.zero()) &&
        (i == 0 || p.tokenIds[i].gt(p.tokenIds[i - 1])),
      "Buyback: invalid items",
    );
    total = total.plus(p.points[i]);
    const nft = FixedProbabilityNFT.load(entityId(e, "nft", p.tokenIds[i]));
    assert(
      nft != null && nft!.burned && nft!.currentOwner.equals(Address.zero()),
      "Buyback: missing burn",
    );
    const event = FixedProbabilityEvent.load(nft!.burnedEvent!);
    assert(
      nft!.burnedBy!.equals(p.buyer) &&
        event != null &&
        event!.transactionHash.equals(e.transaction.hash) &&
        event!.logIndex.lt(e.logIndex),
      "Buyback: burn evidence mismatch",
    );
    nft!.buybackBurn = burnId;
    nft!.save();
  }
  assert(total.equals(p.totalPoints), "Buyback: total mismatch");
  const row = new PrizeBuybackBurn(burnId);
  row.batchId = p.batchId;
  row.module = e.address;
  row.core = p.coreAddress;
  row.buyer = p.buyer;
  row.tokenIds = p.tokenIds;
  row.pointsRaw = p.points;
  row.totalPointsRaw = p.totalPoints;
  row.quoteHash = p.quoteHash;
  row.blockNumber = e.block.number;
  row.blockTimestamp = e.block.timestamp;
  row.transactionHash = e.transaction.hash;
  row.save();
}
