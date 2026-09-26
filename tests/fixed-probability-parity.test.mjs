import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { compareSeries, compareOrder, configFields, configHash, deployment, entityId, iface, runParity } from '../scripts/fixed-probability/parity.mjs';
import { defaultAbiCoder } from '@ethersproject/abi';
const v = JSON.parse(readFileSync(new URL('./fixtures/fixed-probability-v2-vectors.json', import.meta.url)));
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
      const data = body.query.includes('items:') ? {_meta: h.at, items: h.rows} : {_meta: h.tip};
      return new Response(JSON.stringify({data}));
    }
    const result = body.method === 'eth_chainId' ? h.chain : body.method === 'eth_getLogs' ? h.logs : body.method === 'eth_getBlockByNumber' ? {...blockJson, hash: ++h.blocks > 1 ? h.finalHash : hash} : null;
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
  const row = {id: entityId('order', '1'), series: {seriesId: '1'}, orderId: '1', state: 'PENDING', quantity: '1', accountingFinalized: false, randomWords: [], claimedCount: '0', draws: [{claimed: false}]};
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
