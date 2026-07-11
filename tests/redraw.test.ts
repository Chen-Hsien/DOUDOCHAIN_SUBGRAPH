import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as"
import { RevealDrawSent } from "../generated/ICHICHAIN/ICHICHAIN"
import { handleRevealDrawSent } from "../src/onChainData"
import { handleRedrawMainConfigUpdated, handleRedrawMinted } from "../src/redraw"
import {
  createRedrawMainConfigUpdatedEvent,
  createRedrawMintedEvent
} from "./redraw-utils"

function configId(seriesID: BigInt): string {
  return Bytes.fromUTF8(seriesID.toString()).toHexString()
}

function createCoreRevealDrawSentEvent(
  requestId: BigInt,
  tokenIDs: Array<BigInt>
): RevealDrawSent {
  let event = changetype<RevealDrawSent>(newMockEvent())
  event.parameters = new Array()

  event.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "tokenIDs",
      ethereum.Value.fromUnsignedBigIntArray(tokenIDs)
    )
  )

  return event
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

  test("links automatic redraw reveal requests back to the redraw mint", () => {
    let firstBatch = new Array<BigInt>()
    for (let i = 21; i < 41; i++) {
      firstBatch.push(BigInt.fromI32(i))
    }

    let secondBatch = new Array<BigInt>()
    secondBatch.push(BigInt.fromI32(41))

    handleRevealDrawSent(createCoreRevealDrawSentEvent(BigInt.fromI32(7), firstBatch))
    handleRevealDrawSent(createCoreRevealDrawSentEvent(BigInt.fromI32(8), secondBatch))

    let redrawEvent = createRedrawMintedEvent(
      BigInt.fromI32(3),
      Address.fromString("0x00000000000000000000000000000000000000aa"),
      BigInt.fromI32(21),
      BigInt.fromI32(21)
    )
    let redrawMintId = redrawEvent.transaction.hash
      .concatI32(redrawEvent.logIndex.toI32())
      .toHexString()

    handleRedrawMinted(redrawEvent)

    assert.fieldEquals(
      "RevealDrawSent",
      Bytes.fromUTF8("7").toHexString(),
      "source",
      "REDRAW_MAIN"
    )
    assert.fieldEquals(
      "RevealDrawSent",
      Bytes.fromUTF8("7").toHexString(),
      "redrawMint",
      redrawMintId
    )
    assert.fieldEquals(
      "RevealDrawSent",
      Bytes.fromUTF8("7").toHexString(),
      "redrawBatchIndex",
      "0"
    )

    assert.fieldEquals(
      "RevealDrawSent",
      Bytes.fromUTF8("8").toHexString(),
      "source",
      "REDRAW_MAIN"
    )
    assert.fieldEquals(
      "RevealDrawSent",
      Bytes.fromUTF8("8").toHexString(),
      "redrawMint",
      redrawMintId
    )
    assert.fieldEquals(
      "RevealDrawSent",
      Bytes.fromUTF8("8").toHexString(),
      "redrawBatchIndex",
      "1"
    )
  })
})
