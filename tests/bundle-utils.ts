import { newMockEvent } from "matchstick-as";
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts";
import {
  BundleRebateTierConfigured,
  BundleRebateTiersCleared,
  OpeningDiscountConfigured,
  OpeningDiscountApplied,
} from "../generated/DoudoBundleModule/DoudoBundleModuleUpgradeable";

export function createBundleRebateTiersClearedEvent(
  seriesID: BigInt,
): BundleRebateTiersCleared {
  let event = changetype<BundleRebateTiersCleared>(newMockEvent());
  event.parameters = new Array();

  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );

  return event;
}

export function createOpeningDiscountConfiguredEvent(
  seriesID: BigInt,
  ticketLimit: BigInt,
  priceInPoints: BigInt,
): OpeningDiscountConfigured {
  let event = changetype<OpeningDiscountConfigured>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "ticketLimit",
      ethereum.Value.fromUnsignedBigInt(ticketLimit),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "priceInPoints",
      ethereum.Value.fromUnsignedBigInt(priceInPoints),
    ),
  );
  return event;
}

export function createOpeningDiscountAppliedEvent(
  seriesID: BigInt,
  openingQuantity: BigInt,
  regularQuantity: BigInt,
): OpeningDiscountApplied {
  let event = changetype<OpeningDiscountApplied>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "buyer",
      ethereum.Value.fromAddress(
        Address.fromString("0x0000000000000000000000000000000000000001"),
      ),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "openingQuantity",
      ethereum.Value.fromUnsignedBigInt(openingQuantity),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "regularQuantity",
      ethereum.Value.fromUnsignedBigInt(regularQuantity),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "openingPriceInPoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(350)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "grossPriceInPoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1750)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "rebatePoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(150)),
    ),
  );
  return event;
}

export function createBundleRebateTierConfiguredEvent(
  seriesID: BigInt,
  tierIndex: BigInt,
  minimumTicketQuantity: BigInt,
  rebatePoints: BigInt,
): BundleRebateTierConfigured {
  let event = changetype<BundleRebateTierConfigured>(newMockEvent());
  event.parameters = new Array();

  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "tierIndex",
      ethereum.Value.fromUnsignedBigInt(tierIndex),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "minimumTicketQuantity",
      ethereum.Value.fromUnsignedBigInt(minimumTicketQuantity),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "rebatePoints",
      ethereum.Value.fromUnsignedBigInt(rebatePoints),
    ),
  );

  return event;
}
