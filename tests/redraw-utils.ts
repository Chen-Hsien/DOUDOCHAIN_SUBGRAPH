import { newMockEvent } from "matchstick-as"
import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts"
import {
  RedrawMainConfigUpdated,
  RedrawMinted
} from "../generated/DoudoRedrawModule/DoudoRedrawModuleUpgradeable"

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

export function createRedrawMintedEvent(
  seriesID: BigInt,
  user: Address,
  quantity: BigInt,
  firstTokenID: BigInt
): RedrawMinted {
  let event = changetype<RedrawMinted>(newMockEvent())
  event.parameters = new Array()

  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "user",
      ethereum.Value.fromAddress(user)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "quantity",
      ethereum.Value.fromUnsignedBigInt(quantity)
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "firstTokenID",
      ethereum.Value.fromUnsignedBigInt(firstTokenID)
    )
  )

  return event
}
