import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt } from "@graphprotocol/graph-ts"
import {
  BundleRebateTierConfigured,
  BundleRebateTiersCleared
} from "../generated/DoudoBundleModule/DoudoBundleModuleUpgradeable"

export function createBundleRebateTiersClearedEvent(
  seriesID: BigInt
): BundleRebateTiersCleared {
  let event = changetype<BundleRebateTiersCleared>(newMockEvent())
  event.parameters = new Array()

  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )

  return event
}

export function createBundleRebateTierConfiguredEvent(
  seriesID: BigInt,
  tierIndex: BigInt,
  minimumTicketQuantity: BigInt,
  rebatePoints: BigInt
): BundleRebateTierConfigured {
  let event = changetype<BundleRebateTierConfigured>(newMockEvent())
  event.parameters = new Array()

  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "tierIndex",
      ethereum.Value.fromUnsignedBigInt(tierIndex)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "minimumTicketQuantity",
      ethereum.Value.fromUnsignedBigInt(minimumTicketQuantity)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "rebatePoints",
      ethereum.Value.fromUnsignedBigInt(rebatePoints)
    )
  )

  return event
}
