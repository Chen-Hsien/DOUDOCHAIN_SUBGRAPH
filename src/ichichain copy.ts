import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  ConsecutiveTransfer as ConsecutiveTransferEvent,
  LastPrizeDraw as LastPrizeDrawEvent,
  LastPrizeWinner as LastPrizeWinnerEvent,
  NewSeries as NewSeriesEvent,
  NewSubPrize as NewSubPrizeEvent,
  NewTicketStatus as NewTicketStatusEvent,
  RefundSeries as RefundSeriesEvent,
  ResetSubPrize as ResetSubPrizeEvent,
  Transfer as TransferEvent,
  UpdatePrize as UpdatePrizeEvent,
  UpdateSeriesInformation as UpdateSeriesInformationEvent,
  UpdateSeriesLastPrizeOwner as UpdateSeriesLastPrizeOwnerEvent,
  UpdateSeriesRemainingTicketNumbers as UpdateSeriesRemainingTicketNumbersEvent,
  UpdateTicketStatus as UpdateTicketStatusEvent,
  ICHICHAIN__getSubPrizesDetailResultValue0Struct as SubPrizeContract,
  ICHICHAIN,
} from "../generated/ICHICHAIN/ICHICHAIN";
import {
  Approval,
  ApprovalForAll,
  ConsecutiveTransfer,
  LastPrizeDraw,
  LastPrizeWinner,
  NewSeries,
  NewSubPrize,
  NewTicketStatus,
  RefundSeries,
  Transfer,
  UpdatePrize,
  UpdateSeriesInformation,
  UpdateSeriesLastPrizeOwner,
  UpdateSeriesRemainingTicketNumbers,
  UpdateTicketStatus,
  IchibanSeries,
  IchibanKujiPrize,
  IchibanKujiSubPrize,
} from "../generated/schema";

import {
  json,
  BigInt,
  Bytes,
  log,
  dataSource,
  DataSourceContext,
  DataSourceTemplate,
  JSONValueKind,
  store,
  Address,
} from "@graphprotocol/graph-ts";

const SERIES_ID_KEY = "seriesID";

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
    .concat("-")
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

  entity.save();
}

export function handleNewSeries(event: NewSeriesEvent): void {
  log.debug("handleNewSeries: {}", [event.params.seriesID.toString()]);
  // Create a new Series ID and turn it to bytes format
  let ID = event.params.seriesID.toString();
  let entity = new NewSeries(Bytes.fromUTF8(ID));
  entity.seriesID = event.params.seriesID;
  entity.seriesName = event.params.seriesName;
  entity.totalTicketNumbers = event.params.totalTicketNumbers;
  entity.remainingTicketNumbers = event.params.remainingTicketNumbers;
  entity.priceInUSDTWei = event.params.priceInUSDTWei;
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

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
  let ipfsIndex = entity.seriesMetaDataURI.indexOf("/ipfs/");
  log.debug("ipfsIndex: {}", [ipfsIndex.toString()]);
  if (ipfsIndex == -1) return;

  let context = new DataSourceContext();
  context.setBytes(SERIES_ID_KEY, entity.id);
  log.debug("context: {}", [entity.id.toString()]);
  // "https://lime-basic-thrush-351.mypinata.cloud/ipfs/QmYxweAJixyVVAeQeGf6y8CVk4GmUBTfNiVJvusgcaUuMU/series10.json" is the example URI
  // "https://lime-basic-thrush-351.mypinata.cloud/ipfs/QmXqCGcxXxpf67wRswRPvY3Xm8RpicXDe3JtfJ6m2rnyHf is the new example URI
  if (ipfsIndex != -1) {
    log.debug("IPFS Index: {}", [ipfsIndex.toString()]);
    let hash = entity.seriesMetaDataURI.slice(ipfsIndex + 6);
    DataSourceTemplate.createWithContext("IpfsContent", [hash], context);
  }
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
  log.info("Series Content: {}", [content.toString()]);
  let hash = dataSource.stringParam();
  log.info("Series Hash: {}", [hash]);
  let ctx = dataSource.context();
  let seriesID = ctx.getBytes(SERIES_ID_KEY);

  // load the seriesID first to check if the series is already created
  let newIchibanSeries = IchibanSeries.load(seriesID);
  if (!newIchibanSeries) {
    newIchibanSeries = new IchibanSeries(seriesID);
    newIchibanSeries.id = seriesID;
  }

  newIchibanSeries.hash = hash;
  // write in content for testing
  // newIchibanSeries.content = content.toString();

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

  if (value) {
    // Assuming IchibanKujiOBJ extraction has already been done

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

              if (type) {
                // newPrize id need to be unique
                let newPrizeid = seriesID.concat(
                  Bytes.fromUTF8("prize" + type.toString())
                );

                // check exist or not then auto generate ID from seriesID and prizeID
                let newPrize = IchibanKujiPrize.load(newPrizeid);
                if (!newPrize) {
                  newPrize = new IchibanKujiPrize(newPrizeid);
                }

                newPrize.hash = hash;
                newPrize.belongSeries = seriesID; // Linking each prize back to its series
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
                newPrize.groupTotalQuantity = groupTotalQuantity
                  ? groupTotalQuantity.toI64().toString()
                  : null; // Assuming quantity is an integer
                newPrize.twGroupDescription = twGroupDescription
                  ? twGroupDescription.toString()
                  : null;
                newPrize.enGroupDescription = enGroupDescription
                  ? enGroupDescription.toString()
                  : null;
                newPrize.isBlindBox = isBlindBox ? isBlindBox.toBool() : false;
                log.info("IchibanKujiPrize ID: {}", [seriesID.toString()]);

                newPrize.save();
              }
              const subPrize = prizeOBJ.get("subPrize");

              if (subPrize) {
                for (let i = 0; i < subPrize.toArray().length; i++) {
                  const subPrizeOBJ = subPrize.toArray()[i].toObject();
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

                    // check exist or not then auto generate ID from seriesID and subPrizeID
                    if (subPrizeId) {
                      let IchibanKujiSubPrizeId = seriesID.concat(
                        Bytes.fromUTF8("subPrize" + subPrizeId.toString())
                      );

                      if (IchibanKujiSubPrizeId) {
                        // load the seriesID first to check if the series is already created
                        let newSubPrize = IchibanKujiSubPrize.load(
                          IchibanKujiSubPrizeId
                        );
                        if (!newSubPrize) {
                          newSubPrize = new IchibanKujiSubPrize(
                            IchibanKujiSubPrizeId
                          );
                        }
                        newSubPrize.id = IchibanKujiSubPrizeId;
                        newSubPrize.hash = hash;
                        if (type) {
                          newSubPrize.belongIchibanPrize = seriesID.concat(
                            Bytes.fromUTF8("prize" + type.toString())
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
                        newSubPrize.quantity = quantity
                          ? quantity.toI64().toString()
                          : null;
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
  }
}

export function handleNewTicketStatus(event: NewTicketStatusEvent): void {
  let NewTicketStatusEventID = event.params.tokenID.toString();
  let entity = new NewTicketStatus(Bytes.fromUTF8(NewTicketStatusEventID));
  entity.tokenID = event.params.tokenID;
  entity.seriesID = event.params.seriesID;
  entity.tokenRevealedPrize = event.params.tokenRevealedPrize;
  entity.tokenExchange = event.params.tokenExchange;
  entity.tokenRevealed = event.params.tokenRevealed;
  entity.tokenOwner = event.params.tokenOwner;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  // Linking each prize back to its series by entity ID
  let ID = event.params.seriesID.toString();

  entity.belongSeries = Bytes.fromUTF8(ID);
  entity.belongIchibanSeries = Bytes.fromUTF8(ID);

  // check if tokenRevealedPrize is 999, then set belongIchibanSubPrize
  if (
    event.params.tokenRevealedPrize == BigInt.fromString("999") ||
    event.params.tokenRevealedPrize == BigInt.fromString("90")
  ) {
    let prizeID = Bytes.fromUTF8(event.params.seriesID.toString());
    entity.belongIchibanSubPrize = prizeID.concat(
      Bytes.fromUTF8("subPrize" + event.params.tokenRevealedPrize.toString())
    );
  }

  entity.save();
}

export function handleRefundSeries(event: RefundSeriesEvent): void {
  let entity = new RefundSeries(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.seriesID = event.params.seriesID;
  entity.isRefund = event.params.isRefund;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // update isRefund in NewSeries entity
  let seriesID = event.params.seriesID.toString();
  let updateSeries = NewSeries.load(Bytes.fromUTF8(seriesID));
  if (updateSeries) {
    updateSeries.isRefund = event.params.isRefund;
    updateSeries.save();
  }
}

export function handleResetSubPrize(event: ResetSubPrizeEvent): void {
  // check if subPrize is setting, than delete all subPrize
  let series = NewSeries.load(Bytes.fromUTF8(event.params.seriesID.toString()));
  if (series) {
    log.info("handleResetSubPrize Series is: {}", [series.seriesID.toString()]);
    let subPrize = series.NewPrizes.load();
    if (subPrize) {
      for (let i = 0; i < subPrize.length; i++) {
        log.info("handleResetSubPrize subPrize is: {}", [
          subPrize[i].subPrizeID.toString(),
        ]);
        let subPrizeID = Bytes.fromUTF8(
          event.params.seriesID
            .toString()
            .concat(subPrize[i].subPrizeID.toString())
        );
        store.remove("NewSubPrize", subPrizeID.toHexString());
      }
    }
  }
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

  let updateTicketStatusID = event.params.tokenId.toString();
  let updateTicketStatus = NewTicketStatus.load(
    Bytes.fromUTF8(updateTicketStatusID)
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
    .concat("-")
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
  let updateSeries = NewSeries.load(Bytes.fromUTF8(seriesID));
  if (updateSeries) {
    updateSeries.isGoodsArrived = event.params.isGoodsArrived;
    updateSeries.estimateDeliverTime = event.params.estimateDeliverTime;
    updateSeries.exchangeExpireTime = event.params.exchangeExpireTime;
    updateSeries.exchangeTokenURI = event.params.exchangeTokenURI;
    updateSeries.unrevealTokenURI = event.params.unrevealTokenURI;
    updateSeries.revealTokenURI = event.params.revealTokenURI;
    updateSeries.seriesMetaDataURI = event.params.seriesMetaDataURI;
    updateSeries.save();
  }
  // let ID = event.params.seriesID.toString();
  // let entityID = Bytes.fromUTF8(ID);

  // let ipfsIndex = entity.seriesMetaDataURI.indexOf("/ipfs/");
  // log.debug("ipfsIndex: {}", [ipfsIndex.toString()]);
  // if (ipfsIndex == -1) return;

  // let context = new DataSourceContext();
  // context.setBytes(SERIES_ID_KEY, entityID);
  // log.debug("context: {}", [seriesID]);
  // // "https://lime-basic-thrush-351.mypinata.cloud/ipfs/QmYxweAJixyVVAeQeGf6y8CVk4GmUBTfNiVJvusgcaUuMU/series10.json" is the example URI
  // // "https://lime-basic-thrush-351.mypinata.cloud/ipfs/QmXqCGcxXxpf67wRswRPvY3Xm8RpicXDe3JtfJ6m2rnyHf is the new example URI
  // if (ipfsIndex != -1) {
  //   log.debug("IPFS Index: {}", [ipfsIndex.toString()]);
  //   let hash = entity.seriesMetaDataURI.slice(ipfsIndex + 6);
  //   DataSourceTemplate.createWithContext("IpfsContent", [hash], context);
  // }
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
  let updateTicketStatusID = event.params.tokenID.toString();
  let updateTicketStatus = NewTicketStatus.load(
    Bytes.fromUTF8(updateTicketStatusID)
  );

  if (updateTicketStatus) {
    updateTicketStatus.tokenRevealedPrize = event.params.tokenRevealedPrize;
    updateTicketStatus.tokenExchange = event.params.tokenExchange;
    updateTicketStatus.tokenRevealed = event.params.tokenRevealed;
    // update ticket status belongIchibanPrize
    let prizeID = Bytes.fromUTF8(event.params.seriesID.toString());
    updateTicketStatus.belongIchibanSubPrize = prizeID.concat(
      Bytes.fromUTF8("subPrize" + event.params.tokenRevealedPrize.toString())
    );
    updateTicketStatus.save();
  }

  let entity = new UpdateTicketStatus(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.tokenID = event.params.tokenID;
  entity.seriesID = event.params.seriesID;
  entity.tokenRevealedPrize = event.params.tokenRevealedPrize;
  entity.tokenExchange = event.params.tokenExchange;
  entity.tokenRevealed = event.params.tokenRevealed;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
