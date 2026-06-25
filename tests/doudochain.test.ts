import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import { Approval } from "../generated/ICHICHAIN/ICHICHAIN"
import { handleApproval } from "../src/ichichain"
import { newMockEvent } from "matchstick-as"

function createApprovalEvent(
  owner: Address,
  approved: Address,
  tokenId: BigInt
): Approval {
  let approvalEvent = changetype<Approval>(newMockEvent())
  approvalEvent.parameters = new Array()

  approvalEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromAddress(approved))
  )
  approvalEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return approvalEvent
}

describe("ICHICHAIN handlers", () => {
  beforeAll(() => {
    let owner = Address.fromString("0x0000000000000000000000000000000000000001")
    let approved = Address.fromString(
      "0x0000000000000000000000000000000000000002"
    )
    let tokenId = BigInt.fromI32(234)
    let event = createApprovalEvent(owner, approved, tokenId)
    handleApproval(event)
  })

  afterAll(() => {
    clearStore()
  })

  test("Approval created and stored", () => {
    assert.entityCount("Approval", 1)

    let id = Bytes.fromHexString(
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a"
    ).concatI32(1)

    assert.fieldEquals(
      "Approval",
      id.toHexString(),
      "owner",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "Approval",
      id.toHexString(),
      "approved",
      "0x0000000000000000000000000000000000000002"
    )
    assert.fieldEquals("Approval", id.toHexString(), "tokenId", "234")
  })
})
