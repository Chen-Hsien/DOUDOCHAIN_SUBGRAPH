import { newMockEvent } from "matchstick-as";
import { ethereum, BigInt, Address, Bytes } from "@graphprotocol/graph-ts";
import {
  BundleRebateTierConfigured,
  BundleRebateTiersCleared,
  OpeningDiscountConfigured,
  OpeningDiscountCleared,
  OpeningDiscountApplied,
  FreeOrderChallengeConfigured,
  FreeOrderChallengeEnded,
  FreeOrderChallengePurchased,
  FreeOrderChallengeResult,
  FreeOrderChallengeRefunded,
  FreeOrderChallengeRefundDeferred,
} from "../generated/DoudoBundleModule/DoudoBundleModuleUpgradeable";

const FREE_ORDER_BUYER = Address.fromString(
  "0x0000000000000000000000000000000000000001",
);

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

export function createFreeOrderChallengeConfiguredEvent(
  seriesID: BigInt,
  version: BigInt,
  eligibleFirstTicketCount: BigInt,
  triggerPrizeIDs: BigInt[],
): FreeOrderChallengeConfigured {
  let event = changetype<FreeOrderChallengeConfigured>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "eligibleFirstTicketCount",
      ethereum.Value.fromUnsignedBigInt(eligibleFirstTicketCount),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "triggerPrizeIDs",
      ethereum.Value.fromUnsignedBigIntArray(triggerPrizeIDs),
    ),
  );
  return event;
}

export function createFreeOrderChallengeEndedEvent(
  seriesID: BigInt,
  version: BigInt,
): FreeOrderChallengeEnded {
  let event = changetype<FreeOrderChallengeEnded>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "version",
      ethereum.Value.fromUnsignedBigInt(version),
    ),
  );
  return event;
}

export function createFreeOrderChallengePurchasedEvent(
  requestId: BigInt,
  seriesID: BigInt,
): FreeOrderChallengePurchased {
  let event = changetype<FreeOrderChallengePurchased>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "buyer",
      ethereum.Value.fromAddress(FREE_ORDER_BUYER),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "ticketQuantity",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(5)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "grossPriceInPoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(500)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "rebatePoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(50)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "refundablePoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(450)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "firstTokenID",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(920)),
    ),
  );
  return event;
}

export function createFreeOrderChallengeResultEvent(
  requestId: BigInt,
  seriesID: BigInt,
): FreeOrderChallengeResult {
  let event = changetype<FreeOrderChallengeResult>(newMockEvent());
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "buyer",
      ethereum.Value.fromAddress(FREE_ORDER_BUYER),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam("won", ethereum.Value.fromBoolean(true)),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "refundPoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(450)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "winningTokenID",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(923)),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "winningPrizeID",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(7)),
    ),
  );
  return event;
}

export function createFreeOrderChallengeRefundDeferredEvent(
  requestId: BigInt,
  seriesID: BigInt,
): FreeOrderChallengeRefundDeferred {
  let event = changetype<FreeOrderChallengeRefundDeferred>(newMockEvent());
  addFreeOrderRefundParameters(event, requestId, seriesID);
  return event;
}

export function createFreeOrderChallengeRefundedEvent(
  requestId: BigInt,
  seriesID: BigInt,
): FreeOrderChallengeRefunded {
  let event = changetype<FreeOrderChallengeRefunded>(newMockEvent());
  addFreeOrderRefundParameters(event, requestId, seriesID);
  event.transaction.hash = Bytes.fromHexString(
    "0x1111111111111111111111111111111111111111111111111111111111111111",
  );
  event.logIndex = BigInt.fromI32(1);
  return event;
}

function addFreeOrderRefundParameters(
  event: ethereum.Event,
  requestId: BigInt,
  seriesID: BigInt,
): void {
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "buyer",
      ethereum.Value.fromAddress(FREE_ORDER_BUYER),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      "refundPoints",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(450)),
    ),
  );
}

export function createOpeningDiscountClearedEvent(seriesID: BigInt): OpeningDiscountCleared {
  let event = changetype<OpeningDiscountCleared>(newMockEvent());
  event.parameters = [new ethereum.EventParam("seriesID", ethereum.Value.fromUnsignedBigInt(seriesID))];
  return event;
}
