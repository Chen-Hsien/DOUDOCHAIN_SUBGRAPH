import { newMockEvent } from "matchstick-as"
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts"
import {
  LegacyMembershipMigrated,
  LegacyVoucherMigrated
} from "../generated/Contract/Contract"

export function createLegacyMembershipMigratedEvent(
  tokenId: i32,
  owner: Address,
  membershipLevel: i32,
  lastActiveTimestamp: i32,
  blockTimestamp: i32
): LegacyMembershipMigrated {
  let event = changetype<LegacyMembershipMigrated>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(tokenId))
    )
  )
  event.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  event.parameters.push(
    new ethereum.EventParam(
      "membershipLevel",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(membershipLevel))
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "totalRedeemed",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000))
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "currentRoundRedeemed",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(500))
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "lastActiveTimestamp",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(lastActiveTimestamp))
    )
  )
  event.block.timestamp = BigInt.fromI32(blockTimestamp)
  return event
}

export function createLegacyVoucherMigratedEvent(
  tokenId: i32,
  owner: Address,
  voucherTypeId: i32
): LegacyVoucherMigrated {
  let event = changetype<LegacyVoucherMigrated>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(tokenId))
    )
  )
  event.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  event.parameters.push(
    new ethereum.EventParam(
      "voucherTypeId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(voucherTypeId))
    )
  )
  return event
}
