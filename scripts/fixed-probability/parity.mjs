import { readFileSync } from 'node:fs';
import { Interface, defaultAbiCoder } from '@ethersproject/abi';
import { keccak256 } from '@ethersproject/keccak256';

export const deployment = JSON.parse(readFileSync(new URL('../../config/fixed-probability-deployment.json', import.meta.url)));
const abi = JSON.parse(readFileSync(new URL('../../abis/FixedProbabilityLottery.json', import.meta.url)));
export const iface = new Interface(abi.filter(x => x.type === 'function' || x.type === 'event'));
const configComponents = abi.find(x => x.name === 'getSeries').outputs[0].components[0].components;
export const configFields = configComponents.map(x => x.name);
const configTypes = configComponents.map(x => x.type);
const tag = text => keccak256(Buffer.from(text, 'utf8'));
const hash = (types, values) => keccak256(defaultAbiCoder.encode(types, values));
const integer = value => {
  const text = String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(text) || BigInt(text) >= (1n << 256n)) throw Error('INVALID_UINT');
  return text;
};
export const uintKey = value => integer(value).padStart(78, '0');
const dep = `${deployment.chainId}:${deployment.address.toLowerCase()}`;
export const entityId = (kind, id) => `${dep}:${kind}:${uintKey(id)}`;
const eventId = log => `${dep}:event:${log.transactionHash.toLowerCase()}:${uintKey(BigInt(log.logIndex))}`;
export function normalize(value) {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number' || typeof value === 'bigint' || value?._isBigNumber) return String(value);
  if (typeof value === 'string') return /^0x[0-9a-f]+$/i.test(value) ? value.toLowerCase() : value;
  if (Array.isArray(value)) return value.map(normalize);
  return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalize(value[k])]));
}
function same(actual, expected, code) {
  if (JSON.stringify(normalize(actual)) !== JSON.stringify(normalize(expected))) throw Error(code);
}
export function configHash(chainId, address, seriesId, c) {
  const prize = hash(['uint256[]', 'uint16[]'], [c.prizeIds, c.weights]);
  const promotion = hash(['uint16[]', 'uint256[]', 'uint8', 'uint256', 'uint256[]'], [c.discountQuantities, c.discountPoints, c.freeOrderMode, c.freeOrderFirstDraws, c.freeOrderPrizeIds]);
  const gate = hash(['uint8', 'uint8', 'bytes32', 'bytes32', 'uint256'], [c.gateMode, c.minMemberLevel, c.eligibilityPolicyId, c.eligibilityScope, c.maxEligibleDraws]);
  return hash(['bytes32', 'uint256', 'address', 'uint256', 'uint256', 'uint256', 'uint16', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'string'], [tag('FIXED_PROBABILITY_SERIES_V2'), chainId, address, seriesId, c.pricePoints, c.drawCap, c.maxBatchSize, prize, promotion, gate, c.contentHash, c.contentURI]);
}
export function compareSeries(row, chain) {
  const c = chain.config;
  for (const field of configFields) same(row[field], c[field], `SERIES_${field}_MISMATCH`);
  same(row.configData, defaultAbiCoder.encode(configTypes, configFields.map(k => c[k])), 'CONFIG_DATA_MISMATCH');
  same(row.configHash, chain.configHash, 'CONFIG_HASH_MISMATCH');
  same(row.configHash, configHash(deployment.chainId, deployment.address, row.seriesId, c), 'CONFIG_REHASH_MISMATCH');
  same(row.acceptedDraws, chain.acceptedDraws, 'ACCEPTED_DRAWS_MISMATCH');
  same(row.status, ['NONE', 'DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED'][Number(chain.status)], 'SERIES_STATUS_MISMATCH');
  let end = 0;
  const prizes = c.prizeIds.map((id, i) => {
    const start = end; end += Number(c.weights[i]);
    return {prizeId: String(id), prizeIndex: String(i), weight: String(c.weights[i]), intervalStart: String(start), intervalEndExclusive: String(end)};
  });
  same(row.prizes, prizes, 'PRIZES_MISMATCH');
}
export function compareOrder(row, chain) {
  same(row.id, entityId('order', chain.orderId), 'ORDER_ID_MISMATCH');
  same(row.series.seriesId, chain.seriesId, 'ORDER_SERIES_MISMATCH');
  for (const key of ['orderId', 'buyer', 'authorizationId', 'configHash', 'requestId', 'quantity', 'firstDrawId', 'grossPoints', 'rebatePoints', 'netPoints', 'freeOrderChallenge', 'eligibilityKey', 'levelAtRequest', 'acceptedDrawsBefore', 'randomWords', 'accountingFinalized']) same(row[key], chain[key], `ORDER_${key}_MISMATCH`);
  same(row.state, ['NONE', 'PENDING', 'RANDOM_READY', 'SETTLED'][Number(chain.state)], 'ORDER_STATE_MISMATCH');
  for (const key of ['freeOrderWon', 'firstTriggerIndex', 'refundPoints', 'finalPointsConsumed']) same(row[key], Number(chain.state) === 3 ? chain[key] : null, `ORDER_${key}_MISMATCH`);
  for (const key of ['membershipConsumptionId', 'previousLevel', 'newLevel', 'expiresAt']) same(row[key], chain.accountingFinalized ? chain[key] : null, `ORDER_${key}_MISMATCH`);
  same(row.observedMembershipRewardPoints, chain.accountingFinalized ? chain.membershipRewardPoints : null, 'OBSERVED_REWARD_MISMATCH');
  if (row.draws.length !== Number(chain.quantity)) throw Error('DRAW_COUNT_MISMATCH');
  same(row.claimedCount, row.draws.filter(d => d.claimed).length, 'CLAIMED_COUNT_MISMATCH');
}

const orderFields = `id orderId buyer authorizationId configHash requestId quantity firstDrawId grossPoints rebatePoints netPoints freeOrderChallenge eligibilityKey levelAtRequest acceptedDrawsBefore state randomWords freeOrderWon firstTriggerIndex refundPoints finalPointsConsumed accountingFinalized membershipConsumptionId observedMembershipRewardPoints previousLevel newLevel expiresAt claimedCount series { seriesId } draws(first:10,orderBy:drawIndex,orderDirection:asc) { id drawId drawIndex settled roll prizeId claimed initialRecipient nft { tokenId currentOwner mintRecipient claimRecipient } }`;
const seriesFields = `id seriesId configHash configData status acceptedDraws ${configFields.join(' ')} prizes(first:32,orderBy:prizeIndex,orderDirection:asc) { prizeId prizeIndex weight intervalStart intervalEndExclusive }`;
const metaFields = 'block { number hash } deployment hasIndexingErrors';

// Read-only. A run proves projection parity at one block, not VRF or DB settlement.
export async function runParity(options) {
  const { rpcUrl, graphUrl, expectedCid, blockNumber, graphToken, fetchImpl = fetch } = options;
  if (!rpcUrl || !graphUrl || !expectedCid) throw Error('PARITY_CONFIGURATION_REQUIRED');
  integer(blockNumber);
  if (BigInt(blockNumber) < BigInt(deployment.startBlock)) throw Error('BLOCK_BEFORE_DEPLOYMENT');
  let rpcSequence = 0;
  async function post(url, body, token) {
    let response;
    try { response = await fetchImpl(url, {method: 'POST', headers: {'content-type': 'application/json', ...(token ? {authorization: `Bearer ${token}`} : {})}, body: JSON.stringify(body), signal: AbortSignal.timeout(15000)}); }
    catch { throw Error('PARITY_TRANSPORT_UNAVAILABLE'); }
    if (!response.ok) throw Error('PARITY_HTTP_FAILED');
    let data; try { data = await response.json(); } catch { throw Error('PARITY_INVALID_JSON'); }
    if (data.error || data.errors?.length) throw Error('PARITY_QUERY_FAILED');
    return data;
  }
  const rpc = async (method, params) => (await post(rpcUrl, {jsonrpc: '2.0', id: ++rpcSequence, method, params})).result;
  const graph = async (query, variables = {}) => (await post(graphUrl, {query, variables}, graphToken)).data;
  same(BigInt(await rpc('eth_chainId', [])), deployment.chainId, 'WRONG_CHAIN');
  const blockTag = '0x' + BigInt(blockNumber).toString(16);
  const snapshot = await rpc('eth_getBlockByNumber', [blockTag, false]);
  if (!snapshot?.hash || BigInt(snapshot.number) !== BigInt(blockNumber)) throw Error('SNAPSHOT_UNAVAILABLE');
  const tip = (await graph(`{ _meta { ${metaFields} } }`))?._meta;
  if (!tip || tip.deployment !== expectedCid || tip.hasIndexingErrors !== false) throw Error('INDEX_UNHEALTHY');
  if (BigInt(tip.block.number) < BigInt(blockNumber)) throw Error('INDEX_BEHIND_SNAPSHOT');
  async function page(root, fields, where = 'deployment:$deployment') {
    const rows = []; let after = '';
    for (let i = 0; i < 10000; i++) {
      const data = await graph(`query($at:Block_height!,$deployment:String!,$after:String!) { _meta(block:$at) { ${metaFields} } items:${root}(block:$at,first:100,orderBy:id,orderDirection:asc,where:{${where},id_gt:$after}) { ${fields} } }`, {at: {hash: snapshot.hash}, deployment: dep, after});
      if (data?._meta?.deployment !== expectedCid || data._meta.hasIndexingErrors !== false) throw Error('INDEX_UNHEALTHY');
      same(data._meta.block.hash, snapshot.hash, 'SNAPSHOT_HASH_MISMATCH');
      same(data._meta.block.number, blockNumber, 'SNAPSHOT_NUMBER_MISMATCH');
      if (!Array.isArray(data.items)) throw Error('INDEX_ITEMS_MISSING');
      for (const item of data.items) { if (typeof item.id !== 'string' || item.id <= after) throw Error('CURSOR_ORDER_MISMATCH'); rows.push(item); after = item.id; }
      if (data.items.length < 100) return rows;
    }
    throw Error('PARITY_PAGE_LIMIT');
  }
  const call = async (name, args) => iface.decodeFunctionResult(name, await rpc('eth_call', [{to: deployment.address, data: iface.encodeFunctionData(name, args)}, {blockHash: snapshot.hash, requireCanonical: true}]))[0];
  const series = await page('fixedProbabilitySeries_collection', seriesFields);
  for (const s of series) { same(s.id, entityId('series', s.seriesId), 'SERIES_ID_MISMATCH'); compareSeries(s, await call('getSeries', [s.seriesId])); }
  const orders = await page('fixedProbabilityOrders', orderFields);
  let drawCount = 0, nftCount = 0;
  for (const o of orders) {
    const chain = await call('getOrder', [o.orderId]); compareOrder(o, chain);
    for (let i = 0; i < o.draws.length; i++) {
      const d = o.draws[i], id = String(BigInt(o.firstDrawId) + BigInt(i));
      same(d.drawId, id, 'DRAW_ID_MISMATCH'); same(d.id, entityId('draw', id), 'DRAW_ENTITY_MISMATCH'); same(d.drawIndex, i, 'DRAW_INDEX_MISMATCH');
      same(d.settled, o.state === 'SETTLED', 'DRAW_STATE_MISMATCH');
      // getDraw rejects IDs whose orders have not settled. Pending placeholders remain null.
      if (d.settled) {
        const cd = await call('getDraw', [id]);
        for (const key of ['drawId', 'drawIndex', 'roll', 'prizeId', 'claimed']) same(d[key], cd[key], `DRAW_${key}_MISMATCH`);
        same(cd.orderId, o.orderId, 'DRAW_ORDER_MISMATCH');
        same(d.initialRecipient, cd.claimed ? cd.recipient : null, 'DRAW_RECIPIENT_MISMATCH');
        if (d.claimed) {
          if (!d.nft) throw Error('CLAIM_NFT_MISSING');
          same(d.nft.tokenId, id, 'NFT_ID_MISMATCH'); same(d.nft.mintRecipient, cd.recipient, 'MINT_RECIPIENT_MISMATCH'); same(d.nft.claimRecipient, cd.recipient, 'CLAIM_RECIPIENT_MISMATCH');
          same(d.nft.currentOwner, await call('ownerOf', [id]), 'NFT_OWNER_MISMATCH'); nftCount++;
        } else same(d.nft, null, 'UNCLAIMED_NFT');
      } else { for (const k of ['roll', 'prizeId', 'initialRecipient', 'nft']) same(d[k], null, 'PENDING_DRAW_NON_NULL'); same(d.claimed, false, 'PENDING_CLAIM'); }
      drawCount++;
    }
  }
  const scopes = await page('fixedProbabilityEligibilityScopes', 'id scope policyId maxEligibleDraws');
  for (const scope of scopes) {
    const chain = await call('getEligibilityScope', [scope.scope]);
    same(scope.policyId, chain.policyId, 'SCOPE_POLICY_MISMATCH');
    same(scope.maxEligibleDraws, chain.maxEligibleDraws, 'SCOPE_QUOTA_MISMATCH');
    same(chain.exists, true, 'SCOPE_MISSING');
  }
  const allDraws = await page('fixedProbabilityDraws', 'id');
  same(allDraws.map(d => d.id).sort(), orders.flatMap(o => o.draws.map(d => d.id)).sort(), 'ORPHAN_DRAW');
  const allNFTs = await page('fixedProbabilityNFTs', 'id');
  same(allNFTs.map(d => d.id).sort(), orders.flatMap(o => o.draws.filter(d => d.claimed).map(d => entityId('nft', d.drawId))).sort(), 'ORPHAN_NFT');
  const usages = await page('fixedProbabilityEligibilityUsages', 'id eligibilityKey usedDraws scope { scope }', 'scope_:{deployment:$deployment}');
  for (const u of usages) same(u.usedDraws, await call('eligibleDrawsUsed', [u.scope.scope, u.eligibilityKey]), 'ELIGIBILITY_USAGE_MISMATCH');
  const events = await page('fixedProbabilityEvents', 'id eventName parameters transactionHash blockNumber blockHash timestamp logIndex');
  const indexedEvents = new Map(events.map(e => [e.id, e]));
  const sourceLogs = [];
  const step = 10000n;
  for (let from = BigInt(deployment.startBlock); from <= BigInt(blockNumber); from += step) {
    const to = from + step - 1n < BigInt(blockNumber) ? from + step - 1n : BigInt(blockNumber);
    const logs = await rpc('eth_getLogs', [{address: deployment.address, fromBlock: '0x' + from.toString(16), toBlock: '0x' + to.toString(16)}]);
    if (!Array.isArray(logs)) throw Error('RPC_LOGS_UNAVAILABLE');
    sourceLogs.push(...logs);
  }
  let created = 0, requested = 0, expectedDraws = 0, minted = 0;
  const registeredScopes = new Set(), consumedKeys = new Set();
  const logBlocks = new Map();
  for (const log of sourceLogs) {
    if (log.removed || log.address.toLowerCase() !== deployment.address.toLowerCase()) throw Error('LOG_SOURCE_MISMATCH');
    const id = eventId(log), indexed = indexedEvents.get(id);
    if (!indexed) throw Error('INDEX_EVENT_MISSING');
    indexedEvents.delete(id);
    const parsed = iface.parseLog(log);
    const values = Object.fromEntries(parsed.eventFragment.inputs.map((p, i) => [p.name, normalize(parsed.args[i])]));
    same(indexed.eventName, parsed.name, 'EVENT_NAME_MISMATCH');
    same(JSON.parse(indexed.parameters), values, 'EVENT_PARAMETERS_MISMATCH');
    same(indexed.transactionHash, log.transactionHash, 'EVENT_TX_MISMATCH'); same(indexed.blockHash, log.blockHash, 'EVENT_BLOCK_HASH_MISMATCH');
    same(indexed.blockNumber, BigInt(log.blockNumber), 'EVENT_BLOCK_MISMATCH'); same(indexed.logIndex, BigInt(log.logIndex), 'EVENT_LOG_INDEX_MISMATCH');
    let b = logBlocks.get(log.blockNumber);
    if (!b) { b = await rpc('eth_getBlockByNumber', [log.blockNumber, false]); logBlocks.set(log.blockNumber, b); }
    if (!b) throw Error('EVENT_BLOCK_UNAVAILABLE');
    same(b.hash, log.blockHash, 'EVENT_NONCANONICAL'); same(indexed.timestamp, BigInt(b.timestamp), 'EVENT_TIMESTAMP_MISMATCH');
    if (parsed.name === 'EligibilityScopeRegistered') registeredScopes.add(`${dep}:scope:${parsed.args.scope.toLowerCase()}`);
    if (parsed.name === 'EligibilityConsumed') consumedKeys.add(`${dep}:scope:${parsed.args.scope.toLowerCase()}:key:${parsed.args.eligibilityKey.toLowerCase()}`);
    if (parsed.name === 'SeriesCreated') created++;
    if (parsed.name === 'OrderRequested') { requested++; expectedDraws += Number(parsed.args.quantity); }
    if (parsed.name === 'Transfer' && parsed.args.from === '0x0000000000000000000000000000000000000000') minted++;
  }
  if (indexedEvents.size) throw Error('INDEX_EXTRA_EVENT');
  same(scopes.map(s => s.id).sort(), [...registeredScopes].sort(), 'SCOPE_COUNT_MISMATCH');
  same(usages.map(u => u.id).sort(), [...consumedKeys].sort(), 'USAGE_COUNT_MISMATCH');
  same(series.length, created, 'SERIES_COUNT_MISMATCH'); same(orders.length, requested, 'ORDER_COUNT_MISMATCH'); same(drawCount, expectedDraws, 'DRAW_TOTAL_MISMATCH'); same(nftCount, minted, 'NFT_TOTAL_MISMATCH');
  const finalBlock = await rpc('eth_getBlockByNumber', [blockTag, false]);
  same(finalBlock?.hash, snapshot.hash, 'SNAPSHOT_REORG');
  return {schemaVersion: 'fixed-probability-parity-v2', deployment: dep, candidateCid: expectedCid, block: {number: String(blockNumber), hash: snapshot.hash}, projectionParity: true, coverage: orders.length ? 'ORDERS_PRESENT' : 'NO_ORDERS', counts: {series: series.length, orders: orders.length, draws: drawCount, nfts: nftCount, usages: usages.length, events: events.length}, vrfVerified: false, ledgerVerified: false, legacyParityVerified: false};
}
