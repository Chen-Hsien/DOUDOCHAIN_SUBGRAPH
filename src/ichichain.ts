import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  ConsecutiveTransfer as ConsecutiveTransferEvent,
  LastPrizeDraw as LastPrizeDrawEvent,
  LastPrizeWinner as LastPrizeWinnerEvent,
  AdminMinted as AdminMintedEvent,
  MintLockUpdated as MintLockUpdatedEvent,
  NewSeries as NewSeriesEvent,
  NewSubPrize as NewSubPrizeEvent,
  NewTicketStatus as NewTicketStatusEvent,
  SeriesUnlockedFor as SeriesUnlockedForEvent,
  Transfer as TransferEvent,
  UpdatePrize as UpdatePrizeEvent,
  UpdateSeriesInformation as UpdateSeriesInformationEvent,
  UpdateSeriesLastPrizeOwner as UpdateSeriesLastPrizeOwnerEvent,
  UpdateSeriesRemainingTicketNumbers as UpdateSeriesRemainingTicketNumbersEvent,
  UpdateTicketStatus as UpdateTicketStatusEvent,
  VrfRouterUpdated as VrfRouterUpdatedEvent,
} from "../generated/ICHICHAIN/ICHICHAIN";
import {
  Approval,
  ApprovalForAll,
  ConsecutiveTransfer,
  LastPrizeDraw,
  LastPrizeWinner,
  AdminMinted,
  MintLockUpdated,
  NewSeries,
  NewSubPrize,
  NewTicketStatus,
  SeriesUnlockedFor,
  Transfer,
  UpdatePrize,
  UpdateSeriesInformation,
  UpdateSeriesLastPrizeOwner,
  UpdateSeriesRemainingTicketNumbers,
  UpdateTicketStatus,
  VrfRouterUpdated,
  IchibanSeries,
  IchibanKujiPrize,
  IchibanKujiSubPrize,
  UnrevealTokenMetadata,
  RevealTokenMetadata,
} from "../generated/schema";

import {
  json,
  BigInt,
  Bytes,
  log,
  dataSource,
  DataSourceContext,
  DataSourceTemplate,
  JSONValue,
  JSONValueKind,
} from "@graphprotocol/graph-ts";

const SERIES_ID_KEY = "seriesID";
const SUB_PRIZE_ID_KEY = "subPrizeID";
const LAST_PRIZE_ID = "999";
const TOKEN_SOURCE_DRAW = "DRAW";
const TOKEN_SOURCE_LAST_PRIZE = "LAST_PRIZE";

export function ticketId(tokenID: BigInt): Bytes {
  return Bytes.fromUTF8(tokenID.toString());
}

function jsonScalarToString(value: JSONValue | null): string | null {
  if (value == null || value.kind == JSONValueKind.NULL) {
    return null;
  }
  if (value.kind == JSONValueKind.STRING) {
    return value.toString();
  }
  if (value.kind == JSONValueKind.NUMBER) {
    return value.toI64().toString();
  }
  if (value.kind == JSONValueKind.BOOL) {
    return value.toBool() ? "true" : "false";
  }
  return null;
}

function createRevealTokenIpfsContent(
  seriesEntity: NewSeries | null,
  subPrizeID: BigInt
): void {
  if (seriesEntity == null) return;

  let revealIpfsIndex = seriesEntity.revealTokenURI.indexOf("/ipfs/");
  if (revealIpfsIndex == -1) return;

  let baseRevealHash = seriesEntity.revealTokenURI
    .slice(revealIpfsIndex + 6)
    .trim();

  if (baseRevealHash.endsWith("/")) {
    baseRevealHash = baseRevealHash.slice(0, -1);
  }

  let revealContext = new DataSourceContext();
  revealContext.setBytes(SERIES_ID_KEY, seriesEntity.id);
  revealContext.setBigInt(SUB_PRIZE_ID_KEY, subPrizeID);

  let fullRevealHash = baseRevealHash + "/" + subPrizeID.toString();
  DataSourceTemplate.createWithContext(
    "RevealTokenIpfsContent",
    [fullRevealHash],
    revealContext
  );

  log.debug("Creating RevealTokenIpfsContent with hash: {}", [
    fullRevealHash,
  ]);
}

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

export function handleConsecutiveTransfer(
  event: ConsecutiveTransferEvent
): void {
  let entity = new ConsecutiveTransfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.fromTokenId = event.params.fromTokenId;
  entity.toTokenId = event.params.toTokenId;
  entity.from = event.params.from;
  entity.to = event.params.to;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleLastPrizeDraw(event: LastPrizeDrawEvent): void {
  let entity = new LastPrizeDraw(
    Bytes.fromUTF8(event.params.requestId.toString())
  );
  entity.requestId = event.params.requestId;
  entity.seriesID = event.params.seriesID;
  entity.quantity = event.params.quantity;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleNewSubPrize(event: NewSubPrizeEvent): void {
  let prizeID = event.params.seriesID
    .toString()
    .concat(event.params.subPrizeID.toString());
  let entity = new NewSubPrize(Bytes.fromUTF8(prizeID));
  entity.seriesID = event.params.seriesID;
  entity.subPrizeID = event.params.subPrizeID;
  entity.prizeGroup = event.params.prizeGroup;
  entity.subPrizeName = event.params.subPrizeName;
  entity.subPrizeRemainingQuantity = event.params.subPrizeRemainingQuantity;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  // Linking each prize back to its series by entity ID
  let ID = event.params.seriesID.toString();
  entity.belongSeries = Bytes.fromUTF8(ID);

  // 加載對應的系列資料
  let seriesEntity = NewSeries.load(Bytes.fromUTF8(ID));

  createRevealTokenIpfsContent(seriesEntity, event.params.subPrizeID);

  entity.save();
}

export function handleNewSeries(event: NewSeriesEvent): void {
  log.debug("handleNewSeries: {}", [event.params.seriesID.toString()]);
  // Create a new Series ID and turn it to bytes format
  let ID = event.params.seriesID.toString();
  let entity = new NewSeries(Bytes.fromUTF8(ID));
  entity.seriesContract = event.address;
  entity.seriesID = event.params.seriesID;
  entity.seriesName = event.params.seriesName;
  entity.totalTicketNumbers = event.params.totalTicketNumbers;
  entity.remainingTicketNumbers = event.params.remainingTicketNumbers;
  entity.priceInUSDTWei = event.params.priceInUSDTWei;
  entity.priceInPoints = event.params.priceInUSDTWei;
  entity.priceInTWD = event.params.priceInTWD;
  entity.isGoodsArrived = event.params.isGoodsArrived;
  entity.estimateDeliverTime = event.params.estimateDeliverTime;
  entity.exchangeExpireTime = event.params.exchangeExpireTime;
  entity.exchangeTokenURI = event.params.exchangeTokenURI;
  entity.unrevealTokenURI = event.params.unrevealTokenURI;
  entity.revealTokenURI = event.params.revealTokenURI;
  entity.seriesMetaDataURI = event.params.seriesMetaDataURI;
  // keep lastPrizeOwner = empty
  entity.lastPrizeOwner = [];
  entity.isRefund = event.params.isRefund;
  entity.isPreOrder = event.params.isPreOrder;
  entity.recentIPFSHash = Bytes.empty();
  entity.merchantRelinkCount = 0;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  let ipfsIndex = entity.seriesMetaDataURI.indexOf("/ipfs/");
  log.debug("ipfsIndex: {}", [ipfsIndex.toString()]);

  let context = new DataSourceContext();
  context.setBytes(SERIES_ID_KEY, entity.id);
  log.debug("context: {}", [entity.id.toString()]);
  // "https://lime-basic-thrush-351.mypinata.cloud/ipfs/QmYxweAJixyVVAeQeGf6y8CVk4GmUBTfNiVJvusgcaUuMU/series10.json" is the example URI
  // "https://lime-basic-thrush-351.mypinata.cloud/ipfs/QmXqCGcxXxpf67wRswRPvY3Xm8RpicXDe3JtfJ6m2rnyHf is the new example URI
  if (ipfsIndex != -1) {
    log.debug("IPFS Index: {}", [ipfsIndex.toString()]);
    let hash = entity.seriesMetaDataURI.slice(ipfsIndex + 6).trim();
    entity.recentIPFSHash = Bytes.fromUTF8(hash);

    // 使用相同的 ID 生成邏輯
    let uniqueId = entity.id.concat(Bytes.fromUTF8(hash));
    entity.currentIchibanSeries = uniqueId;

    DataSourceTemplate.createWithContext("IpfsContent", [hash], context);
  }

  let unrevealIpfsIndex = entity.unrevealTokenURI.indexOf("/ipfs/");

  let unrevealContext = new DataSourceContext();
  unrevealContext.setBytes(SERIES_ID_KEY, entity.id);

  if (unrevealIpfsIndex != -1) {
    let unrevealHash = entity.unrevealTokenURI.slice(unrevealIpfsIndex + 6);
    DataSourceTemplate.createWithContext(
      "UnrevealTokenIpfsContent",
      [unrevealHash],
      unrevealContext
    );
  }
  entity.save();
}

export function handleLastPrizeWinner(event: LastPrizeWinnerEvent): void {
  let entity = new LastPrizeWinner(
    Bytes.fromUTF8(event.params.requestId.toString())
  );

  entity.requestId = event.params.requestId;
  entity.randomWord = event.params.randomWord;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // update LastPrizeDraw entity
  let updateLastPrizeDrawID = event.params.requestId.toString();
  let updateLastPrizeDraw = LastPrizeDraw.load(
    Bytes.fromUTF8(updateLastPrizeDrawID)
  );
  if (updateLastPrizeDraw) {
    updateLastPrizeDraw.randomWord = event.params.randomWord;
    updateLastPrizeDraw.save();
  }
}

export function handleIchibanSeries(content: Bytes): void {
  let hash = dataSource.stringParam();
  let ctx = dataSource.context();
  let seriesID = ctx.getBytes(SERIES_ID_KEY);

  // 創建唯一ID，使用 seriesID 和 hash 的組合
  let uniqueId = seriesID.concat(Bytes.fromUTF8(hash));
  let newIchibanSeries = new IchibanSeries(uniqueId);

  // 保存原始 hash 值作為參考
  newIchibanSeries.hash = hash;

  const value = json.fromBytes(content).toObject();

  if (value) {
    const IchibanSeries = value.get("IchibanSeries");
    if (IchibanSeries) {
      const IchibanSeriesOBJ = IchibanSeries.toObject();
      if (IchibanSeriesOBJ) {
        const onChainSeriesID = IchibanSeriesOBJ.get("seriesId");
        const twContent = IchibanSeriesOBJ.get("twContent");
        const enContent = IchibanSeriesOBJ.get("enContent");
        const twTitle = IchibanSeriesOBJ.get("twTitle");
        const enTitle = IchibanSeriesOBJ.get("enTitle");
        const thumbnailSrc = IchibanSeriesOBJ.get("thumbnailSrc");
        const backgroundSrc = IchibanSeriesOBJ.get("backgroundSrc");
        const twSubContent = IchibanSeriesOBJ.get("twSubContent");
        const enSubContent = IchibanSeriesOBJ.get("enSubContent");

        newIchibanSeries.belongSeries = seriesID;
        newIchibanSeries.onChainSeriesID = onChainSeriesID
          ? BigInt.fromString(onChainSeriesID.toString())
          : null;
        newIchibanSeries.twContent = twContent ? twContent.toString() : null;
        newIchibanSeries.enContent = enContent ? enContent.toString() : null;
        newIchibanSeries.twTitle = twTitle ? twTitle.toString() : null;
        newIchibanSeries.enTitle = enTitle ? enTitle.toString() : null;
        newIchibanSeries.thumbnailSrc = thumbnailSrc
          ? thumbnailSrc.toString()
          : null;
        newIchibanSeries.backgroundSrc = backgroundSrc
          ? backgroundSrc.toString()
          : null;
        newIchibanSeries.twSubContent = twSubContent
          ? twSubContent.toString()
          : null;
        newIchibanSeries.enSubContent = enSubContent
          ? enSubContent.toString()
          : null;
      }
    }
  }
  newIchibanSeries.save();

  // 在處理 IchibanKujiPrize 時也需要調整 ID 生成方式
  if (value) {
    const IchibanKuji = value.get("IchibanKuji");
    if (IchibanKuji) {
      const IchibanKujiOBJ = IchibanKuji.toObject();
      if (IchibanKujiOBJ) {
        const prizes = IchibanKujiOBJ.get("prize");
        if (prizes) {
          for (let i = 0; i < prizes.toArray().length; i++) {
            const prizeOBJ = prizes.toArray()[i].toObject();
            if (prizeOBJ) {
              const prizeId = prizeOBJ.get("id");
              const type = prizeOBJ.get("type");
              const twGroupName = prizeOBJ.get("twGroupName");
              const enGroupName = prizeOBJ.get("enGroupName");
              const size = prizeOBJ.get("size");
              let sizeAsString: string;
              const prizeImageSrc = prizeOBJ.get("prizeImageSrc");
              const groupTotalQuantity = prizeOBJ.get("groupTotalQuantity");
              const twGroupDescription = prizeOBJ.get("twGroupDescription");
              const enGroupDescription = prizeOBJ.get("enGroupDescription");
              const isBlindBox = prizeOBJ.get("isBlindBox");

              // 修改 prize ID 生成方式
              let newPrize = new IchibanKujiPrize(uniqueId);
              if (type) {
                newPrize.id = uniqueId.concat(Bytes.fromUTF8(type.toString()));
              }
              newPrize.hash = hash;
              newPrize.belongSeries = uniqueId; // 使用新的唯一ID
              newPrize.prizeId = prizeId ? prizeId.toString() : null;
              newPrize.type = type ? type.toString() : null;
              newPrize.twGroupName = twGroupName
                ? twGroupName.toString()
                : null;
              newPrize.enGroupName = enGroupName
                ? enGroupName.toString()
                : null;
              if (size) {
                // Check if the size value is a number or a string
                if (size.kind == JSONValueKind.NUMBER) {
                  // If it's a number, convert it to a string
                  sizeAsString = size.toI64().toString();
                } else if (size.kind == JSONValueKind.STRING) {
                  // If it's already a string, use it as is
                  sizeAsString = size.toString();
                } else {
                  // If it's neither (or an unexpected type), set a default value or handle the error
                  sizeAsString = "Unknown size";
                }
              } else {
                // Handle null or undefined size value
                sizeAsString = "Unknown size";
              }
              newPrize.size = sizeAsString;
              newPrize.prizeImageSrc = prizeImageSrc
                ? prizeImageSrc.toString()
                : null;
              newPrize.groupTotalQuantity =
                jsonScalarToString(groupTotalQuantity);
              newPrize.twGroupDescription = twGroupDescription
                ? twGroupDescription.toString()
                : null;
              newPrize.enGroupDescription = enGroupDescription
                ? enGroupDescription.toString()
                : null;
              newPrize.isBlindBox = isBlindBox ? isBlindBox.toBool() : false;
              log.info("IchibanKujiPrize ID: {}", [uniqueId.toString()]);

              newPrize.save();

              const subPrize = prizeOBJ.get("subPrize");

              if (subPrize) {
                for (let j = 0; j < subPrize.toArray().length; j++) {
                  const subPrizeOBJ = subPrize.toArray()[j].toObject();
                  if (subPrizeOBJ) {
                    const subPrizeId = subPrizeOBJ.get("subPrizeId");
                    const prizeGroup = subPrizeOBJ.get("prizeGroup");
                    const twName = subPrizeOBJ.get("twName");
                    const enName = subPrizeOBJ.get("enName");
                    const size = subPrizeOBJ.get("size");
                    const subPrizeImageSrc =
                      subPrizeOBJ.get("subPrizeImageSrc");
                    const quantity = subPrizeOBJ.get("quantity");
                    const twDescription = subPrizeOBJ.get("twDescription");
                    const enDescription = subPrizeOBJ.get("enDescription");

                    // 修改 subPrize ID 生成方式
                    let newSubPrize = new IchibanKujiSubPrize(uniqueId);
                    if (type && subPrizeId) {
                      newSubPrize.id = uniqueId.concat(
                        Bytes.fromUTF8(subPrizeId.toString())
                      );
                    }
                    newSubPrize.hash = hash;
                    if (type) {
                      newSubPrize.belongIchibanPrize = uniqueId.concat(
                        Bytes.fromUTF8(type.toString())
                      );
                    }
                    newSubPrize.subPrizeId = subPrizeId
                      ? subPrizeId.toString()
                      : null;
                    newSubPrize.prizeGroup = prizeGroup
                      ? prizeGroup.toString()
                      : null;
                    newSubPrize.twName = twName ? twName.toString() : null;
                    newSubPrize.enName = enName ? enName.toString() : null;
                    newSubPrize.size = size ? size.toString() : null;
                    newSubPrize.subPrizeImageSrc = subPrizeImageSrc
                      ? subPrizeImageSrc.toString()
                      : null;
                    newSubPrize.twDescription = twDescription
                      ? twDescription.toString()
                      : null;
                    newSubPrize.enDescription = enDescription
                      ? enDescription.toString()
                      : null;
                    newSubPrize.quantity = jsonScalarToString(quantity);
                    newSubPrize.save();
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

export function handleUnrevealTokenContent(unrevealContext: Bytes): void {
  let hash = dataSource.stringParam();
  let ctx = dataSource.context();
  let seriesID = ctx.getBytes(SERIES_ID_KEY);

  let uniqueId = seriesID.concat(Bytes.fromUTF8(hash));
  let unrevealTokenMetadata = new UnrevealTokenMetadata(uniqueId);
  // 保存原始 hash 值作為參考
  const value = json.fromBytes(unrevealContext).toObject();

  if (value) {
    // 基本信息
    let name = value.get("name");
    let image = value.get("image");

    if (name && image) {
      unrevealTokenMetadata.name = name.toString();
      unrevealTokenMetadata.image = image.toString();
    }

    unrevealTokenMetadata.series = seriesID;

    // 處理屬性
    // let attributes = value.get('attributes')
    // if (attributes) {
    //   let attributesArray = attributes.toArray()

    //   for (let i = 0; i < attributesArray.length; i++) {
    //     let attribute = attributesArray[i].toObject()
    //     let traitType = attribute.get('trait_type')
    //     let value = attribute.get('value')

    //     if (traitType && traitType.toString() == 'estimateDeliverTime' && value) {
    //       unrevealTokenMetadata.estimateDeliverTime = BigInt.fromString(value.toString())
    //     }
    //   }
    // }

    unrevealTokenMetadata.save();
  }
}

export function handleRevealTokenContent(revealContext: Bytes): void {
  let hash = dataSource.stringParam();
  let ctx = dataSource.context();
  let seriesID = ctx.getBytes(SERIES_ID_KEY);
  let subPrizeID = ctx.getBigInt(SUB_PRIZE_ID_KEY);

  // 創建一個包含 seriesID 和 subPrizeID 的唯一 ID
  let uniqueId = seriesID
    .concat(Bytes.fromUTF8("_subPrize_"))
    .concat(Bytes.fromUTF8(subPrizeID.toString()));
  let revealTokenMetadata = new RevealTokenMetadata(uniqueId);

  const value = json.fromBytes(revealContext).toObject();

  if (value) {
    // 基本信息
    let name = value.get("name");
    let description = value.get("description");
    let image = value.get("image");
    let animationUrl = value.get("animation_url");

    if (name) {
      revealTokenMetadata.name = name.toString();
    } else {
      revealTokenMetadata.name = "Unknown Prize";
    }

    if (description) {
      revealTokenMetadata.description = description.toString();
    } else {
      revealTokenMetadata.description = "";
    }

    if (image) {
      revealTokenMetadata.image = image.toString();
    } else {
      revealTokenMetadata.image = "";
    }

    if (animationUrl) {
      revealTokenMetadata.animationUrl = animationUrl.toString();
    }

    revealTokenMetadata.series = seriesID;
    revealTokenMetadata.subPrizeID = subPrizeID;

    let attributes = value.get("attributes");
    if (attributes) {
      let attributesArray = attributes.toArray();

      for (let i = 0; i < attributesArray.length; i++) {
        let attribute = attributesArray[i].toObject();
        let traitType = attribute.get("trait_type");
        let attrValue = attribute.get("value");

        if (traitType && attrValue) {
          let traitTypeStr = traitType.toString();
          if (traitTypeStr == "prizeType") {
            revealTokenMetadata.prizeType = attrValue.toString();
          } else if (traitTypeStr == "category") {
            revealTokenMetadata.category = attrValue.toString();
          }
        }
      }
    }

    log.debug("Saving RevealTokenMetadata with ID: {}", [uniqueId.toString()]);
    revealTokenMetadata.save();
  } else {
    log.warning("Failed to parse RevealTokenMetadata JSON for hash: {}", [
      hash,
    ]);
  }
}

export function handleNewTicketStatus(event: NewTicketStatusEvent): void {
  let entity = NewTicketStatus.load(ticketId(event.params.tokenID));
  if (!entity) {
    entity = new NewTicketStatus(ticketId(event.params.tokenID));
  }
  entity.tokenID = event.params.tokenID;
  entity.seriesID = event.params.seriesID;
  entity.tokenRevealedPrize = event.params.tokenRevealedPrize;
  entity.tokenExchange = event.params.tokenExchange;
  entity.tokenRevealed = event.params.tokenRevealed;
  entity.tokenRevealTimestamp = event.params.tokenRevealed
    ? event.block.timestamp
    : BigInt.fromI32(0);
  entity.tokenOwner = event.params.tokenOwner;
  entity.luckyNumber = BigInt.fromI32(event.params.luckyNumber);
  entity.tokenSource = event.params.tokenRevealedPrize.equals(
    BigInt.fromString(LAST_PRIZE_ID)
  )
    ? TOKEN_SOURCE_LAST_PRIZE
    : TOKEN_SOURCE_DRAW;
  entity.isReward = false;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  // Linking each prize back to its series by entity ID
  let ID = event.params.seriesID.toString();

  entity.belongSeries = Bytes.fromUTF8(ID);

  // load newSeries to get currentHash
  let newSeries = NewSeries.load(Bytes.fromUTF8(ID));
  if (newSeries && newSeries.currentIchibanSeries) {
    // 使用相同的 ID 生成邏輯
    let uniqueId = Bytes.fromUTF8(ID).concat(newSeries.recentIPFSHash);
    entity.belongIchibanSeries = uniqueId;
  }

  // Link revealMetadata if tokenRevealedPrize > 0
  if (event.params.tokenRevealedPrize.gt(BigInt.fromI32(0))) {
    let metadataId = Bytes.fromUTF8(ID)
      .concat(Bytes.fromUTF8("_subPrize_"))
      .concat(Bytes.fromUTF8(event.params.tokenRevealedPrize.toString()));
    entity.revealMetadata = metadataId;
    createRevealTokenIpfsContent(newSeries, event.params.tokenRevealedPrize);
  }

  // check if tokenRevealedPrize is 999, then set belongIchibanSubPrize
  if (
    event.params.tokenRevealedPrize == BigInt.fromString("999") ||
    event.params.tokenRevealedPrize == BigInt.fromString("90")
  ) {
    let prizeID = Bytes.fromUTF8(event.params.seriesID.toString());
    if (newSeries) {
      entity.belongIchibanSubPrize = prizeID.concat(
        Bytes.fromUTF8(
          newSeries.recentIPFSHash.toString() +
            event.params.tokenRevealedPrize.toString()
        )
      );
    }
  }

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

  let updateTicketStatus = NewTicketStatus.load(
    ticketId(event.params.tokenId)
  );

  if (updateTicketStatus) {
    updateTicketStatus.tokenOwner = event.params.to;
    updateTicketStatus.save();
  }
}

export function handleUpdatePrize(event: UpdatePrizeEvent): void {
  let entity = new UpdatePrize(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.subPrizeID = event.params.subPrizeID;
  entity.subPrizeRemainingQuantity = event.params.subPrizeRemainingQuantity;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // update prizeRemainingQuantity in NewPrize entity
  let prizeID = event.params.seriesID
    .toString()
    .concat(event.params.subPrizeID.toString());
  let updatePrize = NewSubPrize.load(Bytes.fromUTF8(prizeID));
  if (updatePrize) {
    updatePrize.subPrizeRemainingQuantity =
      event.params.subPrizeRemainingQuantity;
    updatePrize.save();
  }
}

export function handleUpdateSeriesInformation(
  event: UpdateSeriesInformationEvent
): void {
  let entity = new UpdateSeriesInformation(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.isGoodsArrived = event.params.isGoodsArrived;
  entity.estimateDeliverTime = event.params.estimateDeliverTime;
  entity.exchangeExpireTime = event.params.exchangeExpireTime;
  entity.exchangeTokenURI = event.params.exchangeTokenURI;
  entity.unrevealTokenURI = event.params.unrevealTokenURI;
  entity.revealTokenURI = event.params.revealTokenURI;
  entity.seriesMetaDataURI = event.params.seriesMetaDataURI;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // update seriesMetaDataURI in NewSeries entity
  let seriesID = event.params.seriesID.toString();
  let creatNewIPFS = false;
  let updateSeries = NewSeries.load(Bytes.fromUTF8(seriesID));
  if (updateSeries) {
    updateSeries.isGoodsArrived = event.params.isGoodsArrived;
    updateSeries.estimateDeliverTime = event.params.estimateDeliverTime;
    updateSeries.exchangeExpireTime = event.params.exchangeExpireTime;
    updateSeries.exchangeTokenURI = event.params.exchangeTokenURI;
    updateSeries.unrevealTokenURI = event.params.unrevealTokenURI;
    updateSeries.revealTokenURI = event.params.revealTokenURI;
    if (event.params.seriesMetaDataURI != updateSeries.seriesMetaDataURI) {
      creatNewIPFS = true;
    }
    updateSeries.seriesMetaDataURI = event.params.seriesMetaDataURI;
    let ipfsIndex = event.params.seriesMetaDataURI.indexOf("/ipfs/");
    let hash = event.params.seriesMetaDataURI.slice(ipfsIndex + 6);
    updateSeries.recentIPFSHash = Bytes.fromUTF8(hash);

    // 使用相同的 ID 生成邏輯
    let uniqueId = updateSeries.id.concat(Bytes.fromUTF8(hash));
    updateSeries.currentIchibanSeries = uniqueId;

    if (creatNewIPFS) {
      log.debug("ipfsIndex: {}", [ipfsIndex.toString()]);
      if (ipfsIndex == -1) return;

      let context = new DataSourceContext();
      let seriesID = Bytes.fromUTF8(event.params.seriesID.toString());
      context.setBytes(SERIES_ID_KEY, seriesID);
      log.debug("context: {}", [entity.id.toString()]);
      // "https://lime-basic-thrush-351.mypinata.cloud/ipfs/QmYxweAJixyVVAeQeGf6y8CVk4GmUBTfNiVJvusgcaUuMU/series10.json" is the example URI
      // "https://lime-basic-thrush-351.mypinata.cloud/ipfs/QmXqCGcxXxpf67wRswRPvY3Xm8RpicXDe3JtfJ6m2rnyHf is the new example URI
      if (ipfsIndex != -1) {
        log.debug("IPFS Index: {}", [ipfsIndex.toString()]);
        DataSourceTemplate.createWithContext("IpfsContent", [hash], context);
      }
    }

    updateSeries.save();
  }
}

export function handleUpdateSeriesLastPrizeOwner(
  event: UpdateSeriesLastPrizeOwnerEvent
): void {
  let entity = new UpdateSeriesLastPrizeOwner(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  // address[] to bytes[]
  entity.lastPrizeOwner = event.params.lastPrizeOwner.map<Bytes>(
    (e: Bytes) => e
  );
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // update lastPrizeOwner in NewSeries entity
  let seriesID = event.params.seriesID.toString();
  let updateSeries = NewSeries.load(Bytes.fromUTF8(seriesID));
  if (updateSeries) {
    updateSeries.lastPrizeOwner = event.params.lastPrizeOwner.map<Bytes>(
      (e: Bytes) => e
    );
    updateSeries.save();
  }
}

export function handleUpdateSeriesRemainingTicketNumbers(
  event: UpdateSeriesRemainingTicketNumbersEvent
): void {
  let entity = new UpdateSeriesRemainingTicketNumbers(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.remainingTicketNumbers = event.params.remainingTicketNumbers;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // // update PrizeRemainingQuantity in NewSeries entity
  let seriesID = event.params.seriesID.toString();
  let updateSeries = NewSeries.load(Bytes.fromUTF8(seriesID));
  if (updateSeries) {
    updateSeries.remainingTicketNumbers = event.params.remainingTicketNumbers;
    updateSeries.save();
  }
}

export function handleUpdateTicketStatus(event: UpdateTicketStatusEvent): void {
  // update NewTicketStatus entity
  let updateTicketStatus = NewTicketStatus.load(
    ticketId(event.params.tokenID)
  );
  let tokenRevealTimestamp = BigInt.fromI32(0);

  let ID = event.params.seriesID.toString();
  // load newSeries to get currentHash
  let newSeries = NewSeries.load(Bytes.fromUTF8(ID));

  if (updateTicketStatus) {
    let wasRevealed = updateTicketStatus.tokenRevealed;
    tokenRevealTimestamp = updateTicketStatus.tokenRevealTimestamp;
    if (
      event.params.tokenRevealed &&
      !event.params.tokenExchange &&
      (!wasRevealed || tokenRevealTimestamp.equals(BigInt.fromI32(0)))
    ) {
      tokenRevealTimestamp = event.block.timestamp;
    }

    updateTicketStatus.tokenRevealedPrize = event.params.tokenRevealedPrize;
    updateTicketStatus.tokenExchange = event.params.tokenExchange;
    updateTicketStatus.tokenRevealed = event.params.tokenRevealed;
    updateTicketStatus.tokenRevealTimestamp = tokenRevealTimestamp;
    // update ticket status belongIchibanPrize
    let prizeID = Bytes.fromUTF8(event.params.seriesID.toString());
    if (newSeries) {
      // 使用相同的 ID 生成邏輯
      let uniqueId = prizeID.concat(newSeries.recentIPFSHash);
      updateTicketStatus.belongIchibanSeries = uniqueId;

      // 對於 belongIchibanSubPrize，也使用一致的 ID 生成邏輯
      updateTicketStatus.belongIchibanSubPrize = uniqueId.concat(
        Bytes.fromUTF8(event.params.tokenRevealedPrize.toString())
      );

      let seriesIDBytes = Bytes.fromUTF8(ID);
      // 新增：建立與 RevealTokenMetadata 的關聯
      // 創建 RevealTokenMetadata 的 ID
      let metadataId = seriesIDBytes
        .concat(Bytes.fromUTF8("_subPrize_"))
        .concat(Bytes.fromUTF8(event.params.tokenRevealedPrize.toString()));
      updateTicketStatus.testID = metadataId;
      let revealMetadata = RevealTokenMetadata.load(metadataId);

      // Always link metadata if prize is valid, resolving handling race condition
      if (event.params.tokenRevealedPrize.gt(BigInt.fromI32(0))) {
        updateTicketStatus.revealMetadata = metadataId;
        createRevealTokenIpfsContent(newSeries, event.params.tokenRevealedPrize);
      }
    }
    updateTicketStatus.save();
  } else if (event.params.tokenRevealed && !event.params.tokenExchange) {
    tokenRevealTimestamp = event.block.timestamp;
  }

  let entity = new UpdateTicketStatus(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.tokenID = event.params.tokenID;
  entity.seriesID = event.params.seriesID;
  entity.tokenRevealedPrize = event.params.tokenRevealedPrize;
  entity.tokenExchange = event.params.tokenExchange;
  entity.tokenRevealed = event.params.tokenRevealed;
  entity.tokenRevealTimestamp = tokenRevealTimestamp;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleAdminMinted(event: AdminMintedEvent): void {
  let entity = new AdminMinted(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.operator = event.params.operator;
  entity.to = event.params.to;
  entity.seriesID = event.params.seriesID;
  entity.quantity = event.params.quantity;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleVrfRouterUpdated(event: VrfRouterUpdatedEvent): void {
  let entity = new VrfRouterUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.vrfRouter = event.params.vrfRouter;
  entity.operator = event.params.operator;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleMintLockUpdated(event: MintLockUpdatedEvent): void {
  let id = event.params.seriesID
    .toString()
    .concat("-")
    .concat(event.params.owner.toHexString());
  let entity = new MintLockUpdated(Bytes.fromUTF8(id));
  entity.seriesID = event.params.seriesID;
  entity.owner = event.params.owner;
  entity.until = event.params.until;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleSeriesUnlockedFor(event: SeriesUnlockedForEvent): void {
  let entity = new SeriesUnlockedFor(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.user = event.params.user;
  entity.expires = event.params.expires;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
