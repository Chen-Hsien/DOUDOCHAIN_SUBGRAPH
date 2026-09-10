import {
  afterEach,
  assert,
  clearStore,
  dataSourceMock,
  describe,
  test,
} from "matchstick-as/assembly/index";
import {
  Address,
  BigInt,
  Bytes,
  DataSourceContext,
  dataSource,
} from "@graphprotocol/graph-ts";
import {
  NewSeries as NewSeriesEvent,
  NewSubPrize,
  NewTicketStatus as TicketEvent,
  UpdateSeriesInformation,
  UpdateTicketStatus,
} from "../generated/ICHICHAIN/ICHICHAIN";
import { NewTicketStatus } from "../generated/schema";
import {
  handleNewSeries,
  handleNewSubPrize,
  handleNewTicketStatus,
  handleUpdateSeriesInformation,
  handleUpdateTicketStatus,
  handleRevealTokenContent,
  revealTokenMetadataId,
} from "../src/ichichain";
import {
  createNewSeriesEvent,
  createNewSubPrizeEvent,
  createNewTicketStatusEvent,
  createUpdateSeriesInformationEvent,
  createUpdateTicketStatusEvent,
} from "./doudochain-utils";
import {
  OLD_CID,
  NEW_CID,
  OLD_4,
  NEW_4,
  OLD_7,
  NEW_7,
} from "./fixtures/series-72-reveal";

const SERIES = "72";
const OWNER = "0x00000000000000000000000000000000000000a1";
function id(prize: i32, cid: string): string {
  // Independent expected format, not the implementation helper.
  return Bytes.fromUTF8(
    "0x3732:" + prize.toString() + ":" + cid + "/" + prize.toString(),
  ).toHexString();
}
function seed(uri: string = "ipfs://" + OLD_CID + "/"): void {
  handleNewSeries(
    changetype<NewSeriesEvent>(
      createNewSeriesEvent(
        BigInt.fromI32(72),
        "吉伊卡哇 文具",
        BigInt.fromI32(80),
        BigInt.fromI32(80),
        BigInt.fromI32(140),
        BigInt.fromI32(140),
        true,
        BigInt.zero(),
        BigInt.zero(),
        "",
        "",
        uri,
        "",
        Address.zero(),
        false,
        false,
      ),
    ),
  );
}
function prize(n: i32): void {
  handleNewSubPrize(
    changetype<NewSubPrize>(
      createNewSubPrizeEvent(
        BigInt.fromI32(72),
        BigInt.fromI32(n),
        "D",
        "prize",
        BigInt.fromI32(10),
      ),
    ),
  );
}
function mint(token: i32, n: i32): void {
  let e = changetype<TicketEvent>(
    createNewTicketStatusEvent(
      BigInt.fromI32(token),
      BigInt.fromI32(72),
      BigInt.fromI32(n),
      false,
      n > 0,
      Address.fromString(OWNER),
      7,
    ),
  );
  e.block.timestamp = BigInt.fromI32(1788974470);
  handleNewTicketStatus(e);
}
function replace(uri: string): void {
  let e = changetype<UpdateSeriesInformation>(
    createUpdateSeriesInformationEvent(
      BigInt.fromI32(72),
      true,
      BigInt.zero(),
      BigInt.zero(),
      "",
      "",
      uri,
      "",
    ),
  );
  e.block.number = BigInt.fromI32(499533390);
  handleUpdateSeriesInformation(e);
}
function content(cid: string, n: i32, body: string): string {
  let ctx = new DataSourceContext();
  ctx.setBytes("seriesID", Bytes.fromUTF8(SERIES));
  ctx.setBigInt("subPrizeID", BigInt.fromI32(n));
  // Matchstick exposes the mocked address through stringParam for file handlers.
  dataSourceMock.setAddressAndContext(cid + "/" + n.toString(), ctx);
  assert.stringEquals(dataSource.stringParam(), cid + "/" + n.toString());
  handleRevealTokenContent(Bytes.fromUTF8(body));
  return id(n, cid);
}

describe("Reveal metadata replacement", () => {
  afterEach(() => {
    clearStore();
    dataSourceMock.resetValues();
  });

  test("production old/new prize 4 and 7 payloads coexist without legacy ID collisions", () => {
    content(OLD_CID, 4, OLD_4);
    content(OLD_CID, 7, OLD_7);
    let current = content(NEW_CID, 4, NEW_4);
    content(NEW_CID, 7, NEW_7);
    assert.entityCount("RevealTokenMetadata", 4);
    assert.fieldEquals(
      "RevealTokenMetadata",
      id(4, OLD_CID),
      "name",
      "吉伊卡哇 木頭鉛筆 2B 黃",
    );
    assert.fieldEquals(
      "RevealTokenMetadata",
      current,
      "name",
      "吉伊卡哇 木頭鉛筆 2B 藍",
    );
    assert.fieldEquals(
      "RevealTokenMetadata",
      current,
      "description",
      "吉伊卡哇 木頭鉛筆 2B 藍",
    );
    assert.fieldEquals(
      "RevealTokenMetadata",
      current,
      "image",
      "https://lime-basic-thrush-351.mypinata.cloud/ipfs/bafybeidybqwcrb5j5qudezjlisogdypuvmcw6ubnvfpftnz37xaaankvqi/prizeNFTimage/4.jpg",
    );
    assert.fieldEquals(
      "RevealTokenMetadata",
      current,
      "animationUrl",
      "https://lime-basic-thrush-351.mypinata.cloud/ipfs/bafybeidybqwcrb5j5qudezjlisogdypuvmcw6ubnvfpftnz37xaaankvqi/prizeNFTanimation/4.mp4",
    );
    assert.fieldEquals("RevealTokenMetadata", current, "series", "0x3732");
    assert.fieldEquals("RevealTokenMetadata", current, "subPrizeID", "4");
    assert.fieldEquals("RevealTokenMetadata", current, "prizeType", "D");
    assert.fieldEquals("RevealTokenMetadata", current, "category", "other");
    assert.fieldEquals(
      "RevealTokenMetadata",
      current,
      "ipfsPath",
      NEW_CID + "/4",
    );
    assert.notInStore("RevealTokenMetadata", "0x37325f7375625072697a655f34");
    assert.notInStore("RevealTokenMetadata", "0x37325f7375625072697a655f37");
  });

  test("operator replacement relinks existing tickets; late old file cannot undo correction", () => {
    seed();
    prize(4);
    prize(7);
    mint(7201, 4);
    mint(7202, 0);
    replace("https://gateway.pinata.cloud/ipfs/" + NEW_CID + "/");
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323031",
      "revealMetadata",
      id(4, NEW_CID),
    );
    content(NEW_CID, 4, NEW_4);
    content(OLD_CID, 4, OLD_4);
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323031",
      "revealMetadata",
      id(4, NEW_CID),
    );
    assert.fieldEquals("NewTicketStatus", "0x37323031", "tokenOwner", OWNER);
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323031",
      "tokenRevealed",
      "true",
    );
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323031",
      "tokenRevealTimestamp",
      "1788974470",
    );
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323031",
      "tokenExchange",
      "false",
    );
    assert.assertTrue(
      NewTicketStatus.load(Bytes.fromUTF8("7202"))!.revealMetadata === null,
    );
    assert.entityCount("RevealTokenMetadataSource", 4);
  });

  test("repeated mint/reveal and gateway aliases register each IPFS version once", () => {
    seed();
    prize(4);
    mint(7201, 4);
    mint(7203, 4);
    handleUpdateTicketStatus(
      changetype<UpdateTicketStatus>(
        createUpdateTicketStatusEvent(
          BigInt.fromI32(7201),
          BigInt.fromI32(72),
          BigInt.fromI32(4),
          false,
          true,
        ),
      ),
    );
    replace("https://another.gateway/ipfs/" + OLD_CID + "///");
    assert.entityCount("RevealTokenMetadataSource", 1);
    replace("ipfs://" + NEW_CID);
    assert.entityCount("RevealTokenMetadataSource", 2);
    replace("ipfs://" + OLD_CID);
    assert.entityCount("RevealTokenMetadataSource", 2);
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323031",
      "revealMetadata",
      id(4, OLD_CID),
    );
  });

  test("LAST PRIZE 999 uses its own versioned path even without a NewSubPrize event", () => {
    seed();
    mint(7299, 999);
    assert.fieldEquals(
      "RevealTokenMetadataSource",
      id(999, OLD_CID),
      "ipfsPath",
      OLD_CID + "/999",
    );
    replace("ipfs://" + NEW_CID);
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323939",
      "revealMetadata",
      id(999, NEW_CID),
    );
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323939",
      "tokenSource",
      "LAST_PRIZE",
    );
  });

  test("missing/unsupported URI never links a nonexistent file; later correction repairs it", () => {
    seed("");
    mint(7201, 4);
    assert.entityCount("RevealTokenMetadataSource", 0);
    assert.assertTrue(
      NewTicketStatus.load(Bytes.fromUTF8("7201"))!.revealMetadata === null,
    );
    replace("https://example.com/metadata");
    assert.entityCount("RevealTokenMetadataSource", 0);
    replace("ipfs://" + NEW_CID);
    assert.fieldEquals(
      "NewTicketStatus",
      "0x37323031",
      "revealMetadata",
      id(4, NEW_CID),
    );
  });

  test("ID separates series, prize and full file path", () => {
    assert.booleanEquals(
      revealTokenMetadataId(
        Bytes.fromUTF8("72"),
        BigInt.fromI32(4),
        OLD_CID + "/4",
      ).equals(
        revealTokenMetadataId(
          Bytes.fromUTF8("73"),
          BigInt.fromI32(4),
          OLD_CID + "/4",
        ),
      ),
      false,
    );
    assert.booleanEquals(
      revealTokenMetadataId(
        Bytes.fromUTF8("72"),
        BigInt.fromI32(4),
        OLD_CID + "/4",
      ).equals(
        revealTokenMetadataId(
          Bytes.fromUTF8("72"),
          BigInt.fromI32(7),
          OLD_CID + "/7",
        ),
      ),
      false,
    );
  });
});
