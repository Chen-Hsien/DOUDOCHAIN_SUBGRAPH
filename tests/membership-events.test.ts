import {
  afterEach,
  assert,
  clearStore,
  describe,
  test
} from "matchstick-as/assembly/index"
import { newMockEvent } from "matchstick-as"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  MembershipRenewed,
  MembershipTransferred
} from "../generated/Contract/Contract"
import { MembershipLevel, MembershipNFT } from "../generated/schema"
import {
  handleMembershipRenewed,
  handleMembershipTransferred
} from "../src/contract"

const FROM = "0x25f7f9577a93d9708234245a50a860ea5845ff0b"
const TO = "0xbdb339a291f8c059b07af00e30bb903e81c1b25e"
const TX_HASH =
  "0xca69325f50eb7c152edb35078874d52de3e6eb171e7e9b2268fddac77deb2c00"

function bytesId(value: string): string {
  return Bytes.fromUTF8(value).toHexString()
}

function saveMembership(tokenId: i32, owner: Address, expiryDate: i32): void {
  let levelId = Bytes.fromUTF8("3")
  let level = new MembershipLevel(levelId)
  level.levelIndex = BigInt.fromI32(3)
  level.name = "Platinum"
  level.threshold = BigInt.fromI32(10000)
  level.membershipTokenURI = "ipfs://platinum.json"
  level.rewardBasisPoints = BigInt.fromI32(100)
  level.isActive = true
  level.totalMembers = BigInt.fromI32(1)
  level.createdAt = BigInt.fromI32(1)
  level.blockNumber = BigInt.fromI32(1)
  level.blockTimestamp = BigInt.fromI32(1)
  level.transactionHash = Bytes.empty()
  level.save()

  let membership = new MembershipNFT(Bytes.fromUTF8(tokenId.toString()))
  membership.tokenId = BigInt.fromI32(tokenId)
  membership.owner = owner
  membership.level = levelId
  membership.expiryDate = BigInt.fromI32(expiryDate)
  membership.isActive = true
  membership.lastActivityTime = BigInt.fromI32(1)
  membership.createdAt = BigInt.fromI32(1)
  membership.blockNumber = BigInt.fromI32(1)
  membership.blockTimestamp = BigInt.fromI32(1)
  membership.transactionHash = Bytes.empty()
  membership.save()
}

function createMembershipTransferredEvent(): MembershipTransferred {
  let event = changetype<MembershipTransferred>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam(
      "from",
      ethereum.Value.fromAddress(Address.fromString(FROM))
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "to",
      ethereum.Value.fromAddress(Address.fromString(TO))
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(268))
    )
  )
  event.parameters.push(
    new ethereum.EventParam("levelName", ethereum.Value.fromString("Platinum"))
  )
  event.transaction.hash = Bytes.fromHexString(TX_HASH)
  event.logIndex = BigInt.fromI32(10)
  event.block.number = BigInt.fromI32(298081422)
  return event
}

function createMembershipRenewedEvent(
  tokenId: i32,
  newExpiryDate: i32
): MembershipRenewed {
  let event = changetype<MembershipRenewed>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam(
      "user",
      ethereum.Value.fromAddress(Address.fromString(TO))
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(tokenId))
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "newExpiryDate",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(newExpiryDate))
    )
  )
  return event
}

describe("DOUDOCOINNFT membership event handlers", () => {
  afterEach(() => {
    clearStore()
  })

  test("indexes the transferred membership token and updates its owner", () => {
    saveMembership(268, Address.fromString(FROM), 2000)
    let event = createMembershipTransferredEvent()
    let eventId = event.transaction.hash
      .concatI32(event.logIndex.toI32())
      .toHexString()

    handleMembershipTransferred(event)

    assert.fieldEquals("MembershipNFT", bytesId("268"), "owner", TO)
    assert.fieldEquals("MembershipTransferred", eventId, "tokenId", "268")
    assert.fieldEquals(
      "MembershipTransferred",
      eventId,
      "membershipNFT",
      bytesId("268")
    )
    assert.fieldEquals("MembershipTransferred", eventId, "from", FROM)
    assert.fieldEquals("MembershipTransferred", eventId, "to", TO)
  })

  test("indexes all required renewal fields and preserves the old expiry", () => {
    saveMembership(268, Address.fromString(TO), 2000)
    let event = createMembershipRenewedEvent(268, 3000)
    let eventId = event.transaction.hash
      .concatI32(event.logIndex.toI32())
      .toHexString()

    handleMembershipRenewed(event)

    assert.fieldEquals("MembershipNFT", bytesId("268"), "expiryDate", "3000")
    assert.fieldEquals("MembershipRenewed", eventId, "user", TO)
    assert.fieldEquals("MembershipRenewed", eventId, "tokenId", "268")
    assert.fieldEquals("MembershipRenewed", eventId, "newExpiryDate", "3000")
    assert.fieldEquals(
      "MembershipRenewed",
      eventId,
      "previousExpiryDate",
      "2000"
    )
  })
})
