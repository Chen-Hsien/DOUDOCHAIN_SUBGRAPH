import {
  afterEach,
  assert,
  clearStore,
  describe,
  test
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import { MembershipLevel, VoucherType } from "../generated/schema"
import {
  handleLegacyMembershipMigrated,
  handleLegacyVoucherMigrated
} from "../src/contract"
import {
  createLegacyMembershipMigratedEvent,
  createLegacyVoucherMigratedEvent
} from "./contract-migration-utils"

const OWNER = "0x0000000000000000000000000000000000000123"

function entityId(value: string): Bytes {
  return Bytes.fromUTF8(value)
}

function bytesId(value: string): string {
  return entityId(value).toHexString()
}

function saveMembershipLevel(levelIndex: i32): void {
  let level = new MembershipLevel(entityId(levelIndex.toString()))
  level.levelIndex = BigInt.fromI32(levelIndex)
  level.name = "Silver"
  level.threshold = BigInt.fromI32(9000)
  level.membershipTokenURI = "ipfs://silver.json"
  level.rewardBasisPoints = BigInt.fromI32(25)
  level.isActive = true
  level.totalMembers = BigInt.zero()
  level.createdAt = BigInt.zero()
  level.blockNumber = BigInt.zero()
  level.blockTimestamp = BigInt.zero()
  level.transactionHash = Bytes.empty()
  level.save()
}

function saveVoucherType(voucherTypeId: i32): void {
  let voucherType = new VoucherType(entityId(voucherTypeId.toString()))
  voucherType.voucherTypeId = BigInt.fromI32(voucherTypeId)
  voucherType.amount = BigInt.fromI32(100)
  voucherType.maxPerUser = BigInt.fromI32(3)
  voucherType.tokenURI = "ipfs://voucher.json"
  voucherType.isActive = true
  voucherType.totalMinted = BigInt.zero()
  voucherType.createdAt = BigInt.zero()
  voucherType.blockNumber = BigInt.zero()
  voucherType.blockTimestamp = BigInt.zero()
  voucherType.transactionHash = Bytes.empty()
  voucherType.save()
}

describe("DOUDOCOINNFT migration handlers", () => {
  afterEach(() => {
    clearStore()
  })

  test("materializes migrated membership state and preserves expiry semantics", () => {
    saveMembershipLevel(2)
    let owner = Address.fromString(OWNER)

    handleLegacyMembershipMigrated(
      createLegacyMembershipMigratedEvent(129, owner, 2, 100, 200)
    )

    assert.fieldEquals("MembershipNFT", bytesId("129"), "owner", OWNER)
    assert.fieldEquals("MembershipNFT", bytesId("129"), "level", bytesId("2"))
    assert.fieldEquals("MembershipNFT", bytesId("129"), "lastActivityTime", "100")
    assert.fieldEquals("MembershipNFT", bytesId("129"), "expiryDate", "15552100")
    assert.fieldEquals("MembershipNFT", bytesId("129"), "isActive", "true")
    assert.fieldEquals("MembershipLevel", bytesId("2"), "totalMembers", "1")
  })

  test("marks already expired migrated memberships inactive", () => {
    saveMembershipLevel(2)
    handleLegacyMembershipMigrated(
      createLegacyMembershipMigratedEvent(
        130,
        Address.fromString(OWNER),
        2,
        100,
        15552101
      )
    )

    assert.fieldEquals("MembershipNFT", bytesId("130"), "isActive", "false")
  })

  test("keeps memberships without prior activity active like the contract", () => {
    saveMembershipLevel(2)
    handleLegacyMembershipMigrated(
      createLegacyMembershipMigratedEvent(
        131,
        Address.fromString(OWNER),
        2,
        0,
        20000000
      )
    )

    assert.fieldEquals("MembershipNFT", bytesId("131"), "isActive", "true")
    assert.fieldEquals("MembershipNFT", bytesId("131"), "expiryDate", "35552000")
  })

  test("materializes migrated vouchers and updates their type count", () => {
    saveVoucherType(4)
    handleLegacyVoucherMigrated(
      createLegacyVoucherMigratedEvent(64, Address.fromString(OWNER), 4)
    )

    assert.fieldEquals("Voucher", bytesId("64"), "owner", OWNER)
    assert.fieldEquals("Voucher", bytesId("64"), "voucherType", bytesId("4"))
    assert.fieldEquals("Voucher", bytesId("64"), "isRedeemed", "false")
    assert.fieldEquals("VoucherType", bytesId("4"), "totalMinted", "1")
  })
})
