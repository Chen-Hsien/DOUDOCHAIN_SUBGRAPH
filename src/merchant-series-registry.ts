import {
  SeriesMerchantLinked as SeriesMerchantLinkedEvent,
  SeriesMerchantRelinked as SeriesMerchantRelinkedEvent
} from "../generated/MerchantSeriesRegistry/MerchantSeriesRegistry"
import { NewSeries, SeriesMerchantCorrection } from "../generated/schema"
import { BigInt, Bytes, log } from "@graphprotocol/graph-ts"

function seriesEntityId(seriesID: BigInt): Bytes {
  return Bytes.fromUTF8(seriesID.toString())
}

export function handleSeriesMerchantLinked(
  event: SeriesMerchantLinkedEvent
): void {
  let series = NewSeries.load(seriesEntityId(event.params.seriesID))
  if (series == null) {
    log.warning(
      "SeriesMerchantLinked without indexed NewSeries: core={}, seriesID={}",
      [
        event.params.seriesContract.toHexString(),
        event.params.seriesID.toString()
      ]
    )
    return
  }

  series.merchantRef = event.params.merchantRef
  series.merchantLinkedAt = event.block.timestamp
  series.merchantUpdatedAt = event.block.timestamp
  series.merchantLinkOperator = event.params.operator
  series.merchantLinkTransactionHash = event.transaction.hash
  series.merchantRelinkCount = 0
  series.save()
}

export function handleSeriesMerchantRelinked(
  event: SeriesMerchantRelinkedEvent
): void {
  let series = NewSeries.load(seriesEntityId(event.params.seriesID))
  if (series == null) {
    log.warning(
      "SeriesMerchantRelinked without indexed NewSeries: core={}, seriesID={}",
      [
        event.params.seriesContract.toHexString(),
        event.params.seriesID.toString()
      ]
    )
    return
  }

  series.merchantRef = event.params.newMerchantRef
  series.merchantUpdatedAt = event.block.timestamp
  series.merchantLinkOperator = event.params.operator
  series.merchantLinkTransactionHash = event.transaction.hash
  series.merchantRelinkCount = series.merchantRelinkCount + 1
  series.save()

  let correction = new SeriesMerchantCorrection(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  correction.series = series.id
  correction.seriesContract = event.params.seriesContract
  correction.seriesID = event.params.seriesID
  correction.previousMerchantRef = event.params.previousMerchantRef
  correction.newMerchantRef = event.params.newMerchantRef
  correction.operator = event.params.operator
  correction.blockNumber = event.block.number
  correction.blockTimestamp = event.block.timestamp
  correction.transactionHash = event.transaction.hash
  correction.save()
}
