import { BigInt, Bytes, store } from "@graphprotocol/graph-ts";
import {
  BundleRebateTierConfigured as BundleRebateTierConfiguredEvent,
  BundleRebateTiersCleared as BundleRebateTiersClearedEvent,
  TicketPurchaseMinted as TicketPurchaseMintedEvent,
  TicketPurchaseRebatePaid as TicketPurchaseRebatePaidEvent,
  OpeningDiscountConfigured as OpeningDiscountConfiguredEvent,
  OpeningDiscountCleared as OpeningDiscountClearedEvent,
  OpeningDiscountApplied as OpeningDiscountAppliedEvent,
} from "../generated/DoudoBundleModule/DoudoBundleModuleUpgradeable";
import {
  BundleRebateTierConfigured,
  BundleRebateTiersCleared,
  SeriesRebateTier,
  SeriesRebateTierConfig,
  TicketPurchaseMint,
  TicketPurchaseRebate,
  SeriesOpeningDiscountConfig,
  OpeningDiscountConfigured,
  OpeningDiscountCleared,
  OpeningDiscountApplication,
} from "../generated/schema";

function eventId(eventTxHash: Bytes, logIndex: BigInt): Bytes {
  return eventTxHash.concatI32(logIndex.toI32());
}

function openingDiscountConfigId(seriesID: BigInt): Bytes {
  return Bytes.fromUTF8(seriesID.toString());
}

function rebateConfigId(seriesID: BigInt): Bytes {
  return Bytes.fromUTF8(seriesID.toString());
}

function rebateTierId(seriesID: BigInt, tierIndex: BigInt): Bytes {
  return Bytes.fromUTF8(
    seriesID.toString().concat("-").concat(tierIndex.toString()),
  );
}

function removeCurrentRebateTiers(seriesID: BigInt, tierCount: BigInt): void {
  let index = BigInt.zero();

  while (index.lt(tierCount)) {
    store.remove(
      "SeriesRebateTier",
      rebateTierId(seriesID, index).toHexString(),
    );
    index = index.plus(BigInt.fromI32(1));
  }
}

function loadOrCreateRebateConfig(seriesID: BigInt): SeriesRebateTierConfig {
  let id = rebateConfigId(seriesID);
  let config = SeriesRebateTierConfig.load(id);

  if (config == null) {
    config = new SeriesRebateTierConfig(id);
    config.seriesID = seriesID;
    config.version = BigInt.zero();
    config.tierCount = BigInt.zero();
    config.updatedAt = BigInt.zero();
    config.transactionHash = Bytes.empty();
  }

  return config;
}

export function handleBundleRebateTiersCleared(
  event: BundleRebateTiersClearedEvent,
): void {
  let config = loadOrCreateRebateConfig(event.params.seriesID);
  removeCurrentRebateTiers(event.params.seriesID, config.tierCount);
  config.version = config.version.plus(BigInt.fromI32(1));
  config.tierCount = BigInt.zero();
  config.lastClearedAt = event.block.timestamp;
  config.updatedAt = event.block.timestamp;
  config.transactionHash = event.transaction.hash;
  config.save();

  let entity = new BundleRebateTiersCleared(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.seriesID = event.params.seriesID;
  entity.configVersion = config.version;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleBundleRebateTierConfigured(
  event: BundleRebateTierConfiguredEvent,
): void {
  let config = loadOrCreateRebateConfig(event.params.seriesID);
  let nextTierCount = event.params.tierIndex.plus(BigInt.fromI32(1));

  if (config.tierCount.lt(nextTierCount)) {
    config.tierCount = nextTierCount;
  }
  config.updatedAt = event.block.timestamp;
  config.transactionHash = event.transaction.hash;
  config.save();

  let tier = new SeriesRebateTier(
    rebateTierId(event.params.seriesID, event.params.tierIndex),
  );
  tier.config = config.id;
  tier.seriesID = event.params.seriesID;
  tier.configVersion = config.version;
  tier.tierIndex = event.params.tierIndex;
  tier.minimumTicketQuantity = event.params.minimumTicketQuantity;
  tier.rebatePoints = event.params.rebatePoints;
  tier.blockNumber = event.block.number;
  tier.blockTimestamp = event.block.timestamp;
  tier.transactionHash = event.transaction.hash;
  tier.save();

  let entity = new BundleRebateTierConfigured(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.seriesID = event.params.seriesID;
  entity.configVersion = config.version;
  entity.tierIndex = event.params.tierIndex;
  entity.minimumTicketQuantity = event.params.minimumTicketQuantity;
  entity.rebatePoints = event.params.rebatePoints;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleTicketPurchaseMinted(
  event: TicketPurchaseMintedEvent,
): void {
  let entity = new TicketPurchaseMint(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.seriesID = event.params.seriesID;
  entity.buyer = event.params.buyer;
  entity.ticketQuantity = event.params.ticketQuantity;
  entity.priceInPoints = event.params.priceInPoints;
  entity.revealImmediately = event.params.revealImmediately;
  entity.firstTokenID = event.params.firstTokenID;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleTicketPurchaseRebatePaid(
  event: TicketPurchaseRebatePaidEvent,
): void {
  let entity = new TicketPurchaseRebate(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.seriesID = event.params.seriesID;
  entity.buyer = event.params.buyer;
  entity.ticketQuantity = event.params.ticketQuantity;
  entity.rebatePoints = event.params.rebatePoints;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleOpeningDiscountConfigured(
  event: OpeningDiscountConfiguredEvent,
): void {
  let id = openingDiscountConfigId(event.params.seriesID);
  let config = new SeriesOpeningDiscountConfig(id);
  config.seriesID = event.params.seriesID;
  config.ticketLimit = event.params.ticketLimit;
  config.priceInPoints = event.params.priceInPoints;
  config.usedTickets = BigInt.zero();
  config.active = true;
  config.updatedAt = event.block.timestamp;
  config.transactionHash = event.transaction.hash;
  config.save();

  let entity = new OpeningDiscountConfigured(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.seriesID = event.params.seriesID;
  entity.ticketLimit = event.params.ticketLimit;
  entity.priceInPoints = event.params.priceInPoints;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleOpeningDiscountCleared(
  event: OpeningDiscountClearedEvent,
): void {
  let config = SeriesOpeningDiscountConfig.load(
    openingDiscountConfigId(event.params.seriesID),
  );
  if (config != null) {
    config.active = false;
    config.updatedAt = event.block.timestamp;
    config.transactionHash = event.transaction.hash;
    config.save();
  }

  let entity = new OpeningDiscountCleared(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.seriesID = event.params.seriesID;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleOpeningDiscountApplied(
  event: OpeningDiscountAppliedEvent,
): void {
  let config = SeriesOpeningDiscountConfig.load(
    openingDiscountConfigId(event.params.seriesID),
  );
  if (config != null) {
    config.usedTickets = config.usedTickets.plus(event.params.openingQuantity);
    config.updatedAt = event.block.timestamp;
    config.transactionHash = event.transaction.hash;
    config.save();
  }

  let entity = new OpeningDiscountApplication(
    eventId(event.transaction.hash, event.logIndex),
  );
  entity.seriesID = event.params.seriesID;
  entity.buyer = event.params.buyer;
  entity.openingQuantity = event.params.openingQuantity;
  entity.regularQuantity = event.params.regularQuantity;
  entity.openingPriceInPoints = event.params.openingPriceInPoints;
  entity.grossPriceInPoints = event.params.grossPriceInPoints;
  entity.rebatePoints = event.params.rebatePoints;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
