import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  MembershipExpired as MembershipExpiredEvent,
  MembershipLevelCreated as MembershipLevelCreatedEvent,
  MembershipLevelUpdated as MembershipLevelUpdatedEvent,
  MembershipNFTBurned as MembershipNFTBurnedEvent,
  MembershipNFTMinted as MembershipNFTMintedEvent,
  MembershipRenewed as MembershipRenewedEvent,
  MembershipTransferred as MembershipTransferredEvent,
  MembershipUpgraded as MembershipUpgradedEvent,
  RoleAdminChanged as RoleAdminChangedEvent,
  RoleGranted as RoleGrantedEvent,
  RoleRevoked as RoleRevokedEvent,
  Transfer as TransferEvent,
  VoucherMinted as VoucherMintedEvent,
  VoucherTotalRedeemed as VoucherTotalRedeemedEvent,
  VoucherTransferred as VoucherTransferredEvent,
  VoucherTypeCreated as VoucherTypeCreatedEvent,
  VoucherTypeUpdated as VoucherTypeUpdatedEvent,
  VouchersIssuedFromSubscription as VouchersIssuedFromSubscriptionEvent,
} from "../generated/Contract/Contract";
import {
  Approval,
  ApprovalForAll,
  MembershipExpired,
  MembershipLevelCreated,
  MembershipLevelUpdated,
  MembershipNFTBurned,
  MembershipNFTMinted,
  MembershipRenewed,
  MembershipTransferred,
  MembershipUpgraded,
  RoleAdminChanged,
  RoleGranted,
  RoleRevoked,
  Transfer,
  VoucherMinted,
  VoucherTotalRedeemed,
  VoucherTransferred,
  VoucherTypeCreated,
  VoucherTypeUpdated,
  VouchersIssuedFromSubscription,
  VoucherType,
  Voucher,
  MembershipLevel,
  MembershipNFT,
  // MembershipMetadata,
  // VoucherMetadata,
} from "../generated/schema";
import {
  BigInt,
  Bytes,
  dataSource,
  DataSourceContext,
  DataSourceTemplate,
  json,
  log,
} from "@graphprotocol/graph-ts";

const MEMBERSHIP_LEVEL_KEY = "membershipLevelId";
const VOUCHER_KEY = "voucherId";

export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.approved = event.params.approved;
  entity.tokenId = event.params.tokenId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let entity = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.owner = event.params.owner;
  entity.operator = event.params.operator;
  entity.approved = event.params.approved;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleMembershipExpired(event: MembershipExpiredEvent): void {
  let membershipNFT = MembershipNFT.load(
    Bytes.fromUTF8(event.params.tokenId.toString())
  );
  if (membershipNFT) {
    membershipNFT.isActive = false;
    membershipNFT.updatedAt = event.block.timestamp;
    membershipNFT.save();

    // Update MembershipLevel totalMembers
    if (membershipNFT.level) {
      let membershipLevel = MembershipLevel.load(membershipNFT.level);
      if (membershipLevel) {
        membershipLevel.totalMembers = membershipLevel.totalMembers.minus(
          BigInt.fromI32(1)
        );
        membershipLevel.save();
      }
    }
  }

  let entity = new MembershipExpired(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.membershipNFT = membershipNFT ? membershipNFT.id : Bytes.empty();
  entity.tokenId = event.params.tokenId;
  entity.user = event.params.user;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipLevelCreated(
  event: MembershipLevelCreatedEvent
): void {
  let membershipLevel = new MembershipLevel(
    Bytes.fromUTF8(event.params.levelIndex.toString())
  );

  membershipLevel.levelIndex = event.params.levelIndex;
  membershipLevel.name = event.params.name;
  membershipLevel.threshold = event.params.threshold;
  membershipLevel.membershipTokenURI = event.params.membershipTokenURI;
  membershipLevel.rewardBasisPoints = event.params.rewardBasisPoints;
  membershipLevel.isActive = true;
  membershipLevel.totalMembers = BigInt.fromI32(0);
  membershipLevel.createdAt = event.block.timestamp;
  membershipLevel.blockNumber = event.block.number;
  membershipLevel.blockTimestamp = event.block.timestamp;
  membershipLevel.transactionHash = event.transaction.hash;

  // 重要：在創建模板之前保存實體
  membershipLevel.save();

  // // Handle IPFS metadata
  // let tokenURI = event.params.membershipTokenURI;
  // let ipfsIndex = tokenURI.indexOf("/ipfs/");

  // if (ipfsIndex != -1) {
  //   let hash = tokenURI.slice(ipfsIndex + 6);

  //   let context = new DataSourceContext();
  //   context.setBytes(MEMBERSHIP_LEVEL_KEY, membershipLevel.id);

  //   DataSourceTemplate.createWithContext(
  //     "DoudoNFTIpfsContent",
  //     [hash],
  //     context
  //   );
  // }

  let entity = new MembershipLevelCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.membershipLevel = membershipLevel.id;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipLevelUpdated(
  event: MembershipLevelUpdatedEvent
): void {
  let membershipLevel = MembershipLevel.load(
    Bytes.fromUTF8(event.params.levelIndex.toString())
  );
  if (membershipLevel) {
    membershipLevel.threshold = event.params.threshold;
    membershipLevel.membershipTokenURI = event.params.membershipTokenURI;
    membershipLevel.rewardBasisPoints = event.params.rewardBasisPoints;
    membershipLevel.updatedAt = event.block.timestamp;
    membershipLevel.save();
  }

  // Save the event entity
  let entity = new MembershipLevelUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.membershipLevel = membershipLevel ? membershipLevel.id : Bytes.empty();
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipNFTBurned(
  event: MembershipNFTBurnedEvent
): void {
  let membershipNFT = MembershipNFT.load(
    Bytes.fromUTF8(event.params.tokenId.toString())
  );
  if (membershipNFT) {
    membershipNFT.isActive = false;
    membershipNFT.updatedAt = event.block.timestamp;
    membershipNFT.save();

    // Update MembershipLevel totalMembers
    if (membershipNFT.level) {
      let membershipLevel = MembershipLevel.load(membershipNFT.level);
      if (membershipLevel) {
        membershipLevel.totalMembers = membershipLevel.totalMembers.minus(
          BigInt.fromI32(1)
        );
        membershipLevel.save();
      }
    }
  }

  // Save the event entity
  let entity = new MembershipNFTBurned(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.membershipNFT = membershipNFT ? membershipNFT.id : Bytes.empty();
  entity.user = event.params.user;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipRenewed(event: MembershipRenewedEvent): void {
  let membershipNFT = MembershipNFT.load(
    Bytes.fromUTF8(event.params.tokenId.toString())
  );
  if (membershipNFT) {
    membershipNFT.expiryDate = event.params.newExpiryDate;
    membershipNFT.updatedAt = event.block.timestamp;
    membershipNFT.save();
  }

  // Save the event entity
  let entity = new MembershipRenewed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.membershipNFT = membershipNFT ? membershipNFT.id : Bytes.empty();
  entity.newExpiryDate = event.params.newExpiryDate;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipTransferred(
  event: MembershipTransferredEvent
): void {
  let membershipNFT = MembershipNFT.load(
    Bytes.fromUTF8(event.params.tokenId.toString())
  );
  if (membershipNFT) {
    membershipNFT.owner = event.params.to;
    membershipNFT.updatedAt = event.block.timestamp;
    membershipNFT.save();
  }

  // Save the event entity
  let entity = new MembershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.membershipNFT = membershipNFT ? membershipNFT.id : Bytes.empty();
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMembershipUpgraded(event: MembershipUpgradedEvent): void {
  let membershipNFT = MembershipNFT.load(
    Bytes.fromUTF8(event.params.tokenId.toString())
  );
  let newLevelId = Bytes.fromUTF8(event.params.level.toString());
  let newLevel = MembershipLevel.load(newLevelId);
  
  // 保存舊等級ID，用於事件記錄
  let previousLevelId: Bytes | null = null;
  let isNewMember = false;

  if (!membershipNFT) {
    // Create new MembershipNFT if it doesn't exist (new member)
    isNewMember = true;
    membershipNFT = new MembershipNFT(
      Bytes.fromUTF8(event.params.tokenId.toString())
    );
    membershipNFT.tokenId = event.params.tokenId;
    membershipNFT.owner = event.params.user;
    membershipNFT.isActive = true;
    membershipNFT.expiryDate = event.block.timestamp.plus(
      BigInt.fromI32(180 * 24 * 60 * 60)
    ); // 180 days
    membershipNFT.lastActivityTime = event.block.timestamp;
    membershipNFT.level = newLevelId; // Set initial level using levelIndex
    membershipNFT.createdAt = event.block.timestamp;
    membershipNFT.blockNumber = event.block.number;
    membershipNFT.blockTimestamp = event.block.timestamp;
    membershipNFT.transactionHash = event.transaction.hash;

    // Update new level count for first-time member
    if (newLevel) {
      newLevel.totalMembers = newLevel.totalMembers.plus(BigInt.fromI32(1));
      newLevel.save();
    }
  } else {
    // Update existing membership
    let oldLevelId = membershipNFT.level;
    previousLevelId = oldLevelId; // 保存舊等級ID
    
    if (oldLevelId) {
      // Only update counts if level actually changed
      if (!oldLevelId.equals(newLevelId)) {
        // Update old level count
        let oldLevel = MembershipLevel.load(oldLevelId);
        if (oldLevel) {
          oldLevel.totalMembers = oldLevel.totalMembers.minus(
            BigInt.fromI32(1)
          );
          oldLevel.save();
        }

        // Update new level count
        if (newLevel) {
          newLevel.totalMembers = newLevel.totalMembers.plus(BigInt.fromI32(1));
          newLevel.save();
        }
      }
    }

    // Update membership NFT
    membershipNFT.level = newLevelId;
    membershipNFT.lastActivityTime = event.block.timestamp;
    membershipNFT.updatedAt = event.block.timestamp;
  }

  membershipNFT.save();

  // Create the event entity
  let entity = new MembershipUpgraded(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.membershipNFT = membershipNFT.id;
  entity.user = event.params.user;
  entity.tokenId = event.params.tokenId;
  entity.newLevel = newLevelId;
  
  // 設置 previousLevel：只有當不是新會員且舊等級與新等級不同時才設置
  if (!isNewMember && previousLevelId && !previousLevelId.equals(newLevelId)) {
    entity.previousLevel = previousLevelId;
  }
  // 對於新會員或等級沒有變化的情況，previousLevel 保持為 null
  
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleRoleAdminChanged(event: RoleAdminChangedEvent): void {
  let entity = new RoleAdminChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.role = event.params.role;
  entity.previousAdminRole = event.params.previousAdminRole;
  entity.newAdminRole = event.params.newAdminRole;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleRoleGranted(event: RoleGrantedEvent): void {
  let entity = new RoleGranted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.role = event.params.role;
  entity.account = event.params.account;
  entity.sender = event.params.sender;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleRoleRevoked(event: RoleRevokedEvent): void {
  let entity = new RoleRevoked(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.role = event.params.role;
  entity.account = event.params.account;
  entity.sender = event.params.sender;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.tokenId = event.params.tokenId;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleVoucherTypeCreated(event: VoucherTypeCreatedEvent): void {
  let voucherType = new VoucherType(
    Bytes.fromUTF8(event.params.voucherTypeId.toString())
  );

  voucherType.voucherTypeId = event.params.voucherTypeId;
  voucherType.amount = event.params.amount;
  voucherType.maxPerUser = event.params.maxPerUser;
  voucherType.tokenURI = event.params.tokenURI;
  voucherType.isActive = true;
  voucherType.totalMinted = BigInt.fromI32(0);
  voucherType.createdAt = event.block.timestamp;
  voucherType.blockNumber = event.block.number;
  voucherType.blockTimestamp = event.block.timestamp;
  voucherType.transactionHash = event.transaction.hash;

  voucherType.save();

  // Also save the event entity
  let entity = new VoucherTypeCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.voucherType = voucherType.id;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleVoucherTypeUpdated(event: VoucherTypeUpdatedEvent): void {
  let voucherType = VoucherType.load(
    Bytes.fromUTF8(event.params.voucherTypeId.toString())
  );
  if (voucherType) {
    voucherType.amount = event.params.amount;
    voucherType.maxPerUser = event.params.maxPerUser;
    voucherType.tokenURI = event.params.tokenURI;
    voucherType.updatedAt = event.block.timestamp;
    voucherType.save();
  }

  // Save the event entity
  let entity = new VoucherTypeUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.voucherType = voucherType ? voucherType.id : Bytes.empty();
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleVoucherMinted(event: VoucherMintedEvent): void {
  let voucher = new Voucher(Bytes.fromUTF8(event.params.tokenId.toString()));

  voucher.tokenId = event.params.tokenId;
  voucher.owner = event.params.recipient;
  voucher.voucherType = Bytes.fromUTF8(event.params.voucherTypeId.toString());
  voucher.isRedeemed = false;
  voucher.createdAt = event.block.timestamp;
  voucher.blockNumber = event.block.number;
  voucher.blockTimestamp = event.block.timestamp;
  voucher.transactionHash = event.transaction.hash;

  voucher.save();

  // Update VoucherType totalMinted
  let voucherType = VoucherType.load(
    Bytes.fromUTF8(event.params.voucherTypeId.toString())
  );
  if (voucherType) {
    voucherType.totalMinted = voucherType.totalMinted.plus(BigInt.fromI32(1));
    voucherType.save();
  }

  // Save the event entity
  let entity = new VoucherMinted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.recipient = event.params.recipient;
  entity.voucher = voucher.id;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleVoucherTransferred(event: VoucherTransferredEvent): void {
  let voucher = Voucher.load(Bytes.fromUTF8(event.params.tokenId.toString()));
  if (voucher) {
    voucher.owner = event.params.to;
    voucher.save();
  }

  // Save the event entity
  let entity = new VoucherTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.voucher = voucher ? voucher.id : Bytes.empty();
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleVoucherTotalRedeemed(
  event: VoucherTotalRedeemedEvent
): void {
  let voucherRefs: Bytes[] = [];

  // Update each redeemed voucher
  for (let i = 0; i < event.params.tokenIds.length; i++) {
    let tokenId = event.params.tokenIds[i];
    let voucher = Voucher.load(Bytes.fromUTF8(tokenId.toString()));
    if (voucher) {
      voucher.isRedeemed = true;
      voucher.redeemedAt = event.block.timestamp;
      voucher.save();
      voucherRefs.push(Bytes.fromUTF8(tokenId.toString()));
    }
  }

  // Save the event entity
  let entity = new VoucherTotalRedeemed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.vouchers = voucherRefs;
  entity.redeemer = event.params.redeemer;
  entity.totalAmount = event.params.totalAmount;
  entity.additionalReward = event.params.additionalReward;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleVouchersIssuedFromSubscription(
  event: VouchersIssuedFromSubscriptionEvent
): void {
  let entity = new VouchersIssuedFromSubscription(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.user = event.params.user;
  entity.voucherTypeIds = event.params.voucherTypeIds;
  entity.amounts = event.params.amounts;
  entity.totalAmount = event.params.totalAmount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

// export function handleDoudoNFTContent(content: Bytes): void {
//   let context = dataSource.context();

//   // Check which type of content we're dealing with
//   if (context.getBytes(MEMBERSHIP_LEVEL_KEY)) {
//     handleMembershipMetadata(content);
//   } else if (context.getBytes(VOUCHER_KEY)) {
//     handleVoucherMetadata(content);
//   }
// }

// export function handleMembershipMetadata(content: Bytes): void {
//   let hash = dataSource.stringParam();
//   let context = dataSource.context();
//   let membershipLevelId = context.getBytes(MEMBERSHIP_LEVEL_KEY);

//   let metadata = new MembershipMetadata(Bytes.fromUTF8(hash));
//   metadata.id = Bytes.fromUTF8(hash);

//   let membershipLevel = MembershipLevel.load(membershipLevelId);
//   if (!membershipLevel) return;

//   const value = json.fromBytes(content).toObject();
//   if (value) {
//     // Handle basic metadata fields
//     const name = value.get("name");
//     const description = value.get("description");
//     const image = value.get("image");

//     metadata.name = name ? name.toString() : null;
//     metadata.description = description ? description.toString() : null;
//     metadata.image = image ? image.toString() : null;
//   }

//   metadata.save();
// }

// export function handleVoucherMetadata(content: Bytes): void {
//   let hash = dataSource.stringParam();
//   let context = dataSource.context();
//   let voucherId = context.getBytes(VOUCHER_KEY);

//   let metadata = new VoucherMetadata(Bytes.fromUTF8(hash));
//   metadata.id = Bytes.fromUTF8(hash);
//   metadata.hash = hash;

//   let voucher = Voucher.load(voucherId);
//   if (!voucher) return;
//   metadata.voucher = voucherId;

//   const value = json.fromBytes(content).toObject();
//   if (value) {
//     // Handle basic metadata fields
//     const name = value.get("name");
//     const description = value.get("description");
//     const animation_url = value.get("animation_url");
//     const image = value.get("image");

//     metadata.name = name ? name.toString() : null;
//     metadata.description = description ? description.toString() : null;
//     metadata.animationUrl = animation_url ? animation_url.toString() : null;
//     metadata.image = image ? image.toString() : null;
//   }

//   metadata.save();
// }
