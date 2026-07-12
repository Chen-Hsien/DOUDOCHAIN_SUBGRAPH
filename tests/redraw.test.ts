import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { newMockEvent } from "matchstick-as"
import {
  RevealDrawFulfilled,
  RevealDrawSent
} from "../generated/ICHICHAIN/ICHICHAIN"
import {
  handleRevealDrawFulfilled,
  handleRevealDrawSent
} from "../src/onChainData"
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

function createCoreRevealDrawFulfilledEvent(
  requestId: BigInt,
  seriesID: BigInt,
  randomWords: Array<BigInt>
): RevealDrawFulfilled {
  let event = changetype<RevealDrawFulfilled>(newMockEvent())
  event.parameters = new Array()

  event.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "randomWords",
      ethereum.Value.fromUnsignedBigIntArray(randomWords)
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

  test("materializes per-series reveal proof and token summaries", () => {
    let seriesID = BigInt.fromI32(3)
    let firstSentTx = Bytes.fromHexString(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    )
    let secondSentTx = Bytes.fromHexString(
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    )

    let firstSent = createCoreRevealDrawSentEvent(BigInt.fromI32(71), [
      BigInt.fromI32(501),
      BigInt.fromI32(502)
    ])
    firstSent.block.number = BigInt.fromI32(10)
    firstSent.block.timestamp = BigInt.fromI32(100)
    firstSent.transaction.hash = firstSentTx
    handleRevealDrawSent(firstSent)

    let firstFulfilled = createCoreRevealDrawFulfilledEvent(
      BigInt.fromI32(71),
      seriesID,
      [BigInt.fromI32(111)]
    )
    firstFulfilled.logIndex = BigInt.fromI32(10)
    handleRevealDrawFulfilled(firstFulfilled)

    let summaryId = Bytes.fromUTF8("3").toHexString()
    assert.fieldEquals("SeriesRevealSummary", summaryId, "series", summaryId)
    assert.fieldEquals("SeriesRevealSummary", summaryId, "proofCount", "1")
    assert.fieldEquals("SeriesRevealSummary", summaryId, "tokenCount", "2")
    assert.fieldEquals(
      "SeriesRevealSummary",
      summaryId,
      "latestBlockTimestamp",
      "100"
    )
    assert.fieldEquals(
      "SeriesRevealSummary",
      summaryId,
      "latestTransactionHash",
      firstSentTx.toHexString()
    )

    let firstTokenId = Bytes.fromUTF8("71").concatI32(0).toHexString()
    let firstTicketId = Bytes.fromUTF8("501").toHexString()
    assert.fieldEquals(
      "SeriesRevealToken",
      firstTokenId,
      "summary",
      summaryId
    )
    assert.fieldEquals("SeriesRevealToken", firstTokenId, "seriesID", "3")
    assert.fieldEquals("SeriesRevealToken", firstTokenId, "tokenID", "501")
    assert.fieldEquals(
      "SeriesRevealToken",
      firstTokenId,
      "ticket",
      firstTicketId
    )
    assert.fieldEquals("SeriesRevealToken", firstTokenId, "blockNumber", "10")
    assert.fieldEquals(
      "SeriesRevealToken",
      firstTokenId,
      "transactionHash",
      firstSentTx.toHexString()
    )

    let secondSent = createCoreRevealDrawSentEvent(BigInt.fromI32(72), [
      BigInt.fromI32(501),
      BigInt.fromI32(503)
    ])
    secondSent.block.number = BigInt.fromI32(20)
    secondSent.block.timestamp = BigInt.fromI32(200)
    secondSent.transaction.hash = secondSentTx
    handleRevealDrawSent(secondSent)

    let secondFulfilled = createCoreRevealDrawFulfilledEvent(
      BigInt.fromI32(72),
      seriesID,
      [BigInt.fromI32(222)]
    )
    secondFulfilled.logIndex = BigInt.fromI32(11)
    handleRevealDrawFulfilled(secondFulfilled)

    assert.fieldEquals("SeriesRevealSummary", summaryId, "proofCount", "2")
    assert.fieldEquals("SeriesRevealSummary", summaryId, "tokenCount", "4")
    assert.fieldEquals(
      "SeriesRevealSummary",
      summaryId,
      "latestBlockTimestamp",
      "200"
    )
    assert.fieldEquals(
      "SeriesRevealSummary",
      summaryId,
      "latestTransactionHash",
      secondSentTx.toHexString()
    )
    assert.entityCount("SeriesRevealToken", 4)
  })

  test("does not create a ghost reveal summary without the sent event", () => {
    let fulfilled = createCoreRevealDrawFulfilledEvent(
      BigInt.fromI32(999),
      BigInt.fromI32(3),
      [BigInt.fromI32(222)]
    )

    handleRevealDrawFulfilled(fulfilled)

    assert.entityCount("SeriesRevealSummary", 0)
    assert.entityCount("SeriesRevealToken", 0)
  })
})
