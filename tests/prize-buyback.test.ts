import { RoleGranted } from "../generated/ICHICHAIN/ICHICHAIN";
import { handleBuybackModuleRoleGranted } from "../src/buyback-module-registration";
import { assert, describe, test, clearStore, afterEach, newMockEvent, dataSourceMock, createMockedFunction } from "matchstick-as/assembly/index";
import { Address, BigInt, Bytes, ByteArray, crypto, DataSourceContext, ethereum } from "@graphprotocol/graph-ts";
import { PrizeBuybackBurned } from "../generated/templates/PrizeBuybackModule/DoudoPrizeBuybackModuleUpgradeable";
import { handlePrizeBuybackBurned } from "../src/prize-buyback";

const CORE = "0x2222222222222222222222222222222222222222";
function burn(total: i32 = 300): PrizeBuybackBurned {
  const context = new DataSourceContext();
  context.setBytes("core", Address.fromString(CORE));
  dataSourceMock.setContext(context);
  const event = changetype<PrizeBuybackBurned>(newMockEvent());
  event.parameters = [
    new ethereum.EventParam("batchId", ethereum.Value.fromFixedBytes(Bytes.fromHexString("0x" + "11".repeat(32)))),
    new ethereum.EventParam("buyer", ethereum.Value.fromAddress(Address.fromString("0x3333333333333333333333333333333333333333"))),
    new ethereum.EventParam("coreAddress", ethereum.Value.fromAddress(Address.fromString(CORE))),
    new ethereum.EventParam("tokenIds", ethereum.Value.fromUnsignedBigIntArray([BigInt.fromI32(1), BigInt.fromI32(2)])),
    new ethereum.EventParam("points", ethereum.Value.fromUnsignedBigIntArray([BigInt.fromI32(100), BigInt.fromI32(200)])),
    new ethereum.EventParam("totalPoints", ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(total))),
    new ethereum.EventParam("quoteHash", ethereum.Value.fromFixedBytes(Bytes.fromHexString("0x" + "44".repeat(32)))),
  ];
  return event;
}

describe("buyback burn projection", () => {
  afterEach(() => { clearStore(); dataSourceMock.resetValues(); });
  test("registers only a matching buyback module granted the core module role", () => {
    const event = changetype<RoleGranted>(newMockEvent());
    event.address = Address.fromString(CORE);
    const module = Address.fromString("0x6666666666666666666666666666666666666666");
    event.parameters = [
      new ethereum.EventParam("role", ethereum.Value.fromFixedBytes(Bytes.fromHexString(crypto.keccak256(ByteArray.fromUTF8("MODULE_ROLE")).toHexString()))),
      new ethereum.EventParam("account", ethereum.Value.fromAddress(module)),
      new ethereum.EventParam("sender", ethereum.Value.fromAddress(event.address)),
    ];
    createMockedFunction(module, "MAX_BATCH_SIZE", "MAX_BATCH_SIZE():(uint256)").returns([ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(50))]);
    createMockedFunction(module, "core", "core():(address)").returns([ethereum.Value.fromAddress(event.address)]);
    handleBuybackModuleRoleGranted(event);
    handleBuybackModuleRoleGranted(event);
    assert.entityCount("PrizeBuybackModuleRegistration", 1);
    assert.fieldEquals("PrizeBuybackModuleRegistration", module.toHexString(), "core", CORE);
  });
  test("indexes one immutable burn entitlement without creating a points credit", () => {
    const event = burn();
    handlePrizeBuybackBurned(event);
    handlePrizeBuybackBurned(event);
    assert.entityCount("PrizeBuybackBurn", 1);
    assert.fieldEquals("PrizeBuybackBurn", event.address.concat(event.params.batchId).toHexString(), "totalPointsRaw", "300");
  });
  test("rejects a mismatched total or core", () => {
    handlePrizeBuybackBurned(burn(301));
    const event = burn();
    event.parameters[2] = new ethereum.EventParam("coreAddress", ethereum.Value.fromAddress(Address.fromString("0x5555555555555555555555555555555555555555")));
    handlePrizeBuybackBurned(event);
    assert.entityCount("PrizeBuybackBurn", 0);
  });
});
