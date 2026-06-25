import {
  RequesterUpdated as RequesterUpdatedEvent,
  VrfConfigUpdated as VrfConfigUpdatedEvent,
  VrfRandomWordsFulfilled as VrfRandomWordsFulfilledEvent,
  VrfRandomWordsRequested as VrfRandomWordsRequestedEvent,
} from "../generated/DoudoVRFRouter/DoudoVRFRouter";
import {
  RevealDrawSent,
  RequesterUpdated,
  VrfConfigUpdated,
  VrfRequest,
} from "../generated/schema";
import { Bytes } from "@graphprotocol/graph-ts";

export function handleRequesterUpdated(event: RequesterUpdatedEvent): void {
  let entity = new RequesterUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.requester = event.params.requester;
  entity.allowed = event.params.allowed;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleVrfConfigUpdated(event: VrfConfigUpdatedEvent): void {
  let entity = new VrfConfigUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  );
  entity.vrfCoordinator = event.params.vrfCoordinator;
  entity.subscriptionId = event.params.subscriptionId;
  entity.keyHash = event.params.keyHash;
  entity.callbackGasLimit = event.params.callbackGasLimit;
  entity.requestConfirmations = event.params.requestConfirmations;
  entity.operator = event.params.operator;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleVrfRandomWordsRequested(
  event: VrfRandomWordsRequestedEvent
): void {
  let entity = new VrfRequest(
    Bytes.fromUTF8(event.params.requestId.toString())
  );
  entity.requestId = event.params.requestId;
  entity.requester = event.params.requester;
  entity.callbackTarget = event.params.callbackTarget;
  entity.numWords = event.params.numWords;
  entity.fulfilled = false;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();

  let revealDrawSent = RevealDrawSent.load(
    Bytes.fromUTF8(event.params.requestId.toString())
  );
  if (revealDrawSent) {
    revealDrawSent.vrfNumWords = event.params.numWords;
    revealDrawSent.save();
  }
}

export function handleVrfRandomWordsFulfilled(
  event: VrfRandomWordsFulfilledEvent
): void {
  let entity = VrfRequest.load(Bytes.fromUTF8(event.params.requestId.toString()));
  if (entity) {
    entity.fulfilled = true;
    entity.save();
  }
}
