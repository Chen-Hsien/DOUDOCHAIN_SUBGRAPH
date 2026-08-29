import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
} from "matchstick-as/assembly/index";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import { handleNewSubPrize, handleUpdatePrize } from "../src/ichichain";
import {
  handleBundleRebateTierConfigured,
  handleBundleRebateTiersCleared,
  handleOpeningDiscountConfigured,
  handleOpeningDiscountApplied,
  handleFreeOrderChallengeConfigured,
  handleFreeOrderChallengePurchased,
  handleFreeOrderChallengeResult,
  handleFreeOrderChallengeRefundDeferred,
  handleFreeOrderChallengeRefunded,
} from "../src/bundle";
import {
  createBundleRebateTierConfiguredEvent,
  createBundleRebateTiersClearedEvent,
  createOpeningDiscountConfiguredEvent,
  createOpeningDiscountAppliedEvent,
  createFreeOrderChallengeConfiguredEvent,
  createFreeOrderChallengePurchasedEvent,
  createFreeOrderChallengeResultEvent,
  createFreeOrderChallengeRefundDeferredEvent,
  createFreeOrderChallengeRefundedEvent,
} from "./bundle-utils";
import {
  createNewSubPrizeEvent,
  createUpdatePrizeEvent,
} from "./doudochain-utils";

function rebateTierId(seriesID: BigInt, tierIndex: BigInt): string {
  return Bytes.fromUTF8(
    seriesID.toString().concat("-").concat(tierIndex.toString()),
  ).toHexString();
}

function clearRebateTiers(seriesID: BigInt): void {
  handleBundleRebateTiersCleared(createBundleRebateTiersClearedEvent(seriesID));
}

function configureRebateTier(
  seriesID: BigInt,
  tierIndex: i32,
  minimumTicketQuantity: i32,
  rebatePoints: i32,
): void {
  handleBundleRebateTierConfigured(
    createBundleRebateTierConfiguredEvent(
      seriesID,
      BigInt.fromI32(tierIndex),
      BigInt.fromI32(minimumTicketQuantity),
      BigInt.fromI32(rebatePoints),
    ),
  );
}

describe("Bundle rebate handlers", () => {
  afterEach(() => {
    clearStore();
  });

  test("clearing and reconfiguring rebate tiers leaves only the latest tiers queryable", () => {
    let seriesID = BigInt.fromI32(9);

    clearRebateTiers(seriesID);
    configureRebateTier(seriesID, 0, 3, 500);
    configureRebateTier(seriesID, 1, 6, 700);

    clearRebateTiers(seriesID);
    configureRebateTier(seriesID, 0, 3, 100);
    configureRebateTier(seriesID, 1, 6, 350);

    assert.entityCount("SeriesRebateTier", 2);
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(0)),
      "configVersion",
      "2",
    );
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(0)),
      "minimumTicketQuantity",
      "3",
    );
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(0)),
      "rebatePoints",
      "100",
    );
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(1)),
      "minimumTicketQuantity",
      "6",
    );
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(1)),
      "rebatePoints",
      "350",
    );
  });

  test("opening discount usage advances only by opening-priced tickets", () => {
    let seriesID = BigInt.fromI32(12);
    handleOpeningDiscountConfigured(
      createOpeningDiscountConfiguredEvent(
        seriesID,
        BigInt.fromI32(10),
        BigInt.fromI32(350),
      ),
    );
    handleOpeningDiscountApplied(
      createOpeningDiscountAppliedEvent(
        seriesID,
        BigInt.fromI32(3),
        BigInt.fromI32(2),
      ),
    );

    let configId = Bytes.fromUTF8(seriesID.toString()).toHexString();
    assert.fieldEquals(
      "SeriesOpeningDiscountConfig",
      configId,
      "ticketLimit",
      "10",
    );
    assert.fieldEquals(
      "SeriesOpeningDiscountConfig",
      configId,
      "usedTickets",
      "3",
    );
    assert.fieldEquals(
      "SeriesOpeningDiscountConfig",
      configId,
      "active",
      "true",
    );
    assert.entityCount("OpeningDiscountApplication", 1);
  });

  test("free-order challenge indexes config, result, deferred refund, and claim", () => {
    let seriesID = BigInt.fromI32(1);
    let requestId = BigInt.fromI32(55);
    handleFreeOrderChallengeConfigured(
      createFreeOrderChallengeConfiguredEvent(
        seriesID,
        BigInt.fromI32(3),
        BigInt.fromI32(100),
        [BigInt.fromI32(7), BigInt.fromI32(8)],
      ),
    );
    handleFreeOrderChallengePurchased(
      createFreeOrderChallengePurchasedEvent(requestId, seriesID),
    );
    handleFreeOrderChallengeResult(
      createFreeOrderChallengeResultEvent(requestId, seriesID),
    );
    handleFreeOrderChallengeRefundDeferred(
      createFreeOrderChallengeRefundDeferredEvent(requestId, seriesID),
    );

    let configId = Bytes.fromUTF8(seriesID.toString()).toHexString();
    assert.fieldEquals(
      "SeriesFreeOrderChallengeConfig",
      configId,
      "eligibleFirstTicketCount",
      "100",
    );
    assert.fieldEquals(
      "SeriesFreeOrderChallengeConfig",
      configId,
      "eligibleLastTicketCount",
      "100",
    );
    assert.fieldEquals(
      "FreeOrderChallengeRound",
      requestId.toString(),
      "configVersion",
      "3",
    );
    assert.fieldEquals(
      "FreeOrderChallengeRound",
      requestId.toString(),
      "processed",
      "true",
    );
    assert.fieldEquals(
      "FreeOrderChallengeRound",
      requestId.toString(),
      "won",
      "true",
    );
    assert.fieldEquals(
      "FreeOrderChallengeRound",
      requestId.toString(),
      "refundDeferred",
      "true",
    );
    assert.fieldEquals(
      "FreeOrderChallengeRound",
      requestId.toString(),
      "claimed",
      "false",
    );

    handleFreeOrderChallengeRefunded(
      createFreeOrderChallengeRefundedEvent(requestId, seriesID),
    );
    assert.fieldEquals(
      "FreeOrderChallengeRound",
      requestId.toString(),
      "refundDeferred",
      "false",
    );
    assert.fieldEquals(
      "FreeOrderChallengeRound",
      requestId.toString(),
      "claimed",
      "true",
    );
    assert.entityCount("FreeOrderChallengeRefund", 2);
  });

  test("free-order challenge remains active until every configured prize is exhausted", () => {
    let seriesID = BigInt.fromI32(7);
    let firstPrizeID = BigInt.fromI32(1);
    let secondPrizeID = BigInt.fromI32(2);
    handleNewSubPrize(
      createNewSubPrizeEvent(
        seriesID,
        firstPrizeID,
        "A",
        "A1",
        BigInt.fromI32(1),
      ),
    );
    handleNewSubPrize(
      createNewSubPrizeEvent(
        seriesID,
        secondPrizeID,
        "B",
        "B1",
        BigInt.fromI32(1),
      ),
    );
    handleFreeOrderChallengeConfigured(
      createFreeOrderChallengeConfiguredEvent(
        seriesID,
        BigInt.fromI32(1),
        BigInt.fromI32(60),
        [firstPrizeID, secondPrizeID],
      ),
    );

    let configId = Bytes.fromUTF8(seriesID.toString()).toHexString();
    handleUpdatePrize(
      createUpdatePrizeEvent(
        seriesID,
        firstPrizeID,
        BigInt.zero(),
      ),
    );
    assert.fieldEquals(
      "SeriesFreeOrderChallengeConfig",
      configId,
      "active",
      "true",
    );

    handleUpdatePrize(
      createUpdatePrizeEvent(
        seriesID,
        secondPrizeID,
        BigInt.zero(),
      ),
    );
    assert.fieldEquals(
      "SeriesFreeOrderChallengeConfig",
      configId,
      "active",
      "false",
    );
  });
});
