import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { Interface } from "@ethersproject/abi";

const config = JSON.parse(
  readFileSync(new URL("../networks.json", import.meta.url)),
);
const fixedDeployments = JSON.parse(
  readFileSync(
    new URL(
      "../config/fixed-probability-buyback-deployments.json",
      import.meta.url,
    ),
  ),
);
const core = config["arbitrum-one"].ICHICHAIN.address.toLowerCase();
const ops = config["arbitrum-one"].DoudoSeriesOpsModule.address.toLowerCase();
const fixed = fixedDeployments
  .find((row) => row.chainId === 42161)
  .address.toLowerCase();
const schedule = new Interface([
  "event SeriesSaleScheduleChanged(uint256 indexed seriesId,uint64 revision,uint64 expectedDelistAt,bool inactive)",
  "function saleSchedules(uint256) view returns (uint64 revision,uint64 expectedDelistAt,bool inactive)",
]);
const fields = "expectedDelistAt saleScheduleRevision saleInactive";
const hash = /^0x[a-f0-9]{64}$/i;
const meta =
  "_meta(block:$at){deployment hasIndexingErrors block{hash number}}";

async function post(url, body) {
  const result = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(15000),
  });
  if (!result.ok) throw Error("Endpoint returned HTTP " + result.status);
  return result.json();
}

export async function verifySaleIndex({ cid, coreTx, fixedTx, rpc, graph }) {
  if (
    !/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid) ||
    ((coreTx || fixedTx) && ![coreTx, fixedTx].every((tx) => hash.test(tx)))
  ) {
    throw Error(
      "Supply the expected CID alone or with one schedule receipt hash per gameplay",
    );
  }
  if (BigInt(await rpc("eth_chainId", [])) !== 42161n)
    throw Error("Arbitrum One required");
  const finalized = await rpc("eth_getBlockByNumber", ["finalized", false]);
  if (!hash.test(finalized?.hash))
    throw Error("Finalized RPC block unavailable");
  const readiness = await graph(
    `query SaleReadiness($at: Block_height!) {
    ${meta}
    core: newSeries_collection(first: 1, block: $at) { seriesID ${fields} }
    fixed: fixedProbabilitySeries_collection(first: 1, block: $at) {
      seriesId latestRevealAt latestRevealSortKey ${fields}
    }
  }`,
    { at: { hash: finalized.hash } },
  );
  const observed = readiness?.data?._meta;
  if (
    readiness?.errors?.length ||
    observed?.deployment !== cid ||
    observed.hasIndexingErrors !== false ||
    observed.block?.hash !== finalized.hash ||
    observed.block.number !== Number(BigInt(finalized.number)) ||
    readiness.data.core?.length !== 1 ||
    readiness.data.fixed?.length !== 1
  ) {
    throw Error(
      "Gateway did not serve the expected schema, deployment and both series at the finalized block",
    );
  }
  const report = {
    chainId: 42161,
    deployment: cid,
    finalizedBlock: observed.block,
  };
  if (!coreTx) return { ...report, verified: "schema-and-block" };
  const evidence = [];
  for (const [mode, emitter, txHash] of [
    ["core", ops, coreTx],
    ["fixed", fixed, fixedTx],
  ]) {
    const receipt = await rpc("eth_getTransactionReceipt", [txHash]);
    if (
      !receipt ||
      receipt.transactionHash.toLowerCase() !== txHash.toLowerCase() ||
      receipt.status !== "0x1" ||
      !hash.test(receipt.blockHash) ||
      BigInt(receipt.blockNumber) > BigInt(finalized.number)
    )
      throw Error(mode + " receipt missing, failed or not yet finalized");
    const canonical = await rpc("eth_getBlockByNumber", [
      receipt.blockNumber,
      false,
    ]);
    if (canonical?.hash !== receipt.blockHash)
      throw Error(mode + " receipt is not canonical");
    const logs = receipt.logs.filter(
      (l) =>
        l.address.toLowerCase() === emitter &&
        l.topics[0] === schedule.getEventTopic("SeriesSaleScheduleChanged") &&
        !l.removed,
    );
    if (!logs.length)
      throw Error(mode + " schedule event missing from receipt");
    for (const log of logs) {
      const { seriesId, revision } = schedule.parseLog(log).args;
      const number = seriesId.toString();
      const query =
        mode === "core"
          ? "query Sale($at:Block_height!,$id:Bytes!){" +
            meta +
            " rows:newSeries_collection(block:$at,where:{id:$id},first:1){seriesContract seriesID " +
            fields +
            "}}"
          : "query Sale($at:Block_height!,$id:ID!){" +
            meta +
            " rows:fixedProbabilitySeries_collection(block:$at,where:{id:$id},first:1){seriesId " +
            fields +
            "}}";
      const id =
        mode === "core"
          ? "0x" + Buffer.from(number).toString("hex")
          : "42161:" + fixed + ":series:" + number.padStart(78, "0");
      const result = await graph(query, {
        at: { hash: receipt.blockHash },
        id,
      });
      const m = result?.data?._meta;
      if (
        result?.errors?.length ||
        m?.deployment !== cid ||
        m.hasIndexingErrors !== false ||
        m.block?.hash !== receipt.blockHash ||
        m.block.number !== Number(BigInt(receipt.blockNumber))
      ) {
        throw Error(
          mode + " Gateway CID, block, schema or indexing health mismatch",
        );
      }
      const row = result.data.rows?.[0];
      const actual = schedule.decodeFunctionResult(
        "saleSchedules",
        await rpc("eth_call", [
          {
            to: emitter,
            data: schedule.encodeFunctionData("saleSchedules", [number]),
          },
          { blockHash: receipt.blockHash, requireCanonical: true },
        ]),
      );
      const deadline = actual.expectedDelistAt.isZero()
        ? null
        : actual.expectedDelistAt.toString();
      if (
        !row ||
        (mode === "core"
          ? row.seriesContract?.toLowerCase() !== core ||
            row.seriesID !== number
          : row.seriesId !== number) ||
        actual.revision.lt(revision) ||
        row.saleScheduleRevision !== actual.revision.toString() ||
        row.expectedDelistAt !== deadline ||
        row.saleInactive !== actual.inactive
      ) {
        throw Error(
          mode + " indexed schedule differs from canonical contract state",
        );
      }
      evidence.push({
        mode,
        seriesId: number,
        txHash,
        blockHash: receipt.blockHash,
        revision: row.saleScheduleRevision,
        deadline,
        inactive: row.saleInactive,
      });
    }
  }
  return { ...report, verified: "schema-block-and-schedule-events", evidence };
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  try {
    const [cid, coreTx, fixedTx] = process.argv.slice(2);
    const rpc = async (method, params) => {
      const reply = await post(process.env.ARBITRUM_ONE_RPC_URL, {
        jsonrpc: "2.0",
        id: 1,
        method,
        params,
      });
      if (reply.error) throw Error("RPC rejected " + method);
      return reply.result;
    };
    const graph = (query, variables) =>
      post(process.env.THEGRAPH_PROD_QUERY_URL, { query, variables });
    console.log(
      JSON.stringify(
        await verifySaleIndex({ cid, coreTx, fixedTx, rpc, graph }),
        null,
        2,
      ),
    );
  } catch (e) {
    // Provider/parser errors may contain URLs with API keys. Expose only our bounded failure messages.
    const message = String(e.message);
    console.error(
      /^(core |fixed |Supply |Gateway did not serve|Arbitrum One required$|Finalized RPC block unavailable$|RPC rejected eth_[a-zA-Z]+$|Endpoint returned HTTP \d{3}$)/.test(
        message,
      )
        ? message
        : "Sale index verification failed. Check RPC, Gateway and receipt inputs.",
    );
    process.exitCode = 1;
  }
}
