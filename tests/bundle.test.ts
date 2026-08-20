import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
} from "matchstick-as/assembly/index";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  handleBundleRebateTierConfigured,
  handleBundleRebateTiersCleared,
  handleOpeningDiscountConfigured,
  handleOpeningDiscountApplied,
} from "../src/bundle";
import {
  createBundleRebateTierConfiguredEvent,
  createBundleRebateTiersClearedEvent,
  createOpeningDiscountConfiguredEvent,
  createOpeningDiscountAppliedEvent,
} from "./bundle-utils";

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
});
