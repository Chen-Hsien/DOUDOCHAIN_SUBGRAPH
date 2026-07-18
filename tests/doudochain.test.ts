import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts"
import {
  Approval,
  LastPrizeWinner,
  NewSubPrize,
  NewSeries,
  UpdatePrize,
  UpdateSeriesInformation
} from "../generated/ICHICHAIN/ICHICHAIN"
import {
  handleApproval,
  handleLastPrizeWinner,
  handleNewSubPrize,
  handleNewSeries,
  handleUpdatePrize,
  handleUpdateSeriesInformation
} from "../src/ichichain"
import { newMockEvent } from "matchstick-as"
import {
  createNewSubPrizeEvent,
  createNewSeriesEvent,
  createUpdatePrizeEvent,
  createUpdateSeriesInformationEvent
} from "./doudochain-utils"

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

function createLastPrizeWinnerEvent(
  requestId: BigInt,
  randomWord: Array<BigInt>
): LastPrizeWinner {
  let lastPrizeWinnerEvent = changetype<LastPrizeWinner>(newMockEvent())
  lastPrizeWinnerEvent.parameters = new Array()

  lastPrizeWinnerEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  lastPrizeWinnerEvent.parameters.push(
    new ethereum.EventParam(
      "randomWord",
      ethereum.Value.fromUnsignedBigIntArray(randomWord)
    )
  )

  return lastPrizeWinnerEvent
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

  test("LastPrizeWinner uses event id so repeated requestId zero does not collide", () => {
    clearStore()

    let firstEvent = createLastPrizeWinnerEvent(BigInt.zero(), [
      BigInt.fromI32(267)
    ])
    firstEvent.logIndex = BigInt.fromI32(46)
    let secondEvent = createLastPrizeWinnerEvent(BigInt.zero(), [
      BigInt.fromI32(268)
    ])
    secondEvent.logIndex = BigInt.fromI32(47)

    handleLastPrizeWinner(firstEvent)
    handleLastPrizeWinner(secondEvent)

    let firstId = firstEvent.transaction.hash.concatI32(
      firstEvent.logIndex.toI32()
    )
    let secondId = secondEvent.transaction.hash.concatI32(
      secondEvent.logIndex.toI32()
    )

    assert.entityCount("LastPrizeWinner", 2)
    assert.fieldEquals(
      "LastPrizeWinner",
      firstId.toHexString(),
      "requestId",
      "0"
    )
    assert.fieldEquals(
      "LastPrizeWinner",
      firstId.toHexString(),
      "randomWord",
      "[267]"
    )
    assert.fieldEquals(
      "LastPrizeWinner",
      secondId.toHexString(),
      "requestId",
      "0"
    )
    assert.fieldEquals(
      "LastPrizeWinner",
      secondId.toHexString(),
      "randomWord",
      "[268]"
    )
  })

  test("NewSubPrize IDs separate series and prize numbers", () => {
    clearStore()

    handleNewSubPrize(
      changetype<NewSubPrize>(
        createNewSubPrizeEvent(
          BigInt.fromI32(1),
          BigInt.fromI32(23),
          "A",
          "series 1 prize 23",
          BigInt.fromI32(1)
        )
      )
    )
    handleNewSubPrize(
      changetype<NewSubPrize>(
        createNewSubPrizeEvent(
          BigInt.fromI32(12),
          BigInt.fromI32(3),
          "B",
          "series 12 prize 3",
          BigInt.fromI32(1)
        )
      )
    )

    assert.entityCount("NewSubPrize", 2)
    assert.fieldEquals(
      "NewSubPrize",
      Bytes.fromUTF8("1-23").toHexString(),
      "seriesID",
      "1"
    )
    assert.fieldEquals(
      "NewSubPrize",
      Bytes.fromUTF8("12-3").toHexString(),
      "seriesID",
      "12"
    )

    handleUpdatePrize(
      changetype<UpdatePrize>(
        createUpdatePrizeEvent(
          BigInt.fromI32(1),
          BigInt.fromI32(23),
          BigInt.fromI32(7)
        )
      )
    )
    assert.fieldEquals(
      "NewSubPrize",
      Bytes.fromUTF8("1-23").toHexString(),
      "subPrizeRemainingQuantity",
      "7"
    )
  })

  test("NewSeries accepts ipfs scheme metadata URIs", () => {
    clearStore()

    let seriesId = BigInt.fromI32(12)
    let metadataHash = "QmNvKoUciLngtreMGz1xfAdgQE1erehahG87juvUS5k6i1"
    let owner = Address.fromString("0x0000000000000000000000000000000000000001")
    let event = createNewSeriesEvent(
      seriesId,
      "ipfs series",
      BigInt.fromI32(60),
      BigInt.fromI32(60),
      BigInt.fromI32(100),
      BigInt.fromI32(0),
      false,
      BigInt.zero(),
      BigInt.zero(),
      "ipfs://QmExchange/",
      "ipfs://QmUnreveal",
      "ipfs://QmReveal/",
      "ipfs://".concat(metadataHash),
      owner,
      false,
      false
    )

    handleNewSeries(changetype<NewSeries>(event))

    let id = Bytes.fromUTF8("12")
    let expectedIchibanSeries = id.concat(Bytes.fromUTF8(metadataHash))

    assert.fieldEquals(
      "NewSeries",
      id.toHexString(),
      "recentIPFSHash",
      Bytes.fromUTF8(metadataHash).toHexString()
    )
    assert.fieldEquals(
      "NewSeries",
      id.toHexString(),
      "currentIchibanSeries",
      expectedIchibanSeries.toHexString()
    )
  })

  test("UpdateSeriesInformation accepts ipfs scheme metadata URIs", () => {
    clearStore()

    let seriesId = BigInt.fromI32(12)
    let owner = Address.fromString("0x0000000000000000000000000000000000000001")
    handleNewSeries(
      changetype<NewSeries>(
        createNewSeriesEvent(
        seriesId,
        "ipfs series",
        BigInt.fromI32(60),
        BigInt.fromI32(60),
        BigInt.fromI32(100),
        BigInt.fromI32(0),
        false,
        BigInt.zero(),
        BigInt.zero(),
        "https://gateway.example/ipfs/QmExchange",
        "https://gateway.example/ipfs/QmUnreveal",
        "https://gateway.example/ipfs/QmReveal/",
        "https://gateway.example/ipfs/QmOldMetadata",
        owner,
        false,
        false
      )
      )
    )

    let metadataHash = "QmNvKoUciLngtreMGz1xfAdgQE1erehahG87juvUS5k6i1"
    handleUpdateSeriesInformation(
      changetype<UpdateSeriesInformation>(
        createUpdateSeriesInformationEvent(
        seriesId,
        false,
        BigInt.zero(),
        BigInt.zero(),
        "ipfs://QmExchange/",
        "ipfs://QmUnreveal",
        "ipfs://QmReveal/",
        "ipfs://".concat(metadataHash)
      )
      )
    )

    let id = Bytes.fromUTF8("12")
    let expectedIchibanSeries = id.concat(Bytes.fromUTF8(metadataHash))

    assert.fieldEquals(
      "NewSeries",
      id.toHexString(),
      "recentIPFSHash",
      Bytes.fromUTF8(metadataHash).toHexString()
    )
    assert.fieldEquals(
      "NewSeries",
      id.toHexString(),
      "currentIchibanSeries",
      expectedIchibanSeries.toHexString()
    )
  })
})
