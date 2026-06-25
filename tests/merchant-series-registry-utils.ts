import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  SeriesMerchantLinked,
  SeriesMerchantRelinked
} from "../generated/MerchantSeriesRegistry/MerchantSeriesRegistry"

export function createSeriesMerchantLinkedEvent(
  seriesContract: Address,
  seriesID: BigInt,
  merchantRef: Bytes,
  operator: Address
): SeriesMerchantLinked {
  let event = changetype<SeriesMerchantLinked>(newMockEvent())
  event.parameters = new Array()

  event.parameters.push(
    new ethereum.EventParam(
      "seriesContract",
      ethereum.Value.fromAddress(seriesContract)
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
      "merchantRef",
      ethereum.Value.fromFixedBytes(merchantRef)
    )
  )
  event.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )

  return event
}

export function createSeriesMerchantRelinkedEvent(
  seriesContract: Address,
  seriesID: BigInt,
  previousMerchantRef: Bytes,
  newMerchantRef: Bytes,
  operator: Address
): SeriesMerchantRelinked {
  let event = changetype<SeriesMerchantRelinked>(newMockEvent())
  event.parameters = new Array()

  event.parameters.push(
    new ethereum.EventParam(
      "seriesContract",
      ethereum.Value.fromAddress(seriesContract)
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
      "previousMerchantRef",
      ethereum.Value.fromFixedBytes(previousMerchantRef)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "newMerchantRef",
      ethereum.Value.fromFixedBytes(newMerchantRef)
    )
  )
  event.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )

  return event
}
