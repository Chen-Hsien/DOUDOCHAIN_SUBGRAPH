import {
  NewListing,
  UpdatedListing,
  NewSale,
  CancelledListing,
} from "../generated/templates/BuybackMarketplace/MarketplaceV3";
import { Listing, NewTicketStatus } from "../generated/schema";
import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";

// Index all asset contracts. A same-number CORE ticket must never hide an FP listing.
function saveListing(e: ethereum.Event, tuple: ethereum.Tuple): void {
  const row = new Listing(tuple[0].toBigInt().toString());
  row.listingId = tuple[0].toBigInt();
  row.tokenId = tuple[1].toBigInt();
  row.quantity = tuple[2].toBigInt();
  row.currentQuantity = row.quantity;
  row.pricePerToken = tuple[3].toBigInt();
  row.startTimestamp = tuple[4].toBigInt();
  row.endTimestamp = tuple[5].toBigInt();
  row.listingCreator = tuple[6].toAddress();
  row.assetContract = tuple[7].toAddress();
  row.currency = tuple[8].toAddress();
  row.tokenType = tuple[9].toI32();
  row.reserved = tuple[11].toBoolean();
  row.status = "CREATED";
  row.totalSales = BigInt.zero();
  const previous = Listing.load(row.id);
  if (previous) row.totalSales = previous.totalSales;
  const ticket = NewTicketStatus.load(Bytes.fromUTF8(row.tokenId.toString()));
  if (
    ticket &&
    ticket.assetContract &&
    ticket.assetContract!.equals(row.assetContract)
  )
    row.ticket = ticket.id;
  row.blockNumber = e.block.number;
  row.blockTimestamp = e.block.timestamp;
  row.transactionHash = e.transaction.hash;
  row.save();
}
export function handleNewListing(e: NewListing): void {
  saveListing(e, e.params.listing);
}
export function handleUpdatedListing(e: UpdatedListing): void {
  saveListing(e, e.params.listing);
}
export function handleNewSale(e: NewSale): void {
  const row = Listing.load(e.params.listingId.toString());
  assert(row != null, "Buyback marketplace: missing listing");
  row!.currentQuantity = row!.currentQuantity.minus(e.params.quantityBought);
  row!.totalSales = row!.totalSales.plus(BigInt.fromI32(1));
  if (row!.currentQuantity.equals(BigInt.zero())) row!.status = "COMPLETED";
  row!.save();
}
export function handleCancelledListing(e: CancelledListing): void {
  const row = Listing.load(e.params.listingId.toString());
  assert(row != null, "Buyback marketplace: missing listing");
  row!.status = "CANCELLED";
  row!.save();
}
