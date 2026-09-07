import {
  afterEach,
  assert,
  clearStore,
  describe,
  test
} from "matchstick-as/assembly/index"
import { newMockEvent } from "matchstick-as"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { Transfer } from "../generated/Contract/Contract"
import {
  MembershipLevel,
  MembershipNFT,
  Voucher,
  VoucherType
} from "../generated/schema"
import { handleTransfer } from "../src/contract"

const OWNER = "0x0000000000000000000000000000000000000123"
const RECIPIENT = "0x0000000000000000000000000000000000000456"

function id(value: string): Bytes {
  return Bytes.fromUTF8(value)
}

function saveVoucher(tokenId: i32): void {
  let voucherType = new VoucherType(id("10"))
  voucherType.voucherTypeId = BigInt.fromI32(10)
  voucherType.amount = BigInt.fromI32(10000)
  voucherType.maxPerUser = BigInt.fromI32(1)
  voucherType.tokenURI = "ipfs://voucher.json"
  voucherType.isActive = true
  voucherType.totalMinted = BigInt.fromI32(1)
  voucherType.createdAt = BigInt.fromI32(1)
  voucherType.blockNumber = BigInt.fromI32(1)
  voucherType.blockTimestamp = BigInt.fromI32(1)
  voucherType.transactionHash = Bytes.empty()
  voucherType.save()

  let voucher = new Voucher(id(tokenId.toString()))
  voucher.tokenId = BigInt.fromI32(tokenId)
  voucher.owner = Address.fromString(OWNER)
  voucher.voucherType = voucherType.id
  voucher.isRedeemed = false
  voucher.createdAt = BigInt.fromI32(1)
  voucher.blockNumber = BigInt.fromI32(1)
  voucher.blockTimestamp = BigInt.fromI32(1)
  voucher.transactionHash = Bytes.empty()
  voucher.save()
}

function saveMembership(tokenId: i32): void {
  let level = new MembershipLevel(id("5"))
  level.levelIndex = BigInt.fromI32(5)
  level.name = "Emerald"
  level.threshold = BigInt.fromI32(180000)
  level.membershipTokenURI = "ipfs://emerald.json"
  level.rewardBasisPoints = BigInt.fromI32(250)
  level.isActive = true
  level.totalMembers = BigInt.fromI32(1)
  level.createdAt = BigInt.fromI32(1)
  level.blockNumber = BigInt.fromI32(1)
  level.blockTimestamp = BigInt.fromI32(1)
  level.transactionHash = Bytes.empty()
  level.save()

  let membership = new MembershipNFT(id(tokenId.toString()))
  membership.tokenId = BigInt.fromI32(tokenId)
  membership.owner = Address.fromString(OWNER)
  membership.level = level.id
  membership.expiryDate = BigInt.fromI32(2000)
  membership.isActive = true
  membership.lastActivityTime = BigInt.fromI32(1)
  membership.createdAt = BigInt.fromI32(1)
  membership.blockNumber = BigInt.fromI32(1)
  membership.blockTimestamp = BigInt.fromI32(1)
  membership.transactionHash = Bytes.empty()
  membership.save()
}

function transferEvent(tokenId: i32, to: Address): Transfer {
  let event = changetype<Transfer>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam(
      "from",
      ethereum.Value.fromAddress(Address.fromString(OWNER))
    )
  )
  event.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  event.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(tokenId))
    )
  )
  event.block.timestamp = BigInt.fromI32(100)
  return event
}

describe("DOUDOCOINNFT Transfer reconciliation", () => {
  afterEach(() => {
    clearStore()
  })

  test("removes a burned voucher from its previous owner", () => {
    saveVoucher(288)
    let zeroAddress = Address.zero()
    let entityId = id("288").toHexString()
    handleTransfer(transferEvent(288, zeroAddress))

    assert.fieldEquals("Voucher", entityId, "owner", zeroAddress.toHexString())
    assert.fieldEquals("Voucher", entityId, "isRedeemed", "true")
    assert.fieldEquals("Voucher", entityId, "redeemedAt", "100")
  })

  test("reconciles a transferred membership owner", () => {
    saveMembership(275)
    handleTransfer(transferEvent(275, Address.fromString(RECIPIENT)))

    assert.fieldEquals("MembershipNFT", id("275").toHexString(), "owner", RECIPIENT)
    assert.fieldEquals("MembershipNFT", id("275").toHexString(), "isActive", "true")
  })

  test("marks a burned membership inactive", () => {
    saveMembership(275)
    let zeroAddress = Address.zero()
    let entityId = id("275").toHexString()
    handleTransfer(transferEvent(275, zeroAddress))

    assert.fieldEquals("MembershipNFT", entityId, "owner", zeroAddress.toHexString())
    assert.fieldEquals("MembershipNFT", entityId, "isActive", "false")
  })
})
