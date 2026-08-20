import { newMockEvent } from "matchstick-as"
import { ethereum, Address, BigInt, Bytes } from "@graphprotocol/graph-ts"
import {
  Approval,
  ApprovalForAll,
  ConsecutiveTransfer,
  LastPrizeDraw,
  LastPrizeWinner,
  NewSeries,
  NewSubPrize,
  NewTicketStatus,
  RevealDrawFulfilled,
  RevealDrawSent,
  RoleGranted,
  RoleRevoked,
  Transfer,
  UpdatePrize,
  UpdateSeriesInformation,
  UpdateSeriesLastPrizeOwner,
  UpdateSeriesRemainingTicketNumbers,
  UpdateTicketStatus
} from "../generated/ICHICHAIN/ICHICHAIN"

export function createApprovalEvent(
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

export function createApprovalForAllEvent(
  owner: Address,
  operator: Address,
  approved: boolean
): ApprovalForAll {
  let approvalForAllEvent = changetype<ApprovalForAll>(newMockEvent())

  approvalForAllEvent.parameters = new Array()

  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("operator", ethereum.Value.fromAddress(operator))
  )
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam("approved", ethereum.Value.fromBoolean(approved))
  )

  return approvalForAllEvent
}

export function createConsecutiveTransferEvent(
  fromTokenId: BigInt,
  toTokenId: BigInt,
  from: Address,
  to: Address
): ConsecutiveTransfer {
  let consecutiveTransferEvent = changetype<ConsecutiveTransfer>(newMockEvent())

  consecutiveTransferEvent.parameters = new Array()

  consecutiveTransferEvent.parameters.push(
    new ethereum.EventParam(
      "fromTokenId",
      ethereum.Value.fromUnsignedBigInt(fromTokenId)
    )
  )
  consecutiveTransferEvent.parameters.push(
    new ethereum.EventParam(
      "toTokenId",
      ethereum.Value.fromUnsignedBigInt(toTokenId)
    )
  )
  consecutiveTransferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  consecutiveTransferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )

  return consecutiveTransferEvent
}

export function createLastPrizeDrawEvent(
  requestId: BigInt,
  seriesID: BigInt,
  quantity: BigInt
): LastPrizeDraw {
  let lastPrizeDrawEvent = changetype<LastPrizeDraw>(newMockEvent())

  lastPrizeDrawEvent.parameters = new Array()

  lastPrizeDrawEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  lastPrizeDrawEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  lastPrizeDrawEvent.parameters.push(
    new ethereum.EventParam(
      "quantity",
      ethereum.Value.fromUnsignedBigInt(quantity)
    )
  )

  return lastPrizeDrawEvent
}

export function createLastPrizeWinnerEvent(
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

export function createNewSeriesEvent(
  seriesID: BigInt,
  seriesName: string,
  totalTicketNumbers: BigInt,
  remainingTicketNumbers: BigInt,
  priceInUSDTWei: BigInt,
  priceInTWD: BigInt,
  isGoodsArrived: boolean,
  estimateDeliverTime: BigInt,
  exchangeExpireTime: BigInt,
  exchangeTokenURI: string,
  unrevealTokenURI: string,
  revealTokenURI: string,
  seriesMetaDataURI: string,
  lastPrizeOwner: Address,
  isRefund: boolean,
  isPreOrder: boolean
): NewSeries {
  let newSeriesEvent = changetype<NewSeries>(newMockEvent())

  newSeriesEvent.parameters = new Array()

  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam("seriesName", ethereum.Value.fromString(seriesName))
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "totalTicketNumbers",
      ethereum.Value.fromUnsignedBigInt(totalTicketNumbers)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "remainingTicketNumbers",
      ethereum.Value.fromUnsignedBigInt(remainingTicketNumbers)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "priceInUSDTWei",
      ethereum.Value.fromUnsignedBigInt(priceInUSDTWei)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "priceInTWD",
      ethereum.Value.fromUnsignedBigInt(priceInTWD)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "isGoodsArrived",
      ethereum.Value.fromBoolean(isGoodsArrived)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "estimateDeliverTime",
      ethereum.Value.fromUnsignedBigInt(estimateDeliverTime)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "exchangeExpireTime",
      ethereum.Value.fromUnsignedBigInt(exchangeExpireTime)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "exchangeTokenURI",
      ethereum.Value.fromString(exchangeTokenURI)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "unrevealTokenURI",
      ethereum.Value.fromString(unrevealTokenURI)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "revealTokenURI",
      ethereum.Value.fromString(revealTokenURI)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "seriesMetaDataURI",
      ethereum.Value.fromString(seriesMetaDataURI)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "lastPrizeOwner",
      ethereum.Value.fromAddress(lastPrizeOwner)
    )
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam("isRefund", ethereum.Value.fromBoolean(isRefund))
  )
  newSeriesEvent.parameters.push(
    new ethereum.EventParam(
      "isPreOrder",
      ethereum.Value.fromBoolean(isPreOrder)
    )
  )

  return newSeriesEvent
}

export function createNewSubPrizeEvent(
  seriesID: BigInt,
  subPrizeID: BigInt,
  prizeGroup: string,
  subPrizeName: string,
  subPrizeRemainingQuantity: BigInt
): NewSubPrize {
  let newSubPrizeEvent = changetype<NewSubPrize>(newMockEvent())

  newSubPrizeEvent.parameters = new Array()

  newSubPrizeEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  newSubPrizeEvent.parameters.push(
    new ethereum.EventParam(
      "subPrizeID",
      ethereum.Value.fromUnsignedBigInt(subPrizeID)
    )
  )
  newSubPrizeEvent.parameters.push(
    new ethereum.EventParam("prizeGroup", ethereum.Value.fromString(prizeGroup))
  )
  newSubPrizeEvent.parameters.push(
    new ethereum.EventParam(
      "subPrizeName",
      ethereum.Value.fromString(subPrizeName)
    )
  )
  newSubPrizeEvent.parameters.push(
    new ethereum.EventParam(
      "subPrizeRemainingQuantity",
      ethereum.Value.fromUnsignedBigInt(subPrizeRemainingQuantity)
    )
  )

  return newSubPrizeEvent
}

export function createNewTicketStatusEvent(
  tokenID: BigInt,
  seriesID: BigInt,
  tokenRevealedPrize: BigInt,
  tokenExchange: boolean,
  tokenRevealed: boolean,
  tokenOwner: Address,
  luckyNumber: i32
): NewTicketStatus {
  let newTicketStatusEvent = changetype<NewTicketStatus>(newMockEvent())

  newTicketStatusEvent.parameters = new Array()

  newTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenID",
      ethereum.Value.fromUnsignedBigInt(tokenID)
    )
  )
  newTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  newTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenRevealedPrize",
      ethereum.Value.fromUnsignedBigInt(tokenRevealedPrize)
    )
  )
  newTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenExchange",
      ethereum.Value.fromBoolean(tokenExchange)
    )
  )
  newTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenRevealed",
      ethereum.Value.fromBoolean(tokenRevealed)
    )
  )
  newTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenOwner",
      ethereum.Value.fromAddress(tokenOwner)
    )
  )
  newTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "luckyNumber",
      ethereum.Value.fromI32(luckyNumber)
    )
  )

  return newTicketStatusEvent
}

export function createRevealDrawFulfilledEvent(
  requestId: BigInt,
  seriesID: BigInt,
  randomWords: Array<BigInt>
): RevealDrawFulfilled {
  let revealDrawFulfilledEvent = changetype<RevealDrawFulfilled>(newMockEvent())

  revealDrawFulfilledEvent.parameters = new Array()

  revealDrawFulfilledEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  revealDrawFulfilledEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  revealDrawFulfilledEvent.parameters.push(
    new ethereum.EventParam(
      "randomWords",
      ethereum.Value.fromUnsignedBigIntArray(randomWords)
    )
  )

  return revealDrawFulfilledEvent
}

export function createRevealDrawSentEvent(
  requestId: BigInt,
  tokenIDs: Array<BigInt>
): RevealDrawSent {
  let revealDrawSentEvent = changetype<RevealDrawSent>(newMockEvent())

  revealDrawSentEvent.parameters = new Array()

  revealDrawSentEvent.parameters.push(
    new ethereum.EventParam(
      "requestId",
      ethereum.Value.fromUnsignedBigInt(requestId)
    )
  )
  revealDrawSentEvent.parameters.push(
    new ethereum.EventParam(
      "tokenIDs",
      ethereum.Value.fromUnsignedBigIntArray(tokenIDs)
    )
  )

  return revealDrawSentEvent
}

export function createRoleGrantedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleGranted {
  let roleGrantedEvent = changetype<RoleGranted>(newMockEvent())

  roleGrantedEvent.parameters = new Array()

  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleGrantedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleGrantedEvent
}

export function createRoleRevokedEvent(
  role: Bytes,
  account: Address,
  sender: Address
): RoleRevoked {
  let roleRevokedEvent = changetype<RoleRevoked>(newMockEvent())

  roleRevokedEvent.parameters = new Array()

  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(role))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("account", ethereum.Value.fromAddress(account))
  )
  roleRevokedEvent.parameters.push(
    new ethereum.EventParam("sender", ethereum.Value.fromAddress(sender))
  )

  return roleRevokedEvent
}

export function createTransferEvent(
  from: Address,
  to: Address,
  tokenId: BigInt
): Transfer {
  let transferEvent = changetype<Transfer>(newMockEvent())

  transferEvent.parameters = new Array()

  transferEvent.parameters.push(
    new ethereum.EventParam("from", ethereum.Value.fromAddress(from))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam("to", ethereum.Value.fromAddress(to))
  )
  transferEvent.parameters.push(
    new ethereum.EventParam(
      "tokenId",
      ethereum.Value.fromUnsignedBigInt(tokenId)
    )
  )

  return transferEvent
}

export function createUpdatePrizeEvent(
  seriesID: BigInt,
  subPrizeID: BigInt,
  subPrizeRemainingQuantity: BigInt
): UpdatePrize {
  let updatePrizeEvent = changetype<UpdatePrize>(newMockEvent())

  updatePrizeEvent.parameters = new Array()

  updatePrizeEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  updatePrizeEvent.parameters.push(
    new ethereum.EventParam(
      "subPrizeID",
      ethereum.Value.fromUnsignedBigInt(subPrizeID)
    )
  )
  updatePrizeEvent.parameters.push(
    new ethereum.EventParam(
      "subPrizeRemainingQuantity",
      ethereum.Value.fromUnsignedBigInt(subPrizeRemainingQuantity)
    )
  )

  return updatePrizeEvent
}

export function createUpdateSeriesInformationEvent(
  seriesID: BigInt,
  isGoodsArrived: boolean,
  estimateDeliverTime: BigInt,
  exchangeExpireTime: BigInt,
  exchangeTokenURI: string,
  unrevealTokenURI: string,
  revealTokenURI: string,
  seriesMetaDataURI: string
): UpdateSeriesInformation {
  let updateSeriesInformationEvent = changetype<UpdateSeriesInformation>(
    newMockEvent()
  )

  updateSeriesInformationEvent.parameters = new Array()

  updateSeriesInformationEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  updateSeriesInformationEvent.parameters.push(
    new ethereum.EventParam(
      "isGoodsArrived",
      ethereum.Value.fromBoolean(isGoodsArrived)
    )
  )
  updateSeriesInformationEvent.parameters.push(
    new ethereum.EventParam(
      "estimateDeliverTime",
      ethereum.Value.fromUnsignedBigInt(estimateDeliverTime)
    )
  )
  updateSeriesInformationEvent.parameters.push(
    new ethereum.EventParam(
      "exchangeExpireTime",
      ethereum.Value.fromUnsignedBigInt(exchangeExpireTime)
    )
  )
  updateSeriesInformationEvent.parameters.push(
    new ethereum.EventParam(
      "exchangeTokenURI",
      ethereum.Value.fromString(exchangeTokenURI)
    )
  )
  updateSeriesInformationEvent.parameters.push(
    new ethereum.EventParam(
      "unrevealTokenURI",
      ethereum.Value.fromString(unrevealTokenURI)
    )
  )
  updateSeriesInformationEvent.parameters.push(
    new ethereum.EventParam(
      "revealTokenURI",
      ethereum.Value.fromString(revealTokenURI)
    )
  )
  updateSeriesInformationEvent.parameters.push(
    new ethereum.EventParam(
      "seriesMetaDataURI",
      ethereum.Value.fromString(seriesMetaDataURI)
    )
  )

  return updateSeriesInformationEvent
}

export function createUpdateSeriesLastPrizeOwnerEvent(
  seriesID: BigInt,
  lastPrizeOwner: Array<Address>
): UpdateSeriesLastPrizeOwner {
  let updateSeriesLastPrizeOwnerEvent = changetype<UpdateSeriesLastPrizeOwner>(
    newMockEvent()
  )

  updateSeriesLastPrizeOwnerEvent.parameters = new Array()

  updateSeriesLastPrizeOwnerEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  updateSeriesLastPrizeOwnerEvent.parameters.push(
    new ethereum.EventParam(
      "lastPrizeOwner",
      ethereum.Value.fromAddressArray(lastPrizeOwner)
    )
  )

  return updateSeriesLastPrizeOwnerEvent
}

export function createUpdateSeriesRemainingTicketNumbersEvent(
  seriesID: BigInt,
  remainingTicketNumbers: BigInt
): UpdateSeriesRemainingTicketNumbers {
  let updateSeriesRemainingTicketNumbersEvent =
    changetype<UpdateSeriesRemainingTicketNumbers>(newMockEvent())

  updateSeriesRemainingTicketNumbersEvent.parameters = new Array()

  updateSeriesRemainingTicketNumbersEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  updateSeriesRemainingTicketNumbersEvent.parameters.push(
    new ethereum.EventParam(
      "remainingTicketNumbers",
      ethereum.Value.fromUnsignedBigInt(remainingTicketNumbers)
    )
  )

  return updateSeriesRemainingTicketNumbersEvent
}

export function createUpdateTicketStatusEvent(
  tokenID: BigInt,
  seriesID: BigInt,
  tokenRevealedPrize: BigInt,
  tokenExchange: boolean,
  tokenRevealed: boolean
): UpdateTicketStatus {
  let updateTicketStatusEvent = changetype<UpdateTicketStatus>(newMockEvent())

  updateTicketStatusEvent.parameters = new Array()

  updateTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenID",
      ethereum.Value.fromUnsignedBigInt(tokenID)
    )
  )
  updateTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  )
  updateTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenRevealedPrize",
      ethereum.Value.fromUnsignedBigInt(tokenRevealedPrize)
    )
  )
  updateTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenExchange",
      ethereum.Value.fromBoolean(tokenExchange)
    )
  )
  updateTicketStatusEvent.parameters.push(
    new ethereum.EventParam(
      "tokenRevealed",
      ethereum.Value.fromBoolean(tokenRevealed)
    )
  )

  return updateTicketStatusEvent
}
