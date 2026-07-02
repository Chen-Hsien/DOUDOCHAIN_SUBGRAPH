import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  handleBundleRebateTierConfigured,
  handleBundleRebateTiersCleared
} from "../src/bundle"
import {
  createBundleRebateTierConfiguredEvent,
  createBundleRebateTiersClearedEvent
} from "./bundle-utils"

function rebateTierId(seriesID: BigInt, tierIndex: BigInt): string {
  return Bytes.fromUTF8(
    seriesID.toString().concat("-").concat(tierIndex.toString())
  ).toHexString()
}

function clearRebateTiers(seriesID: BigInt): void {
  handleBundleRebateTiersCleared(createBundleRebateTiersClearedEvent(seriesID))
}

function configureRebateTier(
  seriesID: BigInt,
  tierIndex: i32,
  minimumTicketQuantity: i32,
  rebatePoints: i32
): void {
  handleBundleRebateTierConfigured(
    createBundleRebateTierConfiguredEvent(
      seriesID,
      BigInt.fromI32(tierIndex),
      BigInt.fromI32(minimumTicketQuantity),
      BigInt.fromI32(rebatePoints)
    )
  )
}

describe("Bundle rebate handlers", () => {
  afterEach(() => {
    clearStore()
  })

  test("clearing and reconfiguring rebate tiers leaves only the latest tiers queryable", () => {
    let seriesID = BigInt.fromI32(9)

    clearRebateTiers(seriesID)
    configureRebateTier(seriesID, 0, 3, 500)
    configureRebateTier(seriesID, 1, 6, 700)

    clearRebateTiers(seriesID)
    configureRebateTier(seriesID, 0, 3, 100)
    configureRebateTier(seriesID, 1, 6, 350)

    assert.entityCount("SeriesRebateTier", 2)
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(0)),
      "configVersion",
      "2"
    )
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(0)),
      "minimumTicketQuantity",
      "3"
    )
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(0)),
      "rebatePoints",
      "100"
    )
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(1)),
      "minimumTicketQuantity",
      "6"
    )
    assert.fieldEquals(
      "SeriesRebateTier",
      rebateTierId(seriesID, BigInt.fromI32(1)),
      "rebatePoints",
      "350"
    )
  })
})
