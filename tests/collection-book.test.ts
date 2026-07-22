import {
  afterEach,
  assert,
  clearStore,
  describe,
  test
} from "matchstick-as/assembly/index"
import { newMockEvent } from "matchstick-as"
import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { CollectionBookExpirationUpdated } from "../generated/CollectionBookUpgradeable/CollectionBookUpgradeable"
import { handleCollectionBookExpirationUpdated } from "../src/collection-book"

function expirationEvent(
  bookId: i32,
  expiresAt: i32
): CollectionBookExpirationUpdated {
  let event = changetype<CollectionBookExpirationUpdated>(newMockEvent())
  event.parameters = new Array()
  event.parameters.push(
    new ethereum.EventParam(
      "bookId",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(bookId))
    )
  )
  event.parameters.push(
    new ethereum.EventParam(
      "expiresAt",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(expiresAt))
    )
  )
  return event
}

describe("Collection Book expiration handlers", () => {
  afterEach(() => {
    clearStore()
  })

  test("indexes the chain deadline and supports resetting it to no expiry", () => {
    let id = Bytes.fromUTF8("7").toHexString()

    handleCollectionBookExpirationUpdated(expirationEvent(7, 1800000000))
    assert.fieldEquals("CollectionBook", id, "expiresAt", "1800000000")

    handleCollectionBookExpirationUpdated(expirationEvent(7, 0))
    assert.fieldEquals("CollectionBook", id, "expiresAt", "0")
  })
})
