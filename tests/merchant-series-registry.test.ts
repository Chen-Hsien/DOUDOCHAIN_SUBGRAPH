import {
  assert,
  describe,
  test,
  clearStore,
  afterEach
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { NewSeries } from "../generated/schema"
import {
  handleSeriesMerchantLinked,
  handleSeriesMerchantRelinked,
  handleSeriesSourceTagged
} from "../src/merchant-series-registry"
import {
  createSeriesMerchantLinkedEvent,
  createSeriesMerchantRelinkedEvent,
  createSeriesSourceTaggedEvent
} from "./merchant-series-registry-utils"

const CORE = "0x00000000000000000000000000000000000000c0"
const OPERATOR = "0x00000000000000000000000000000000000000aa"
const MERCHANT_A =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const MERCHANT_B =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

function seriesEntityId(seriesID: BigInt): Bytes {
  return Bytes.fromUTF8(seriesID.toString())
}

function seedSeries(seriesID: BigInt): void {
  let series = new NewSeries(seriesEntityId(seriesID))
  series.seriesContract = Address.fromString(CORE)
  series.seriesID = seriesID
  series.seriesName = "Series"
  series.totalTicketNumbers = BigInt.fromI32(10)
  series.remainingTicketNumbers = BigInt.fromI32(10)
  series.priceInUSDTWei = BigInt.fromI32(1)
  series.priceInPoints = BigInt.fromI32(1)
  series.priceInTWD = BigInt.fromI32(100)
  series.isGoodsArrived = false
  series.estimateDeliverTime = BigInt.fromI32(1)
  series.exchangeExpireTime = BigInt.fromI32(1)
  series.exchangeTokenURI = "ipfs://exchange"
  series.unrevealTokenURI = "ipfs://unreveal"
  series.revealTokenURI = "ipfs://reveal"
  series.seriesMetaDataURI = "ipfs://series"
  series.lastPrizeOwner = []
  series.isRefund = false
  series.isPreOrder = false
  series.packingType = 0
  series.sourceType = 0
  series.blockNumber = BigInt.fromI32(1)
  series.blockTimestamp = BigInt.fromI32(1)
  series.transactionHash = Bytes.fromHexString(
    "0x1111111111111111111111111111111111111111111111111111111111111111"
  )
  series.recentIPFSHash = Bytes.empty()
  series.merchantRelinkCount = 0
  series.save()
}

describe("MerchantSeriesRegistry handlers", () => {
  afterEach(() => {
    clearStore()
  })

  test("SeriesMerchantLinked patches merchant fields onto an existing series", () => {
    let seriesID = BigInt.fromI32(7)
    seedSeries(seriesID)

    let event = createSeriesMerchantLinkedEvent(
      Address.fromString(CORE),
      seriesID,
      Bytes.fromHexString(MERCHANT_A),
      Address.fromString(OPERATOR)
    )
    event.block.timestamp = BigInt.fromI32(1234)
    handleSeriesMerchantLinked(event)

    let id = seriesEntityId(seriesID).toHexString()
    assert.fieldEquals("NewSeries", id, "merchantRef", MERCHANT_A)
    assert.fieldEquals("NewSeries", id, "merchantLinkedAt", "1234")
    assert.fieldEquals("NewSeries", id, "merchantUpdatedAt", "1234")
    assert.fieldEquals("NewSeries", id, "merchantLinkOperator", OPERATOR)
    assert.fieldEquals("NewSeries", id, "merchantRelinkCount", "0")
  })

  test("SeriesMerchantRelinked updates merchantRef and records correction history", () => {
    let seriesID = BigInt.fromI32(9)
    seedSeries(seriesID)

    let linkEvent = createSeriesMerchantLinkedEvent(
      Address.fromString(CORE),
      seriesID,
      Bytes.fromHexString(MERCHANT_A),
      Address.fromString(OPERATOR)
    )
    handleSeriesMerchantLinked(linkEvent)

    let relinkEvent = createSeriesMerchantRelinkedEvent(
      Address.fromString(CORE),
      seriesID,
      Bytes.fromHexString(MERCHANT_A),
      Bytes.fromHexString(MERCHANT_B),
      Address.fromString(OPERATOR)
    )
    relinkEvent.block.timestamp = BigInt.fromI32(5678)
    handleSeriesMerchantRelinked(relinkEvent)

    let id = seriesEntityId(seriesID).toHexString()
    assert.fieldEquals("NewSeries", id, "merchantRef", MERCHANT_B)
    assert.fieldEquals("NewSeries", id, "merchantUpdatedAt", "5678")
    assert.fieldEquals("NewSeries", id, "merchantRelinkCount", "1")
    assert.entityCount("SeriesMerchantCorrection", 1)
  })

  test("SeriesSourceTagged patches packing and source fields onto an existing series", () => {
    let seriesID = BigInt.fromI32(11)
    seedSeries(seriesID)

    let event = createSeriesSourceTaggedEvent(
      Address.fromString(CORE),
      seriesID,
      2,
      1
    )
    handleSeriesSourceTagged(event)

    let id = seriesEntityId(seriesID).toHexString()
    assert.fieldEquals("NewSeries", id, "packingType", "2")
    assert.fieldEquals("NewSeries", id, "sourceType", "1")
  })
})
