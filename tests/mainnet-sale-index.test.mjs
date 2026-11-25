import assert from "node:assert/strict";
import { test } from "node:test";
import { Interface } from "@ethersproject/abi";
import { readFileSync } from "node:fs";
import { verifySaleIndex } from "../scripts/verify-mainnet-sale-index.mjs";

const addresses = JSON.parse(
  readFileSync(new URL("../networks.json", import.meta.url)),
)["arbitrum-one"];
const fixed = JSON.parse(
  readFileSync(
    new URL(
      "../config/fixed-probability-buyback-deployments.json",
      import.meta.url,
    ),
  ),
)
  .find((row) => row.chainId === 42161)
  .address.toLowerCase();
const abi = new Interface([
  "event SeriesSaleScheduleChanged(uint256 indexed seriesId,uint64 revision,uint64 expectedDelistAt,bool inactive)",
  "function saleSchedules(uint256) view returns (uint64,uint64,bool)",
]);
const coreTx = "0x" + "1".repeat(64);
const fixedTx = "0x" + "2".repeat(64);
const cid = "Qm" + "B".repeat(44);
const blockHash = "0x" + "3".repeat(64);
function inputs({
  returnedCid = cid,
  deadline = "90",
  receiptBlock = "0x5",
  empty = false,
} = {}) {
  const block = { number: "0x5", hash: blockHash };
  return {
    cid,
    coreTx,
    fixedTx,
    rpc: async (method, params) => {
      if (method === "eth_chainId") return "0xa4b1";
      if (method === "eth_getBlockByNumber") return block;
      if (method === "eth_getTransactionReceipt") {
        const isCore = params[0] === coreTx;
        return {
          status: "0x1",
          transactionHash: params[0],
          blockNumber: receiptBlock,
          blockHash,
          logs: [
            {
              address: isCore ? addresses.DoudoSeriesOpsModule.address : fixed,
              ...abi.encodeEventLog(abi.getEvent("SeriesSaleScheduleChanged"), [
                7,
                2,
                isCore ? 0 : 90,
                isCore,
              ]),
            },
          ],
        };
      }
      assert.equal(method, "eth_call");
      assert.deepEqual(params[1], { blockHash, requireCanonical: true });
      const isCore =
        params[0].to === addresses.DoudoSeriesOpsModule.address.toLowerCase();
      return abi.encodeFunctionResult("saleSchedules", [
        2,
        isCore ? 0 : 90,
        isCore,
      ]);
    },
    graph: async (query, variables) => {
      const _meta = {
        deployment: returnedCid,
        hasIndexingErrors: false,
        block: { number: 5, hash: blockHash },
      };
      assert.equal(variables.at.hash, blockHash);
      if (query.includes("SaleReadiness")) {
        assert.match(query, /latestRevealAt latestRevealSortKey/);
        return {
          data: {
            _meta,
            core: empty ? [] : [{ seriesID: "7" }],
            fixed: [{ seriesId: "7" }],
          },
        };
      }
      const isCore = query.includes("newSeries_collection");
      assert.equal(
        variables.id,
        isCore ? "0x37" : "42161:" + fixed + ":series:" + "7".padStart(78, "0"),
      );
      return {
        data: {
          _meta,
          rows: [
            {
              seriesID: "7",
              seriesContract: addresses.ICHICHAIN.address,
              seriesId: "7",
              saleScheduleRevision: "2",
              saleInactive: isCore,
              expectedDelistAt: isCore ? null : deadline,
            },
          ],
        },
      };
    },
  };
}

test("validates both gameplay events against canonical end-of-block state, including cleared deadline", async () => {
  const report = await verifySaleIndex(inputs());
  assert.deepEqual(
    report.evidence.map((row) => row.deadline),
    [null, "90"],
  );
  assert.equal(report.verified, "schema-block-and-schedule-events");
});
test("checks schema before there are mainnet schedule receipts and labels the result", async () => {
  const opts = inputs();
  const result = await verifySaleIndex({
    ...opts,
    coreTx: undefined,
    fixedTx: undefined,
  });
  assert.equal(result.verified, "schema-and-block");
  assert.equal(result.evidence, undefined);
});
test("rejects an old gateway, missing series, wrong projected deadline, an unfinalized receipt, and a partial pair", async () => {
  await assert.rejects(
    verifySaleIndex(inputs({ returnedCid: "Qm" + "C".repeat(44) })),
    /expected schema/,
  );
  await assert.rejects(
    verifySaleIndex(inputs({ empty: true })),
    /expected schema/,
  );
  await assert.rejects(verifySaleIndex(inputs({ deadline: "100" })), /differs/);
  await assert.rejects(
    verifySaleIndex(inputs({ receiptBlock: "0x7" })),
    /not yet finalized/,
  );
  await assert.rejects(
    verifySaleIndex({ ...inputs(), fixedTx: undefined }),
    /Supply/,
  );
});
