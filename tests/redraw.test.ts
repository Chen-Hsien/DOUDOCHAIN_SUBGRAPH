import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"
import { handleRedrawMainConfigUpdated } from "../src/redraw"
import { createRedrawMainConfigUpdatedEvent } from "./redraw-utils"

function configId(seriesID: BigInt): string {
  return Bytes.fromUTF8(seriesID.toString()).toHexString()
}

describe("Redraw config handlers", () => {
  afterEach(() => {
    clearStore()
  })

  test("stores main burn and mint counts from RedrawMainConfigUpdated", () => {
    let seriesID = BigInt.fromI32(7)

    handleRedrawMainConfigUpdated(
      createRedrawMainConfigUpdatedEvent(seriesID, 2, 1)
    )

    assert.entityCount("RedrawConfig", 1)
    assert.fieldEquals(
      "RedrawConfig",
      configId(seriesID),
      "seriesID",
      "7"
    )
    assert.fieldEquals(
      "RedrawConfig",
      configId(seriesID),
      "mainBurnCount",
      "2"
    )
    assert.fieldEquals(
      "RedrawConfig",
      configId(seriesID),
      "mainMintCount",
      "1"
    )
    assert.fieldEquals(
      "RedrawConfig",
      configId(seriesID),
      "consolationBurnCount",
      "0"
    )
    assert.fieldEquals(
      "RedrawConfig",
      configId(seriesID),
      "enabled",
      "false"
    )
  })
})
