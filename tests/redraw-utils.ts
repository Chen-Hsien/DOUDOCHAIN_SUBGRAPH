import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt } from "@graphprotocol/graph-ts"
import { RedrawMainConfigUpdated } from "../generated/DoudoRedrawModule/DoudoRedrawModuleUpgradeable"

export function createRedrawMainConfigUpdatedEvent(
  seriesID: BigInt,
  mainBurnCount: i32,
  mainMintCount: i32
): RedrawMainConfigUpdated {
  let event = changetype<RedrawMainConfigUpdated>(newMockEvent())
  event.parameters = new Array()

  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "mainBurnCount",
      ethereum.Value.fromI32(mainBurnCount)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "mainMintCount",
      ethereum.Value.fromI32(mainMintCount)
    )
  )

  return event
}
