#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PAGE_SIZE = 1000;
const MAX_PAGES = 10000;
const EMPTY_BYTES_CURSOR = "0x00";
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const fullDocument = fs.readFileSync(
  path.join(scriptDirectory, "queries.graphql"),
  "utf8"
);
const projectionStart = fullDocument.indexOf("query ParityProjectionFirst");
if (projectionStart < 0) {
  throw new Error("ParityProjectionFirst is missing from queries.graphql");
}
const baseDocument = fullDocument.slice(0, projectionStart);
const projectionDocument = fullDocument.slice(projectionStart);

const oldEndpoint = endpointFromEnv("OLD_GRAPH_URL", "OLD_GRAPH_AUTH_TOKEN");
const newEndpoint = endpointFromEnv("NEW_GRAPH_URL", "NEW_GRAPH_AUTH_TOKEN");
const checks = [];
const operationCache = new Map();

function endpointFromEnv(urlKey, tokenKey) {
  const url = process.env[urlKey]?.trim();
  if (!url) throw new Error(`${urlKey} is required`);
  return { url, token: process.env[tokenKey]?.trim() || undefined };
}

function nonNegativeInteger(value, name, fallback) {
  if (value === undefined || value === "") return fallback;
  if (!/^\d+$/.test(value)) throw new Error(`${name} must be an integer`);
  return Number(value);
}

function graphInteger(value, name) {
  const normalized = String(value ?? "");
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Invalid Graph integer for ${name}`);
  }
  return BigInt(normalized);
}

function normalizeHex(value) {
  return typeof value === "string" && value.startsWith("0x")
    ? value.toLowerCase()
    : value;
}

function normalizeValue(value) {
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalizeValue(value[key])])
    );
  }
  return normalizeHex(value);
}

function addCheck(name, passed, details = undefined) {
  checks.push({ name, passed, ...(details === undefined ? {} : { details }) });
}

function operationDocument(document, operationName) {
  const cacheKey = `${operationName}:${document.length}`;
  const cached = operationCache.get(cacheKey);
  if (cached) return cached;

  const marker = new RegExp(`\\bquery\\s+${operationName}\\b`);
  const match = marker.exec(document);
  if (!match) throw new Error(`${operationName} is missing from query document`);
  const start = match.index;
  const bodyStart = document.indexOf("{", start);
  if (bodyStart < 0) throw new Error(`${operationName} has no query body`);

  let depth = 0;
  for (let index = bodyStart; index < document.length; index += 1) {
    if (document[index] === "{") depth += 1;
    if (document[index] === "}") depth -= 1;
    if (depth === 0) {
      const operation = document.slice(start, index + 1);
      operationCache.set(cacheKey, operation);
      return operation;
    }
  }
  throw new Error(`${operationName} has an unterminated query body`);
}

async function graphRequest(
  endpoint,
  document,
  operationName,
  variables = {}
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);
  timeout.unref?.();
  const headers = { "content-type": "application/json" };
  if (endpoint.token) headers.authorization = `Bearer ${endpoint.token}`;

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        query: operationDocument(document, operationName),
        variables,
      }),
      signal: controller.signal,
    });
    const rawBody = await response.text();
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new Error(`${operationName} returned invalid JSON (${response.status})`);
    }
    if (!response.ok || body.errors?.length) {
      const messages = (body.errors ?? [])
        .map((error) => error?.message)
        .filter(Boolean)
        .join("; ");
      throw new Error(
        `${operationName} failed (${response.status})${messages ? `: ${messages}` : ""}`
      );
    }
    return body.data ?? {};
  } finally {
    clearTimeout(timeout);
  }
}

function metaFromResponse(data, label) {
  const meta = data?._meta;
  if (!meta?.block?.hash || meta.block.number === undefined) {
    throw new Error(`${label} did not return _meta.block`);
  }
  if (meta.hasIndexingErrors === true) {
    throw new Error(`${label} reports indexing errors`);
  }
  return {
    number: Number(meta.block.number),
    hash: String(meta.block.hash).toLowerCase(),
  };
}

async function fetchMeta(endpoint, label) {
  const data = await graphRequest(endpoint, baseDocument, "ParityMeta");
  return metaFromResponse(data, label);
}

async function fetchBlock(endpoint, block, label) {
  const data = await graphRequest(endpoint, baseDocument, "ParityBlock", {
    block,
  });
  return metaFromResponse(data, label);
}

function lastCursor(page, alias) {
  const cursor = page.at(-1)?.id;
  if (typeof cursor !== "string" || cursor.length === 0) {
    throw new Error(`${alias} returned a full page without an id cursor`);
  }
  return cursor;
}

async function fetchCombinedPages({
  endpoint,
  document,
  firstOperation,
  nextOperation,
  block,
  collections,
}) {
  const firstData = await graphRequest(endpoint, document, firstOperation, {
    block,
    first: PAGE_SIZE,
  });
  const output = {};
  const state = {};

  for (const collection of collections) {
    const page = firstData[collection.alias] ?? [];
    if (!Array.isArray(page)) {
      throw new Error(`${firstOperation}.${collection.alias} is not an array`);
    }
    output[collection.alias] = [...page];
    state[collection.alias] = {
      active: page.length === PAGE_SIZE,
      cursor: page.length > 0 ? lastCursor(page, collection.alias) : null,
    };
  }

  for (let pageNumber = 1; ; pageNumber += 1) {
    const activeCollections = collections.filter(
      (collection) => state[collection.alias].active
    );
    if (activeCollections.length === 0) break;
    if (pageNumber > MAX_PAGES) {
      throw new Error(`${nextOperation} exceeded ${MAX_PAGES} pages`);
    }

    const variables = { block, first: PAGE_SIZE };
    for (const collection of collections) {
      const current = state[collection.alias];
      variables[collection.cursorVariable] =
        current.cursor ?? EMPTY_BYTES_CURSOR;
      variables[collection.includeVariable] = current.active;
    }

    const data = await graphRequest(
      endpoint,
      document,
      nextOperation,
      variables
    );
    for (const collection of activeCollections) {
      const page = data[collection.alias] ?? [];
      if (!Array.isArray(page)) {
        throw new Error(`${nextOperation}.${collection.alias} is not an array`);
      }
      const previousCursor = state[collection.alias].cursor;
      output[collection.alias].push(...page);
      state[collection.alias].active = page.length === PAGE_SIZE;
      if (page.length > 0) {
        const nextCursor = lastCursor(page, collection.alias);
        if (nextCursor === previousCursor) {
          throw new Error(`${collection.alias} cursor did not advance`);
        }
        state[collection.alias].cursor = nextCursor;
      }
    }
  }

  return output;
}

const baseCollections = [
  {
    alias: "series",
    cursorVariable: "seriesCursor",
    includeVariable: "includeSeries",
  },
  {
    alias: "unrevealedTickets",
    cursorVariable: "ticketCursor",
    includeVariable: "includeTickets",
  },
  {
    alias: "fulfilled",
    cursorVariable: "fulfilledCursor",
    includeVariable: "includeFulfilled",
  },
  {
    alias: "sentWithSeries",
    cursorVariable: "sentCursor",
    includeVariable: "includeSent",
  },
];

const projectionCollections = [
  {
    alias: "runtimeStates",
    cursorVariable: "runtimeCursor",
    includeVariable: "includeRuntime",
  },
  {
    alias: "revealSummaries",
    cursorVariable: "summaryCursor",
    includeVariable: "includeSummaries",
  },
  {
    alias: "revealTokens",
    cursorVariable: "tokenCursor",
    includeVariable: "includeTokens",
  },
];

function mapById(items, label) {
  const result = new Map();
  for (const item of items) {
    if (!item?.id) throw new Error(`${label} item is missing id`);
    if (result.has(item.id)) throw new Error(`${label} has duplicate id ${item.id}`);
    result.set(item.id, item);
  }
  return result;
}

function compareEntityCollections(name, oldItems, newItems) {
  const oldMap = mapById(oldItems, `old ${name}`);
  const newMap = mapById(newItems, `new ${name}`);
  const missing = [...oldMap.keys()].filter((id) => !newMap.has(id));
  const extra = [...newMap.keys()].filter((id) => !oldMap.has(id));
  const changed = [...oldMap.keys()].filter((id) => {
    if (!newMap.has(id)) return false;
    return (
      JSON.stringify(normalizeValue(oldMap.get(id))) !==
      JSON.stringify(normalizeValue(newMap.get(id)))
    );
  });
  addCheck(
    `base.${name}.old_equals_new`,
    missing.length === 0 && extra.length === 0 && changed.length === 0,
    {
      oldCount: oldItems.length,
      newCount: newItems.length,
      missing: missing.slice(0, 10),
      extra: extra.slice(0, 10),
      changed: changed.slice(0, 10),
    }
  );
}

function groupCountBySeries(items) {
  const counts = new Map();
  for (const item of items) {
    const seriesID = String(item.seriesID ?? "");
    counts.set(seriesID, (counts.get(seriesID) ?? 0n) + 1n);
  }
  return counts;
}

function sumGraphField(items, field) {
  return items.reduce(
    (sum, item) => sum + graphInteger(item[field], field),
    0n
  );
}

function duplicateFieldValues(items, field) {
  const seen = new Set();
  const duplicates = new Set();
  for (const item of items) {
    const value = String(item[field] ?? "");
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

const oldMeta = await fetchMeta(oldEndpoint, "old endpoint");
const newMeta = await fetchMeta(newEndpoint, "new endpoint");
const explicitBlock = nonNegativeInteger(
  process.env.PARITY_BLOCK_NUMBER,
  "PARITY_BLOCK_NUMBER",
  undefined
);
const finalityBlocks = nonNegativeInteger(
  process.env.PARITY_FINALITY_BLOCKS,
  "PARITY_FINALITY_BLOCKS",
  64
);
const commonLatestBlock = Math.min(oldMeta.number, newMeta.number);
const comparisonBlockNumber =
  explicitBlock ?? commonLatestBlock - finalityBlocks;
if (
  !Number.isSafeInteger(comparisonBlockNumber) ||
  comparisonBlockNumber < 0 ||
  comparisonBlockNumber > commonLatestBlock
) {
  throw new Error("Comparison block is outside the common indexed range");
}

const oldMetaIsComparisonBlock = oldMeta.number === comparisonBlockNumber;
const newMetaIsComparisonBlock = newMeta.number === comparisonBlockNumber;
let oldBlock;
let newBlock;
if (oldMetaIsComparisonBlock || newMetaIsComparisonBlock) {
  const anchorBlock = newMetaIsComparisonBlock ? newMeta : oldMeta;
  [oldBlock, newBlock] = await Promise.all([
    oldMetaIsComparisonBlock
      ? Promise.resolve(oldMeta)
      : fetchBlock(
          oldEndpoint,
          { hash: anchorBlock.hash },
          "old comparison block"
        ),
    newMetaIsComparisonBlock
      ? Promise.resolve(newMeta)
      : fetchBlock(
          newEndpoint,
          { hash: anchorBlock.hash },
          "new comparison block"
        ),
  ]);
} else {
  [oldBlock, newBlock] = await Promise.all([
    fetchBlock(
      oldEndpoint,
      { number: comparisonBlockNumber },
      "old comparison block"
    ),
    fetchBlock(
      newEndpoint,
      { number: comparisonBlockNumber },
      "new comparison block"
    ),
  ]);
}
addCheck("block.number_matches", oldBlock.number === newBlock.number, {
  old: oldBlock.number,
  new: newBlock.number,
});
addCheck("block.hash_matches", oldBlock.hash === newBlock.hash, {
  old: oldBlock.hash,
  new: newBlock.hash,
});
if (oldBlock.hash !== newBlock.hash) {
  throw new Error("Old and new endpoints returned different block hashes");
}
const pinnedBlock = { hash: oldBlock.hash };

const [oldBase, newBase, projections] = await Promise.all([
  fetchCombinedPages({
    endpoint: oldEndpoint,
    document: baseDocument,
    firstOperation: "ParityBaseFirst",
    nextOperation: "ParityBaseNext",
    block: pinnedBlock,
    collections: baseCollections,
  }),
  fetchCombinedPages({
    endpoint: newEndpoint,
    document: baseDocument,
    firstOperation: "ParityBaseFirst",
    nextOperation: "ParityBaseNext",
    block: pinnedBlock,
    collections: baseCollections,
  }),
  fetchCombinedPages({
    endpoint: newEndpoint,
    document: projectionDocument,
    firstOperation: "ParityProjectionFirst",
    nextOperation: "ParityProjectionNext",
    block: pinnedBlock,
    collections: projectionCollections,
  }),
]);

for (const alias of [
  "series",
  "unrevealedTickets",
  "fulfilled",
  "sentWithSeries",
]) {
  compareEntityCollections(alias, oldBase[alias], newBase[alias]);
}

const seriesIDs = new Set(oldBase.series.map((item) => String(item.seriesID)));
const duplicateSeriesIDs = duplicateFieldValues(oldBase.series, "seriesID");
const duplicateRuntimeSeriesIDs = duplicateFieldValues(
  projections.runtimeStates,
  "seriesID"
);
addCheck(
  "series and runtime seriesID values are unique",
  duplicateSeriesIDs.length === 0 && duplicateRuntimeSeriesIDs.length === 0,
  {
    duplicateSeriesIDs: duplicateSeriesIDs.slice(0, 10),
    duplicateRuntimeSeriesIDs: duplicateRuntimeSeriesIDs.slice(0, 10),
  }
);
const runtimeBySeries = new Map(
  projections.runtimeStates.map((item) => [String(item.seriesID), item])
);
const missingRuntime = [...seriesIDs].filter((id) => !runtimeBySeries.has(id));
const extraRuntime = [...runtimeBySeries.keys()].filter(
  (id) => !seriesIDs.has(id)
);
addCheck(
  "count(SeriesRuntimeState) == count(NewSeries)",
  missingRuntime.length === 0 &&
    extraRuntime.length === 0 &&
    runtimeBySeries.size === seriesIDs.size &&
    projections.runtimeStates.length === oldBase.series.length,
  {
    seriesCount: oldBase.series.length,
    runtimeCount: projections.runtimeStates.length,
    missingRuntime: missingRuntime.slice(0, 10),
    extraRuntime: extraRuntime.slice(0, 10),
  }
);

const unrevealedBySeries = groupCountBySeries(oldBase.unrevealedTickets);
const runtimeMismatches = [...seriesIDs]
  .map((seriesID) => ({
    seriesID,
    expected: unrevealedBySeries.get(seriesID) ?? 0n,
    actual: runtimeBySeries.has(seriesID)
      ? graphInteger(
          runtimeBySeries.get(seriesID).unrevealedCount,
          "unrevealedCount"
        )
      : -1n,
  }))
  .filter((item) => item.expected !== item.actual)
  .map((item) => ({
    seriesID: item.seriesID,
    expected: item.expected.toString(),
    actual: item.actual.toString(),
  }));
const runtimeUnrevealedTotal = sumGraphField(
  projections.runtimeStates,
  "unrevealedCount"
);
addCheck(
  "sum(runtime.unrevealedCount) == count(unrevealed tickets)",
  runtimeUnrevealedTotal === BigInt(oldBase.unrevealedTickets.length) &&
    runtimeMismatches.length === 0,
  {
    expectedTotal: String(oldBase.unrevealedTickets.length),
    actualTotal: runtimeUnrevealedTotal.toString(),
    perSeriesMismatches: runtimeMismatches.slice(0, 10),
  }
);

const duplicateFulfilledRequestIds = duplicateFieldValues(
  oldBase.fulfilled,
  "requestId"
);
const duplicateSentRequestIds = duplicateFieldValues(
  oldBase.sentWithSeries,
  "requestId"
);
addCheck(
  "reveal request ids are unique",
  duplicateFulfilledRequestIds.length === 0 &&
    duplicateSentRequestIds.length === 0,
  {
    duplicateFulfilledRequestIds: duplicateFulfilledRequestIds.slice(0, 10),
    duplicateSentRequestIds: duplicateSentRequestIds.slice(0, 10),
  }
);

const fulfilledByRequest = new Map(
  oldBase.fulfilled.map((item) => [String(item.requestId), item])
);
const sentByRequest = new Map(
  oldBase.sentWithSeries.map((item) => [String(item.requestId), item])
);
const fulfilledWithoutSent = [...fulfilledByRequest.keys()].filter(
  (requestId) => !sentByRequest.has(requestId)
);
const sentWithoutFulfilled = [...sentByRequest.keys()].filter(
  (requestId) => !fulfilledByRequest.has(requestId)
);
addCheck(
  "fulfilled request ids == sent-with-series request ids",
  fulfilledWithoutSent.length === 0 && sentWithoutFulfilled.length === 0,
  {
    fulfilledWithoutSent: fulfilledWithoutSent.slice(0, 10),
    sentWithoutFulfilled: sentWithoutFulfilled.slice(0, 10),
  }
);

const expectedSummaryBySeries = new Map();
for (const sent of oldBase.sentWithSeries) {
  if (!fulfilledByRequest.has(String(sent.requestId))) continue;
  const seriesID = String(sent.seriesID);
  const timestamp = graphInteger(sent.blockTimestamp, "blockTimestamp");
  const transactionHash = String(sent.transactionHash).toLowerCase();
  const current = expectedSummaryBySeries.get(seriesID) ?? {
    proofCount: 0n,
    tokenCount: 0n,
    latestBlockTimestamp: -1n,
    latestTransactionHashes: new Set(),
  };
  current.proofCount += 1n;
  current.tokenCount += graphInteger(sent.revealTokenCount, "revealTokenCount");
  if (timestamp > current.latestBlockTimestamp) {
    current.latestBlockTimestamp = timestamp;
    current.latestTransactionHashes = new Set([transactionHash]);
  } else if (timestamp === current.latestBlockTimestamp) {
    current.latestTransactionHashes.add(transactionHash);
  }
  expectedSummaryBySeries.set(seriesID, current);
}

const summaryBySeries = new Map(
  projections.revealSummaries.map((item) => [String(item.seriesID), item])
);
const duplicateSummarySeriesIDs = duplicateFieldValues(
  projections.revealSummaries,
  "seriesID"
);
const summaryMismatches = [];
for (const [seriesID, expected] of expectedSummaryBySeries) {
  const actual = summaryBySeries.get(seriesID);
  if (!actual) {
    summaryMismatches.push({ seriesID, reason: "missing summary" });
    continue;
  }
  const actualProofCount = graphInteger(actual.proofCount, "proofCount");
  const actualTokenCount = graphInteger(actual.tokenCount, "tokenCount");
  const actualTimestamp = graphInteger(
    actual.latestBlockTimestamp,
    "latestBlockTimestamp"
  );
  const actualHash = String(actual.latestTransactionHash).toLowerCase();
  if (
    actualProofCount !== expected.proofCount ||
    actualTokenCount !== expected.tokenCount ||
    actualTimestamp !== expected.latestBlockTimestamp ||
    !expected.latestTransactionHashes.has(actualHash)
  ) {
    summaryMismatches.push({
      seriesID,
      expected: {
        proofCount: expected.proofCount.toString(),
        tokenCount: expected.tokenCount.toString(),
        latestBlockTimestamp: expected.latestBlockTimestamp.toString(),
        latestTransactionHashes: [...expected.latestTransactionHashes],
      },
      actual: {
        proofCount: actualProofCount.toString(),
        tokenCount: actualTokenCount.toString(),
        latestBlockTimestamp: actualTimestamp.toString(),
        latestTransactionHash: actualHash,
      },
    });
  }
}
const extraSummaries = [...summaryBySeries.keys()].filter(
  (seriesID) => !expectedSummaryBySeries.has(seriesID)
);
addCheck(
  "count(SeriesRevealSummary) == distinct fulfilled series count",
  summaryBySeries.size === expectedSummaryBySeries.size &&
    summaryMismatches.length === 0 &&
    extraSummaries.length === 0 &&
    duplicateSummarySeriesIDs.length === 0,
  {
    expectedCount: expectedSummaryBySeries.size,
    actualCount: summaryBySeries.size,
    mismatches: summaryMismatches.slice(0, 10),
    extraSummaries: extraSummaries.slice(0, 10),
    duplicateSummarySeriesIDs: duplicateSummarySeriesIDs.slice(0, 10),
  }
);

const expectedProofCount = BigInt(oldBase.sentWithSeries.length);
const actualProofCount = sumGraphField(
  projections.revealSummaries,
  "proofCount"
);
addCheck(
  "sum(summary.proofCount) == valid proof count",
  actualProofCount === expectedProofCount,
  {
    expected: expectedProofCount.toString(),
    actual: actualProofCount.toString(),
  }
);

const expectedTokenCount = sumGraphField(
  oldBase.sentWithSeries,
  "revealTokenCount"
);
const actualTokenCount = sumGraphField(
  projections.revealSummaries,
  "tokenCount"
);
addCheck(
  "sum(summary.tokenCount) == sum(sent.revealTokenCount)",
  actualTokenCount === expectedTokenCount,
  {
    expected: expectedTokenCount.toString(),
    actual: actualTokenCount.toString(),
  }
);

const revealTokenRelationMismatches = projections.revealTokens
  .filter(
    (token) =>
      String(token.seriesID) !== String(token.summary?.seriesID) ||
      String(token.tokenID) !== String(token.ticket?.tokenID)
  )
  .map((token) => token.id);
addCheck(
  "count(SeriesRevealToken) == token occurrence count",
  BigInt(projections.revealTokens.length) === expectedTokenCount &&
    revealTokenRelationMismatches.length === 0,
  {
    expected: expectedTokenCount.toString(),
    actual: String(projections.revealTokens.length),
    relationMismatches: revealTokenRelationMismatches.slice(0, 10),
  }
);

const passed = checks.every((check) => check.passed);
const report = {
  status: passed ? "PASS" : "FAIL",
  comparisonBlock: {
    number: comparisonBlockNumber,
    hash: oldBlock.hash,
    oldLatestIndexedBlock: oldMeta.number,
    newLatestIndexedBlock: newMeta.number,
  },
  counts: {
    series: oldBase.series.length,
    unrevealedTickets: oldBase.unrevealedTickets.length,
    fulfilled: oldBase.fulfilled.length,
    sentWithSeries: oldBase.sentWithSeries.length,
    runtimeStates: projections.runtimeStates.length,
    revealSummaries: projections.revealSummaries.length,
    revealTokens: projections.revealTokens.length,
  },
  checks,
};

console.log(JSON.stringify(report, null, 2));
if (!passed) process.exitCode = 1;
