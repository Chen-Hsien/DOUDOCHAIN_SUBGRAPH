import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compareSeries, compareOrder, configFields, configHash, deployment, entityId, iface, runParity } from '../scripts/fixed-probability/parity.mjs';
import { defaultAbiCoder } from '@ethersproject/abi';
const v = JSON.parse(readFileSync(new URL('./fixtures/fixed-probability-v3-vectors.json', import.meta.url)));
const hash = '0x' + '11'.repeat(32);
const cid = 'QmCandidate';
const block = String(deployment.startBlock);
const meta = {block: {number: Number(block), hash}, deployment: cid, hasIndexingErrors: false};
const blockJson = {number: '0x' + BigInt(block).toString(16), hash, timestamp: '0x1'};
function harness() {
  const calls = [];
  const h = {tip: structuredClone(meta), at: structuredClone(meta), logs: [], rows: [], chain: '0x66eee', finalHash: hash, blocks: 0};
  h.fetchImpl = async (url, opts) => {
    const body = JSON.parse(opts.body); calls.push({url, body});
    if (url === 'https://graph.invalid') {
      const root = body.query.match(/items:(\w+)/)?.[1];
      const data = root ? {_meta: h.at, items: h.entities?.[root] ?? h.rows} : {_meta: h.tip};
      return new Response(JSON.stringify({data}));
    }
    const result = body.method === 'eth_chainId' ? h.chain : body.method === 'eth_getLogs' ? h.logs : body.method === 'eth_getBlockByNumber' ? {...blockJson, hash: ++h.blocks > 1 ? h.finalHash : hash} : body.method === 'eth_call' ? h.call?.(iface.parseTransaction({data: body.params[0].data})) : null;
    return new Response(JSON.stringify({result}));
  };
  h.run = () => runParity({rpcUrl: 'https://rpc.invalid', graphUrl: 'https://graph.invalid', expectedCid: cid, blockNumber: block, fetchImpl: h.fetchImpl});
  return {...h, get state() { return h; }, calls};
}
test('independent config hash matches the frozen contract vector', () => {
  assert.equal(configHash(v.deployment.chainId, v.deployment.lotteryAddress, v.series.seriesId, v.series), v.series.configHash);
  assert.notEqual(configHash(v.deployment.chainId, deployment.address, v.series.seriesId, v.series), v.series.configHash);
});
test('all 17 fields, raw flat ABI, hash, intervals and status must agree', () => {
  const chain = {config: v.series, configHash: configHash(deployment.chainId, deployment.address, '1', v.series), status: 2, acceptedDraws: '10'};
  const fields = iface.getFunction('getSeries').outputs[0].components[0].components;
  let end = 0;
  const row = {...v.series, configHash: chain.configHash, configData: defaultAbiCoder.encode(fields.map(x => x.type), configFields.map(k => v.series[k])), acceptedDraws: '10', status: 'ACTIVE', prizes: v.series.prizeIds.map((prizeId, i) => {const start = end; end += Number(v.series.weights[i]); return {prizeId, prizeIndex: i, weight: v.series.weights[i], intervalStart: start, intervalEndExclusive: end};})};
  compareSeries(row, chain);
  for (const k of configFields) {
    const bad = structuredClone(row); bad[k] = Array.isArray(row[k]) ? [] : '0';
    assert.throws(() => compareSeries(bad, chain), /MISMATCH/);
  }
  assert.throws(() => compareSeries({...row, configData: '0x'}, chain), /CONFIG_DATA/);
  assert.throws(() => compareSeries({...row, configHash: hash}, chain), /CONFIG_HASH/);
});
test('pending zeros are nullable and finalized reward is observation only', () => {
  const chain = {orderId: '1', seriesId: '1', state: 1, quantity: 1, accountingFinalized: false, randomWords: []};
  const row = {id: entityId('order', '1'), series: {seriesId: '1'}, orderId: '1', state: 'PENDING', quantity: '1', accountingFinalized: false, randomWords: [], claimedCount: '1', draws: [{claimed: true, nft: {tokenId: '1'}}]};
  for (const k of ['buyer', 'authorizationId', 'configHash', 'requestId', 'firstDrawId', 'grossPoints', 'rebatePoints', 'netPoints', 'freeOrderChallenge', 'eligibilityKey', 'levelAtRequest', 'acceptedDrawsBefore']) {chain[k] = row[k] = k === 'freeOrderChallenge' ? false : '0';}
  for (const k of ['freeOrderWon', 'firstTriggerIndex', 'refundPoints', 'finalPointsConsumed', 'membershipConsumptionId', 'previousLevel', 'newLevel', 'expiresAt', 'observedMembershipRewardPoints']) row[k] = null;
  compareOrder(row, chain);
  assert.throws(() => compareOrder({...row, refundPoints: '0'}, chain), /refundPoints_MISMATCH/);
  assert.throws(() => compareOrder({...row, draws: []}, chain), /DRAW_COUNT/);
});
test('empty projection is explicitly no-orders coverage and every query uses same snapshot', async () => {
  const h = harness(), report = await h.run();
  assert.equal(report.coverage, 'NO_ORDERS'); assert.equal(report.vrfVerified, false); assert.equal(report.ledgerVerified, false); assert.equal(report.legacyParityVerified, false);
  for (const c of h.calls.filter(x => x.body.query?.includes('items:'))) assert.deepEqual(c.body.variables.at, {hash});
});
test('wrong chain, wrong CID, errors, lag, noncanonical snapshot and missing audit never pass', async () => {
  for (const [mutate, pattern] of [
    [h => h.chain = '0xa4b1', /WRONG_CHAIN/],
    [h => h.tip.deployment = 'other', /INDEX_UNHEALTHY/],
    [h => h.tip.hasIndexingErrors = true, /INDEX_UNHEALTHY/],
    [h => h.tip.block.number = 1, /INDEX_BEHIND/],
    [h => h.at.block.hash = '0x' + '22'.repeat(32), /SNAPSHOT_HASH/],
    [h => h.finalHash = '0x' + '22'.repeat(32), /SNAPSHOT_REORG/],
    [h => h.logs = [{address: deployment.address, transactionHash: hash, logIndex: '0x0'}], /INDEX_EVENT_MISSING/],
  ]) { const h = harness(); mutate(h.state); await assert.rejects(h.run(), pattern); }
});
test('provider and Graph errors are rejected without echoing token-bearing URLs', async () => {
  for (const fetchImpl of [async () => {throw Error('https://secret.invalid/token');}, async () => new Response(JSON.stringify({errors: [{message: 'secret'}]}))]) {
    await assert.rejects(runParity({rpcUrl: 'https://rpc.invalid', graphUrl: 'https://graph.invalid', expectedCid: cid, blockNumber: block, fetchImpl}), /^Error: PARITY_(TRANSPORT_UNAVAILABLE|QUERY_FAILED)$/);
  }
});

const zeroAddress = '0x' + '00'.repeat(20), zeroHash = '0x' + '00'.repeat(32);
const buyer = '0x' + '12'.repeat(20), transferee = '0x' + '34'.repeat(20);
const zeroFor = c => c.type === 'tuple' ? Object.fromEntries(c.components.map(x => [x.name, zeroFor(x)])) : c.type.endsWith('[]') ? [] : c.type === 'bool' ? false : c.type === 'address' ? zeroAddress : c.type === 'bytes32' ? zeroHash : c.type === 'bytes' ? '0x' : c.type === 'string' ? '' : '0';
function populated(state, finalized = false, refunded = false, transferred = false, exchanged = false) {
  const h = harness(), hs = h.state;
  const rawOrder = iface.getFunction('getOrder').outputs[0];
  const chain = {...zeroFor(rawOrder), orderId: '1', seriesId: '1', buyer, quantity: '1', firstDrawId: '1', state,
    configHash: configHash(deployment.chainId, deployment.address, '1', v.series), grossPoints: '100', rebatePoints: '10', netPoints: '90',
    accountingFinalized: finalized, randomWords: state === 3 ? ['123'] : [], refundPoints: refunded ? '90' : '0', freeOrderWon: refunded,
    finalPointsConsumed: finalized && !refunded ? '90' : '0', membershipConsumptionId: hash, previousLevel: '1', newLevel: '2', expiresAt: '99', membershipRewardPoints: refunded ? '0' : '4'};
  const configTypes = iface.getFunction('getSeries').outputs[0].components[0].components.map(c => c.type);
  let end = 0;
  const series = {...v.series, id: entityId('series', '1'), configHash: chain.configHash,
    configData: defaultAbiCoder.encode(configTypes, configFields.map(k => v.series[k])), status: 'ACTIVE', acceptedDraws: '1',
    prizes: v.series.prizeIds.map((prizeId,i) => {const start = end; end += Number(v.series.weights[i]); return {prizeId, prizeIndex: i, weight: v.series.weights[i], intervalStart: start, intervalEndExclusive: end};})};
  const nft = {id: entityId('nft', '1'), tokenId: '1', mintRecipient: buyer, claimRecipient: buyer, currentOwner: transferred ? transferee : buyer, exchanged};
  const draw = {id: entityId('draw', '1'), drawId: '1', drawIndex: '0', settled: state === 3, roll: state === 3 ? '123' : null,
    prizeId: state === 3 ? '2' : null, claimed: true, initialRecipient: buyer, nft};
  const row = {...chain, id: entityId('order', '1'), series: {seriesId: '1'}, state: state === 3 ? 'SETTLED' : 'PENDING', claimedCount: '1', draws: [draw],
    freeOrderWon: state === 3 ? refunded : null, firstTriggerIndex: state === 3 ? chain.firstTriggerIndex : null, refundPoints: state === 3 ? chain.refundPoints : null,
    finalPointsConsumed: state === 3 ? refunded ? '0' : '90' : null, observedMembershipRewardPoints: finalized ? chain.membershipRewardPoints : null};
  for (const k of ['membershipConsumptionId','previousLevel','newLevel','expiresAt']) row[k] = finalized ? chain[k] : null;
  const entities = hs.entities = {fixedProbabilitySeries_collection: [series], fixedProbabilityOrders: [row], fixedProbabilityDraws: [draw], fixedProbabilityNFTs: [nft], fixedProbabilityEvents: []};
  const scope = v.series.eligibilityScope, policyId = v.series.eligibilityPolicyId, eligibilityKey = hash;
  entities.fixedProbabilityEligibilityScopes = [{id: `${deployment.chainId}:${deployment.address.toLowerCase()}:scope:${scope}`, scope, policyId, maxEligibleDraws: '20'}];
  entities.fixedProbabilityEligibilityUsages = [{id: `${entities.fixedProbabilityEligibilityScopes[0].id}:key:${eligibilityKey}`, eligibilityKey, usedDraws: '1', scope: {scope}}];
  const callValues = {getSeries: {config: v.series, configHash: chain.configHash, status: '2', acceptedDraws: '1'}, getOrder: chain,
    getDraw: {...zeroFor(iface.getFunction('getDraw').outputs[0]), drawId: '1', orderId: '1', drawIndex: '0', roll: state === 3 ? '123' : '0', prizeId: state === 3 ? '2' : '0', tokenId: '1', recipient: buyer, exchanged},
    ownerOf: nft.currentOwner, eligibilityScopePolicy: policyId, eligibilityScopeMaximum: '20', eligibleDrawsUsed: '1'};
  hs.call = tx => iface.encodeFunctionResult(tx.name, [callValues[tx.name]]);
  function addEvent(name, overrides) {
    const frag = iface.getEvent(name);
    const params = Object.fromEntries(frag.inputs.map(x => [x.name, overrides[x.name] ?? zeroFor(x)]));
    const encoded = iface.encodeEventLog(frag, frag.inputs.map(x => params[x.name]));
    const i = hs.logs.length;
    hs.logs.push({...encoded, address: deployment.address, transactionHash: hash, logIndex: '0x' + i.toString(16), blockNumber: blockJson.number, blockHash: hash, removed: false});
    entities.fixedProbabilityEvents.push({id: `${deployment.chainId}:${deployment.address.toLowerCase()}:event:${hash}:${String(i).padStart(78,'0')}`, eventName: name, parameters: JSON.stringify(params), transactionHash: hash, blockNumber: block, blockHash: hash, timestamp: '1', logIndex: String(i)});
  }
  addEvent('SeriesCreated', {}); addEvent('OrderRequested', {quantity: '1'}); addEvent('Transfer', {from: zeroAddress, to: buyer, tokenId: '1'});
  addEvent('EligibilityScopeRegistered', {scope, policyId, maxEligibleDraws: '20'}); addEvent('EligibilityConsumed', {scope, eligibilityKey});
  if (transferred) addEvent('Transfer', {from: buyer, to: transferee, tokenId: '1'});
  return {h, chain, row, draw, nft, callValues};
}
test('V3 pending minted, settled pre-accounting, paid refund, transfer and exchange full projections pass', async () => {
  for (const args of [[1], [3], [3,true], [3,true,true], [3,true,false,true], [3,true,false,true,true]]) {
    const {h} = populated(...args), report = await h.run();
    assert.equal(report.coverage, 'ORDERS_PRESENT'); assert.equal(report.counts.nfts, 1); assert.equal(report.schemaVersion, 'fixed-probability-parity-v3');
    const logQuery = h.calls.find(c => c.body.method === 'eth_getLogs').body.params[0];
    assert.equal(logQuery.topics[0].length, 13); // Only the manifest's tracked events, not role/compatibility events.
  }
});
test('V3 parity rejects missing immediate NFT, bad prize, owner, exchange and settled consumption', async () => {
  for (const [mutate, pattern] of [
    [f => f.draw.claimed = false, /IMMEDIATE_NFT/], [f => f.draw.nft = null, /IMMEDIATE_NFT/],
    [f => f.draw.prizeId = '3', /DRAW_prizeId/], [f => f.nft.currentOwner = buyer, /NFT_OWNER/],
    [f => f.nft.exchanged = false, /NFT_EXCHANGED/], [f => f.row.finalPointsConsumed = '0', /finalPointsConsumed/],
    [f => f.row.previousLevel = '0', /previousLevel/], [f => f.callValues.eligibilityScopeMaximum = '19', /SCOPE_QUOTA/],
  ]) { const f = populated(3,true,false,true,true); mutate(f); await assert.rejects(f.h.run(), pattern); }
});
