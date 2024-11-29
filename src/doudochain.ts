import { BigInt } from "@graphprotocol/graph-ts"
import {
  DOUDOCHAIN,
  Approval,
  ApprovalForAll,
  ConsecutiveTransfer,
  CoordinatorSet,
  LastPrizeDraw,
  LastPrizeWinner,
  NewSeries,
  NewSubPrize,
  NewTicketStatus,
  OwnershipTransferRequested,
  OwnershipTransferred,
  RefundSeries,
  ResetSubPrize,
  RevealDrawFulfilled,
  RevealDrawSent,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  Transfer,
  UpdatePrize,
  UpdateSeriesInformation,
  UpdateSeriesLastPrizeOwner,
  UpdateSeriesRemainingTicketNumbers,
  UpdateTicketStatus
} from "../generated/DOUDOCHAIN/DOUDOCHAIN"
import { ExampleEntity } from "../generated/schema"

export function handleApproval(event: Approval): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  let entity = ExampleEntity.load(event.transaction.from)

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  if (!entity) {
    entity = new ExampleEntity(event.transaction.from)

    // Entity fields can be set using simple assignments
    entity.count = BigInt.fromI32(0)
  }

  // BigInt and BigDecimal math are supported
  entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  entity.owner = event.params.owner
  entity.approved = event.params.approved

  // Entities can be written to the store with `.save()`
  entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // - contract.ADMINMINT_ROLE(...)
  // - contract.DEFAULT_ADMIN_ROLE(...)
  // - contract.ICHISeries(...)
  // - contract.OPERATION_ROLE(...)
  // - contract.balanceOf(...)
  // - contract.currencyList(...)
  // - contract.getApproved(...)
  // - contract.getChainlinkDataFeedLatestAnswer(...)
  // - contract.getLastPrizeWinner(...)
  // - contract.getRoleAdmin(...)
  // - contract.getSeriesTotalLength(...)
  // - contract.getSubPrizesDetail(...)
  // - contract.hasRole(...)
  // - contract.isApprovedForAll(...)
  // - contract.name(...)
  // - contract.owner(...)
  // - contract.ownerOf(...)
  // - contract.requestToLastPrizeToken(...)
  // - contract.requestToRevealToken(...)
  // - contract.requests(...)
  // - contract.s_vrfCoordinator(...)
  // - contract.seriesTokens(...)
  // - contract.supportsInterface(...)
  // - contract.symbol(...)
  // - contract.ticketStatusDetail(...)
  // - contract.tokenURI(...)
  // - contract.totalSupply(...)
}

export function handleApprovalForAll(event: ApprovalForAll): void {}

export function handleConsecutiveTransfer(event: ConsecutiveTransfer): void {}

export function handleCoordinatorSet(event: CoordinatorSet): void {}

export function handleLastPrizeDraw(event: LastPrizeDraw): void {}

export function handleLastPrizeWinner(event: LastPrizeWinner): void {}

export function handleNewSeries(event: NewSeries): void {}

export function handleNewSubPrize(event: NewSubPrize): void {}

export function handleNewTicketStatus(event: NewTicketStatus): void {}

export function handleOwnershipTransferRequested(
  event: OwnershipTransferRequested
): void {}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {}

export function handleRefundSeries(event: RefundSeries): void {}

export function handleResetSubPrize(event: ResetSubPrize): void {}

export function handleRevealDrawFulfilled(event: RevealDrawFulfilled): void {}

export function handleRevealDrawSent(event: RevealDrawSent): void {}

export function handleRoleAdminChanged(event: RoleAdminChanged): void {}

export function handleRoleGranted(event: RoleGranted): void {}

export function handleRoleRevoked(event: RoleRevoked): void {}

export function handleTransfer(event: Transfer): void {}

export function handleUpdatePrize(event: UpdatePrize): void {}

export function handleUpdateSeriesInformation(
  event: UpdateSeriesInformation
): void {}

export function handleUpdateSeriesLastPrizeOwner(
  event: UpdateSeriesLastPrizeOwner
): void {}

export function handleUpdateSeriesRemainingTicketNumbers(
  event: UpdateSeriesRemainingTicketNumbers
): void {}

export function handleUpdateTicketStatus(event: UpdateTicketStatus): void {}
