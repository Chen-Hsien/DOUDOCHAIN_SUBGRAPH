import {
  ContractURIUpdated as ContractURIUpdatedEvent,
  ExtensionAdded as ExtensionAddedEvent,
  ExtensionRemoved as ExtensionRemovedEvent,
  ExtensionReplaced as ExtensionReplacedEvent,
  FlatPlatformFeeUpdated as FlatPlatformFeeUpdatedEvent,
  FunctionDisabled as FunctionDisabledEvent,
  FunctionEnabled as FunctionEnabledEvent,
  Initialized as InitializedEvent,
  PlatformFeeInfoUpdated as PlatformFeeInfoUpdatedEvent,
  PlatformFeeTypeUpdated as PlatformFeeTypeUpdatedEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  RoyaltyEngineUpdated as RoyaltyEngineUpdatedEvent,
  NewListing as NewListingEvent,
  NewSale as NewSaleEvent,
  CancelledListing as CancelledListingEvent,
  BuyerApprovedForListing as BuyerApprovedForListingEvent,
  CurrencyApprovedForListing as CurrencyApprovedForListingEvent,
  UpdatedListing as UpdatedListingEvent,
  NewAuction as NewAuctionEvent,
  NewBid as NewBidEvent,
  AuctionClosed as AuctionClosedEvent,
  CancelledAuction as CancelledAuctionEvent,
  NewOffer as NewOfferEvent,
  AcceptedOffer as AcceptedOfferEvent,
  CancelledOffer as CancelledOfferEvent
} from "../generated/MarketplaceV3/MarketplaceV3"
import {
  ContractURIUpdated,
  ExtensionAdded,
  ExtensionRemoved,
  ExtensionReplaced,
  FlatPlatformFeeUpdated,
  FunctionDisabled,
  FunctionEnabled,
  Initialized,
  Listing,
  PlatformFeeInfoUpdated,
  PlatformFeeTypeUpdated,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  RoyaltyEngineUpdated,
  Currency,
  ApprovedBuyer,
  Sale,
  BuyerApprovedForListing,
  CancelledListing,
  CurrencyApprovedForListing,
  Auction,
  Bid,
  NewAuction,
  NewBid,
  AuctionClosed,
  CancelledAuction,
  Offer,
  OfferAccepted,
  NewTicketStatus
} from "../generated/schema"
import { BigInt, Bytes, log } from "@graphprotocol/graph-ts"

export function handleContractURIUpdated(event: ContractURIUpdatedEvent): void {
  let entity = new ContractURIUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.prevURI = event.params.prevURI
  entity.newURI = event.params.newURI

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleExtensionAdded(event: ExtensionAddedEvent): void {
  let entity = new ExtensionAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.name = event.params.name
  entity.implementation = event.params.implementation
  entity.extension_metadata_name = event.params.extension.metadata.name
  entity.extension_metadata_metadataURI =
    event.params.extension.metadata.metadataURI
  entity.extension_metadata_implementation =
    event.params.extension.metadata.implementation
  entity.extension_functions = changetype<Bytes[]>(
    event.params.extension.functions
  )

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleExtensionRemoved(event: ExtensionRemovedEvent): void {
  let entity = new ExtensionRemoved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.name = event.params.name
  entity.extension_metadata_name = event.params.extension.metadata.name
  entity.extension_metadata_metadataURI =
    event.params.extension.metadata.metadataURI
  entity.extension_metadata_implementation =
    event.params.extension.metadata.implementation
  entity.extension_functions = changetype<Bytes[]>(
    event.params.extension.functions
  )

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleExtensionReplaced(event: ExtensionReplacedEvent): void {
  let entity = new ExtensionReplaced(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.name = event.params.name
  entity.implementation = event.params.implementation
  entity.extension_metadata_name = event.params.extension.metadata.name
  entity.extension_metadata_metadataURI =
    event.params.extension.metadata.metadataURI
  entity.extension_metadata_implementation =
    event.params.extension.metadata.implementation
  entity.extension_functions = changetype<Bytes[]>(
    event.params.extension.functions
  )

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFlatPlatformFeeUpdated(
  event: FlatPlatformFeeUpdatedEvent
): void {
  let entity = new FlatPlatformFeeUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.platformFeeRecipient = event.params.platformFeeRecipient
  entity.flatFee = event.params.flatFee

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFunctionDisabled(event: FunctionDisabledEvent): void {
  let entity = new FunctionDisabled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.name = event.params.name
  entity.functionSelector = event.params.functionSelector
  entity.extMetadata_name = event.params.extMetadata.name
  entity.extMetadata_metadataURI = event.params.extMetadata.metadataURI
  entity.extMetadata_implementation = event.params.extMetadata.implementation

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFunctionEnabled(event: FunctionEnabledEvent): void {
  let entity = new FunctionEnabled(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.name = event.params.name
  entity.functionSelector = event.params.functionSelector
  entity.extFunction_functionSelector =
    event.params.extFunction.functionSelector
  entity.extFunction_functionSignature =
    event.params.extFunction.functionSignature
  entity.extMetadata_name = event.params.extMetadata.name
  entity.extMetadata_metadataURI = event.params.extMetadata.metadataURI
  entity.extMetadata_implementation = event.params.extMetadata.implementation

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleInitialized(event: InitializedEvent): void {
  let entity = new Initialized(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.version = event.params.version

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePlatformFeeInfoUpdated(
  event: PlatformFeeInfoUpdatedEvent
): void {
  let entity = new PlatformFeeInfoUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.platformFeeRecipient = event.params.platformFeeRecipient
  entity.platformFeeBps = event.params.platformFeeBps

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePlatformFeeTypeUpdated(
  event: PlatformFeeTypeUpdatedEvent
): void {
  let entity = new PlatformFeeTypeUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.feeType = event.params.feeType

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let entity = new RoleAdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.previousAdminRole = event.params.previousAdminRole
  entity.newAdminRole = event.params.newAdminRole

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let entity = new RoleGranted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let entity = new RoleRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.role = event.params.role
  entity.account = event.params.account
  entity.sender = event.params.sender

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleRoyaltyEngineUpdated(
  event: RoyaltyEngineUpdatedEvent
): void {
  let entity = new RoyaltyEngineUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousAddress = event.params.previousAddress
  entity.newAddress = event.params.newAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleNewListing(event: NewListingEvent): void {
  let entity = new Listing(event.params.listingId.toString())
  
  entity.listingId = event.params.listingId
  entity.listingCreator = event.params.listingCreator
  entity.assetContract = event.params.assetContract
  entity.tokenId = event.params.listing.tokenId
  entity.quantity = event.params.listing.quantity
  entity.currency = event.params.listing.currency
  entity.pricePerToken = event.params.listing.pricePerToken
  entity.startTimestamp = event.params.listing.startTimestamp
  entity.endTimestamp = event.params.listing.endTimestamp
  entity.reserved = event.params.listing.reserved
  entity.tokenType = event.params.listing.tokenType
  
  entity.currentQuantity = event.params.listing.quantity
  entity.totalSales = BigInt.fromI32(0)
  entity.status = "CREATED"

  // Add ticket reference
  let ticketId = event.params.listing.tokenId.toString()
  let ticket = NewTicketStatus.load(Bytes.fromUTF8(ticketId))
  if (ticket) {
    entity.ticket = ticket.id
  } else {
    log.warning("Ticket not found for listing: {}", [ticketId])
    return
  }

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleNewSale(event: NewSaleEvent): void {
  let listing = Listing.load(event.params.listingId.toString())
  if (listing) {
    listing.currentQuantity = listing.currentQuantity.minus(event.params.quantityBought)
    listing.totalSales = listing.totalSales.plus(BigInt.fromI32(1))
    if (listing.currentQuantity.equals(BigInt.fromI32(0))) {
      listing.status = "COMPLETED"
    }
    listing.save()
  }

  let saleId = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  let sale = new Sale(saleId)
  sale.listing = event.params.listingId.toString()
  sale.buyer = event.params.buyer
  sale.quantity = event.params.quantityBought
  sale.totalPrice = event.params.totalPricePaid
  if (listing) {
    sale.currency = listing.currency
  } else {
    sale.currency = Bytes.fromI32(0)
  }
  sale.timestamp = event.block.timestamp
  sale.transactionHash = event.transaction.hash
  sale.save()
}

export function handleBuyerApprovedForListing(event: BuyerApprovedForListingEvent): void {
  let buyerId = event.params.listingId.toString().concat("-").concat(event.params.buyer.toHexString())
  let buyer = new ApprovedBuyer(buyerId)
  buyer.listing = event.params.listingId.toString()
  buyer.buyer = event.params.buyer
  buyer.approved = event.params.approved
  buyer.save()

  let entity = new BuyerApprovedForListing(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.listingId = event.params.listingId
  entity.buyer = event.params.buyer
  entity.approved = event.params.approved
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleCurrencyApprovedForListing(event: CurrencyApprovedForListingEvent): void {
  let currencyId = event.params.listingId.toString().concat("-").concat(event.params.currency.toHexString())
  let currency = new Currency(currencyId)
  currency.listing = event.params.listingId.toString()
  currency.currencyAddress = event.params.currency
  currency.pricePerToken = event.params.pricePerToken
  currency.approved = true
  currency.save()

  let entity = new CurrencyApprovedForListing(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.listingId = event.params.listingId
  entity.currency = event.params.currency
  entity.pricePerToken = event.params.pricePerToken
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleCancelledListing(event: CancelledListingEvent): void {
  let listing = Listing.load(event.params.listingId.toString())
  if (listing) {
    listing.status = "CANCELLED"
    listing.save()
  }

  let entity = new CancelledListing(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.listingCreator = event.params.listingCreator
  entity.listingId = event.params.listingId
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleUpdatedListing(event: UpdatedListingEvent): void {
  let listing = Listing.load(event.params.listingId.toString())
  if (listing) {
    listing.currency = event.params.listing.currency
    listing.pricePerToken = event.params.listing.pricePerToken
    listing.startTimestamp = event.params.listing.startTimestamp
    listing.endTimestamp = event.params.listing.endTimestamp
    listing.save()
  }
}

export function handleNewAuction(event: NewAuctionEvent): void {
  let auction = new Auction(event.params.auctionId.toString())
  
  auction.auctionId = event.params.auctionId
  auction.auctionCreator = event.params.auctionCreator
  auction.assetContract = event.params.assetContract
  auction.tokenId = event.params.auction.tokenId
  auction.quantity = event.params.auction.quantity
  auction.currency = event.params.auction.currency
  auction.minimumBidAmount = event.params.auction.minimumBidAmount
  auction.buyoutBidAmount = event.params.auction.buyoutBidAmount
  auction.timeBufferInSeconds = event.params.auction.timeBufferInSeconds
  auction.bidBufferBps = event.params.auction.bidBufferBps
  auction.startTimestamp = event.params.auction.startTimestamp
  auction.endTimestamp = event.params.auction.endTimestamp
  auction.tokenType = event.params.auction.tokenType
  auction.status = "CREATED"
  
  auction.totalBids = BigInt.fromI32(0)
  auction.winningBidder = null
  
  // Add ticket reference
  let ticketId = event.params.auction.tokenId.toString()
  let ticket = NewTicketStatus.load(Bytes.fromUTF8(ticketId))
  if (ticket) {
    auction.ticket = ticket.id
  } else {
    log.warning("Ticket not found for auction: {}", [ticketId])
    return
  }

  auction.blockNumber = event.block.number
  auction.blockTimestamp = event.block.timestamp
  auction.transactionHash = event.transaction.hash
  
  auction.save()

  let entity = new NewAuction(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.auctionCreator = event.params.auctionCreator
  entity.auctionId = event.params.auctionId
  entity.assetContract = event.params.assetContract
  entity.auction_auctionId = event.params.auction.auctionId
  entity.auction_tokenId = event.params.auction.tokenId
  entity.auction_quantity = event.params.auction.quantity
  entity.auction_minimumBidAmount = event.params.auction.minimumBidAmount
  entity.auction_buyoutBidAmount = event.params.auction.buyoutBidAmount
  entity.auction_timeBufferInSeconds = event.params.auction.timeBufferInSeconds
  entity.auction_bidBufferBps = event.params.auction.bidBufferBps
  entity.auction_startTimestamp = event.params.auction.startTimestamp
  entity.auction_endTimestamp = event.params.auction.endTimestamp
  entity.auction_auctionCreator = event.params.auction.auctionCreator
  entity.auction_assetContract = event.params.auction.assetContract
  entity.auction_currency = event.params.auction.currency
  entity.auction_tokenType = event.params.auction.tokenType
  entity.auction_status = event.params.auction.status
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleNewBid(event: NewBidEvent): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (auction) {
    auction.totalBids = auction.totalBids.plus(BigInt.fromI32(1))
    
    let bidId = event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
    let bid = new Bid(bidId)
    bid.auction = auction.id
    bid.bidder = event.params.bidder
    bid.bidAmount = event.params.bidAmount
    bid.timestamp = event.block.timestamp
    bid.transactionHash = event.transaction.hash
    bid.isWinningBid = true
    
    if (auction.currentWinningBid !== null) {
      let previousBidId = auction.currentWinningBid as string
      let previousBid = Bid.load(previousBidId)
      if (previousBid) {
        previousBid.isWinningBid = false
        previousBid.save()
      }
    }
    
    auction.currentWinningBid = bid.id
    auction.save()
    bid.save()
  }

  let entity = new NewBid(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.auctionId = event.params.auctionId
  entity.bidder = event.params.bidder
  entity.assetContract = event.params.assetContract
  entity.bidAmount = event.params.bidAmount
  entity.auction_auctionId = event.params.auction.auctionId
  entity.auction_tokenId = event.params.auction.tokenId
  entity.auction_quantity = event.params.auction.quantity
  entity.auction_minimumBidAmount = event.params.auction.minimumBidAmount
  entity.auction_buyoutBidAmount = event.params.auction.buyoutBidAmount
  entity.auction_timeBufferInSeconds = event.params.auction.timeBufferInSeconds
  entity.auction_bidBufferBps = event.params.auction.bidBufferBps
  entity.auction_startTimestamp = event.params.auction.startTimestamp
  entity.auction_endTimestamp = event.params.auction.endTimestamp
  entity.auction_auctionCreator = event.params.auction.auctionCreator
  entity.auction_assetContract = event.params.auction.assetContract
  entity.auction_currency = event.params.auction.currency
  entity.auction_tokenType = event.params.auction.tokenType
  entity.auction_status = event.params.auction.status
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleAuctionClosed(event: AuctionClosedEvent): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (auction) {
    auction.status = "COMPLETED"
    auction.winningBidder = event.params.winningBidder
    auction.save()
  }

  let entity = new AuctionClosed(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.auctionId = event.params.auctionId
  entity.assetContract = event.params.assetContract
  entity.closer = event.params.closer
  entity.tokenId = event.params.tokenId
  entity.auctionCreator = event.params.auctionCreator
  entity.winningBidder = event.params.winningBidder
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleCancelledAuction(event: CancelledAuctionEvent): void {
  let auction = Auction.load(event.params.auctionId.toString())
  if (auction) {
    auction.status = "CANCELLED"
    auction.save()
  }

  let entity = new CancelledAuction(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.auctionCreator = event.params.auctionCreator
  entity.auctionId = event.params.auctionId
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleNewOffer(event: NewOfferEvent): void {
  
  let offer = new Offer(event.params.offerId.toString())
  let params = event.params.offer
  
  offer.offeror = event.params.offeror
  offer.assetContract = event.params.assetContract
  offer.tokenId = params.tokenId
  offer.quantity = params.quantity
  offer.currency = params.currency
  offer.totalPrice = params.totalPrice
  offer.expirationTimestamp = params.expirationTimestamp
  offer.status = "PENDING"
  
  offer.blockNumber = event.block.number
  offer.blockTimestamp = event.block.timestamp
  offer.transactionHash = event.transaction.hash
  
  offer.save()
}

export function handleAcceptedOffer(event: AcceptedOfferEvent): void {
  // Update original offer status
  let offerId = event.params.offerId.toString()
  let offer = Offer.load(offerId)
  if (offer) {
    offer.status = "ACCEPTED"
    offer.save()
  }
  
  // Create acceptance record
  let acceptance = new OfferAccepted(
    event.transaction.hash.concatI32(event.logIndex.toI32()).toHexString()
  )
  
  acceptance.offeror = event.params.offeror
  acceptance.offerId = event.params.offerId
  acceptance.assetContract = event.params.assetContract
  acceptance.tokenId = event.params.tokenId
  acceptance.seller = event.params.seller
  acceptance.quantityBought = event.params.quantityBought
  acceptance.totalPricePaid = event.params.totalPricePaid
  
  
  acceptance.blockNumber = event.block.number
  acceptance.blockTimestamp = event.block.timestamp
  acceptance.transactionHash = event.transaction.hash
  
  acceptance.save()
}

export function handleCancelledOffer(event: CancelledOfferEvent): void {
  let offerId = event.params.offerId.toString()
  let offer = Offer.load(offerId)
  
  if (offer == null) {
    return
  }
  
  offer.status = "CANCELLED"
  offer.blockTimestamp = event.block.timestamp
  
  offer.save()
}