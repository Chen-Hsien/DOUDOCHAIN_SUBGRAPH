import {
  afterEach,
  assert,
  clearStore,
  describe,
  test,
} from "matchstick-as/assembly/index";
import { newMockEvent } from "matchstick-as";
import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  MintLockUpdated as CoreMintLockUpdated,
  NewSeries,
  NewTicketStatus,
  UpdateTicketStatus,
} from "../generated/ICHICHAIN/ICHICHAIN";
import {
  MintLockUpdated as SeriesOpsMintLockUpdated,
  SeriesLockDurationUpdated,
  SeriesRevealEnabledUpdated,
} from "../generated/DoudoSeriesOpsModule/DoudoSeriesOpsModuleUpgradeable";
import {
  handleMintLockUpdated,
  handleNewSeries,
  handleNewTicketStatus,
  handleUpdateTicketStatus,
} from "../src/ichichain";
import {
  handleSeriesLockDurationUpdated,
  handleSeriesOpsMintLockUpdated,
  handleSeriesRevealEnabledUpdated,
} from "../src/series-ops";
import {
  createNewSeriesEvent,
  createNewTicketStatusEvent,
  createUpdateTicketStatusEvent,
} from "./doudochain-utils";

function runtimeId(seriesID: BigInt): string {
  return Bytes.fromUTF8(seriesID.toString()).toHexString();
}

function seedSeries(seriesID: BigInt): void {
  handleNewSeries(
    changetype<NewSeries>(
      createNewSeriesEvent(
        seriesID,
        "runtime projection",
        BigInt.fromI32(100),
        BigInt.fromI32(100),
        BigInt.fromI32(10),
        BigInt.fromI32(10),
        false,
        BigInt.zero(),
        BigInt.zero(),
        "",
        "",
        "",
        "",
        Address.zero(),
        false,
        false
      )
    )
  );
}

function createMintLockEvent(
  seriesID: BigInt,
  owner: Address,
  until: BigInt,
  blockNumber: i32,
  blockTimestamp: i32,
  transactionHash: Bytes
): ethereum.Event {
  let event = newMockEvent();
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  );
  event.parameters.push(
    new ethereum.EventParam("owner", ethereum.Value.fromAddress(owner))
  );
  event.parameters.push(
    new ethereum.EventParam(
      "until",
      ethereum.Value.fromUnsignedBigInt(until)
    )
  );
  event.block.number = BigInt.fromI32(blockNumber);
  event.block.timestamp = BigInt.fromI32(blockTimestamp);
  event.transaction.hash = transactionHash;
  return event;
}

function createSeriesLockDurationUpdatedEvent(
  seriesID: BigInt,
  duration: BigInt,
  transactionHash: Bytes
): ethereum.Event {
  let event = newMockEvent();
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  );
  event.parameters.push(
    new ethereum.EventParam(
      "duration",
      ethereum.Value.fromUnsignedBigInt(duration)
    )
  );
  event.block.number = BigInt.fromI32(40);
  event.block.timestamp = BigInt.fromI32(400);
  event.transaction.hash = transactionHash;
  return event;
}

function createSeriesRevealEnabledUpdatedEvent(
  seriesID: BigInt,
  enabled: boolean,
  transactionHash: Bytes
): ethereum.Event {
  let event = newMockEvent();
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      "seriesID",
      ethereum.Value.fromUnsignedBigInt(seriesID)
    )
  );
  event.parameters.push(
    new ethereum.EventParam("enabled", ethereum.Value.fromBoolean(enabled))
  );
  event.block.number = BigInt.fromI32(50);
  event.block.timestamp = BigInt.fromI32(500);
  event.transaction.hash = transactionHash;
  return event;
}

describe("Series runtime state", () => {
  afterEach(() => {
    clearStore();
  });

  test("materializes unrevealed count from ticket state transitions", () => {
    let seriesID = BigInt.fromI32(7);
    let owner = Address.fromString(
      "0x00000000000000000000000000000000000000a1"
    );
    seedSeries(seriesID);

    let id = runtimeId(seriesID);
    assert.fieldEquals("SeriesRuntimeState", id, "series", id);
    assert.fieldEquals("SeriesRuntimeState", id, "unrevealedCount", "0");
    assert.fieldEquals("SeriesRuntimeState", id, "mintLockUntil", "0");

    handleNewTicketStatus(
      changetype<NewTicketStatus>(
        createNewTicketStatusEvent(
          BigInt.fromI32(101),
          seriesID,
          BigInt.zero(),
          false,
          false,
          owner,
          11
        )
      )
    );
    assert.fieldEquals("SeriesRuntimeState", id, "unrevealedCount", "1");

    // Replaying the same current state must not drift the materialized count.
    handleNewTicketStatus(
      changetype<NewTicketStatus>(
        createNewTicketStatusEvent(
          BigInt.fromI32(101),
          seriesID,
          BigInt.zero(),
          false,
          false,
          owner,
          11
        )
      )
    );
    assert.fieldEquals("SeriesRuntimeState", id, "unrevealedCount", "1");

    handleUpdateTicketStatus(
      changetype<UpdateTicketStatus>(
        createUpdateTicketStatusEvent(
          BigInt.fromI32(101),
          seriesID,
          BigInt.fromI32(3),
          false,
          true
        )
      )
    );
    assert.fieldEquals("SeriesRuntimeState", id, "unrevealedCount", "0");

    // Repeated revealed updates and directly revealed mints stay at zero.
    handleUpdateTicketStatus(
      changetype<UpdateTicketStatus>(
        createUpdateTicketStatusEvent(
          BigInt.fromI32(101),
          seriesID,
          BigInt.fromI32(3),
          false,
          true
        )
      )
    );
    handleNewTicketStatus(
      changetype<NewTicketStatus>(
        createNewTicketStatusEvent(
          BigInt.fromI32(102),
          seriesID,
          BigInt.fromI32(4),
          false,
          true,
          owner,
          12
        )
      )
    );
    assert.fieldEquals("SeriesRuntimeState", id, "unrevealedCount", "0");
  });

  test("projects the latest core and series-ops mint lock", () => {
    let seriesID = BigInt.fromI32(8);
    let firstOwner = Address.fromString(
      "0x00000000000000000000000000000000000000b1"
    );
    let secondOwner = Address.fromString(
      "0x00000000000000000000000000000000000000b2"
    );
    let firstTx = Bytes.fromHexString(
      "0x1111111111111111111111111111111111111111111111111111111111111111"
    );
    let secondTx = Bytes.fromHexString(
      "0x2222222222222222222222222222222222222222222222222222222222222222"
    );
    let clearTx = Bytes.fromHexString(
      "0x3333333333333333333333333333333333333333333333333333333333333333"
    );
    seedSeries(seriesID);

    handleMintLockUpdated(
      changetype<CoreMintLockUpdated>(
        createMintLockEvent(
          seriesID,
          firstOwner,
          BigInt.fromI32(1000),
          10,
          100,
          firstTx
        )
      )
    );

    let id = runtimeId(seriesID);
    assert.fieldEquals(
      "SeriesRuntimeState",
      id,
      "mintLockOwner",
      firstOwner.toHexString()
    );
    assert.fieldEquals("SeriesRuntimeState", id, "mintLockUntil", "1000");
    assert.fieldEquals("SeriesRuntimeState", id, "mintLockBlockNumber", "10");
    assert.fieldEquals(
      "SeriesRuntimeState",
      id,
      "mintLockTransactionHash",
      firstTx.toHexString()
    );

    handleSeriesOpsMintLockUpdated(
      changetype<SeriesOpsMintLockUpdated>(
        createMintLockEvent(
          seriesID,
          secondOwner,
          BigInt.fromI32(2000),
          20,
          200,
          secondTx
        )
      )
    );
    assert.fieldEquals(
      "SeriesRuntimeState",
      id,
      "mintLockOwner",
      secondOwner.toHexString()
    );
    assert.fieldEquals("SeriesRuntimeState", id, "mintLockUntil", "2000");
    assert.fieldEquals(
      "SeriesRuntimeState",
      id,
      "mintLockBlockTimestamp",
      "200"
    );

    handleSeriesOpsMintLockUpdated(
      changetype<SeriesOpsMintLockUpdated>(
        createMintLockEvent(
          seriesID,
          Address.zero(),
          BigInt.zero(),
          30,
          300,
          clearTx
        )
      )
    );
    assert.fieldEquals(
      "SeriesRuntimeState",
      id,
      "mintLockOwner",
      Address.zero().toHexString()
    );
    assert.fieldEquals("SeriesRuntimeState", id, "mintLockUntil", "0");
    assert.entityCount("MintLockUpdated", 3);
  });

  test("projects lock duration and reveal availability updates", () => {
    let seriesID = BigInt.fromI32(18);
    let lockTx = Bytes.fromHexString(
      "0x4444444444444444444444444444444444444444444444444444444444444444"
    );
    let revealTx = Bytes.fromHexString(
      "0x5555555555555555555555555555555555555555555555555555555555555555"
    );
    seedSeries(seriesID);

    handleSeriesLockDurationUpdated(
      changetype<SeriesLockDurationUpdated>(
        createSeriesLockDurationUpdatedEvent(
          seriesID,
          BigInt.fromI32(3600),
          lockTx
        )
      )
    );
    handleSeriesRevealEnabledUpdated(
      changetype<SeriesRevealEnabledUpdated>(
        createSeriesRevealEnabledUpdatedEvent(seriesID, true, revealTx)
      )
    );

    let id = runtimeId(seriesID);
    assert.fieldEquals("SeriesRuntimeState", id, "lockDuration", "3600");
    assert.fieldEquals(
      "SeriesRuntimeState",
      id,
      "lockDurationTransactionHash",
      lockTx.toHexString()
    );
    assert.fieldEquals("SeriesRuntimeState", id, "revealEnabled", "true");
    assert.fieldEquals(
      "SeriesRuntimeState",
      id,
      "revealEnabledTransactionHash",
      revealTx.toHexString()
    );
    assert.entityCount("SeriesLockDurationUpdated", 1);
    assert.entityCount("SeriesRevealEnabledUpdated", 1);
  });
});
