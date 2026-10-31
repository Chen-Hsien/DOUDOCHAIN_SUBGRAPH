import {
  assert,
  describe,
  test,
  clearStore,
  afterEach,
  newMockEvent,
} from "matchstick-as/assembly/index";
import { Address, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  NewListing,
  CancelledListing,
} from "../generated/templates/BuybackMarketplace/MarketplaceV3";
import {
  handleNewListing,
  handleCancelledListing,
} from "../src/buyback-marketplace";

const OWNER = Address.fromString("0x1111111111111111111111111111111111111111");
const NATIVE = Address.fromString("0x2222222222222222222222222222222222222222");
describe("native marketplace qualification evidence", () => {
  afterEach(() => {
    clearStore();
  });
  test("indexes an FP listing without a CORE ticket and removes it from active listings after cancellation", () => {
    const e = changetype<NewListing>(newMockEvent());
    const tuple = new ethereum.Tuple();
    for (let i = 0; i < 6; i++)
      tuple.push(
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(i === 0 ? 7 : 1)),
      );
    tuple.push(ethereum.Value.fromAddress(OWNER));
    tuple.push(ethereum.Value.fromAddress(NATIVE));
    tuple.push(ethereum.Value.fromAddress(Address.zero()));
    tuple.push(ethereum.Value.fromI32(0));
    tuple.push(ethereum.Value.fromI32(1));
    tuple.push(ethereum.Value.fromBoolean(false));
    e.parameters = [
      new ethereum.EventParam(
        "listingCreator",
        ethereum.Value.fromAddress(OWNER),
      ),
      new ethereum.EventParam(
        "listingId",
        ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(7)),
      ),
      new ethereum.EventParam(
        "assetContract",
        ethereum.Value.fromAddress(NATIVE),
      ),
      new ethereum.EventParam("listing", ethereum.Value.fromTuple(tuple)),
    ];
    handleNewListing(e);
    assert.fieldEquals("Listing", "7", "assetContract", NATIVE.toHexString());
    assert.fieldEquals("Listing", "7", "tokenId", "1");
    assert.fieldEquals("Listing", "7", "status", "CREATED");
    assert.entityCount("NewTicketStatus", 0);
    const cancelled = changetype<CancelledListing>(newMockEvent());
    cancelled.parameters = e.parameters.slice(0, 2);
    handleCancelledListing(cancelled);
    assert.fieldEquals("Listing", "7", "status", "CANCELLED");
  });
});
