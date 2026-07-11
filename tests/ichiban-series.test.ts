import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  dataSourceMock
} from "matchstick-as/assembly/index"
import { Bytes, DataSourceContext, dataSource } from "@graphprotocol/graph-ts"
import { handleIchibanSeries } from "../src/ichichain"

const SERIES_ID_KEY = "seriesID"
const HASH_ADDRESS = "0x516d537472696e67517479546573744861736858"

const STRING_QUANTITY_METADATA =
  '{"IchibanSeries":{"seriesId":"1","twContent":"tw","enContent":"en","twTitle":"TW title","enTitle":"EN title","thumbnailSrc":"thumb","backgroundSrc":"bg","twSubContent":"","enSubContent":""},"IchibanKuji":{"prize":[{"id":"1","type":"SP","twGroupName":"特賞","enGroupName":"Special","size":"","prizeImageSrc":"image","groupTotalQuantity":"1","twGroupDescription":"描述","enGroupDescription":"description","isBlindBox":false,"subPrize":[{"subPrizeId":"1","prizeGroup":"SP","twName":"神龍","enName":"Shenron","size":"","subPrizeImageSrc":"sub-image","quantity":"1","twDescription":"描述","enDescription":"description"}]}]}}'

const GENERIC_SERIES_METADATA =
  '{"name":"generic series","image":"ipfs://image","attributes":[],"doudo":{"type":"series","merchantId":"doudo-chain"}}'

describe("IchibanSeries IPFS handler", () => {
  afterEach(() => {
    clearStore()
    dataSourceMock.resetValues()
  })

  test("accepts prize quantities encoded as JSON strings", () => {
    let context = new DataSourceContext()
    context.setBytes(SERIES_ID_KEY, Bytes.fromUTF8("1"))
    dataSourceMock.setAddressAndContext(HASH_ADDRESS, context)

    let hash = dataSource.stringParam()
    let seriesId = Bytes.fromUTF8("1").concat(Bytes.fromUTF8(hash))

    handleIchibanSeries(Bytes.fromUTF8(STRING_QUANTITY_METADATA))

    assert.fieldEquals(
      "IchibanKujiPrize",
      seriesId.concat(Bytes.fromUTF8("SP")).toHexString(),
      "groupTotalQuantity",
      "1"
    )
    assert.fieldEquals(
      "IchibanKujiSubPrize",
      seriesId.concat(Bytes.fromUTF8("1")).toHexString(),
      "quantity",
      "1"
    )
  })

  test("saves a series stub when metadata has no legacy IchibanSeries root", () => {
    let context = new DataSourceContext()
    context.setBytes(SERIES_ID_KEY, Bytes.fromUTF8("12"))
    dataSourceMock.setAddressAndContext(HASH_ADDRESS, context)

    let hash = dataSource.stringParam()
    let seriesId = Bytes.fromUTF8("12").concat(Bytes.fromUTF8(hash))

    handleIchibanSeries(Bytes.fromUTF8(GENERIC_SERIES_METADATA))

    assert.fieldEquals(
      "IchibanSeries",
      seriesId.toHexString(),
      "belongSeries",
      Bytes.fromUTF8("12").toHexString()
    )
    assert.fieldEquals("IchibanSeries", seriesId.toHexString(), "hash", hash)
  })
})
