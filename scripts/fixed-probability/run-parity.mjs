#!/usr/bin/env node
import { runParity } from './parity.mjs';
try {
  const report = await runParity({rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL, graphUrl: process.env.NEW_GRAPH_URL, graphToken: process.env.NEW_GRAPH_AUTH_TOKEN, expectedCid: process.env.FIXED_PROBABILITY_SUBGRAPH_DEPLOYMENT, blockNumber: process.env.PARITY_BLOCK_NUMBER});
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  // Never print endpoint URLs, tokens, RPC response bodies or arbitrary provider errors.
  const code = error instanceof Error && /^[A-Z_0-9]+$/.test(error.message) ? error.message : 'PARITY_FAILED';
  console.error(JSON.stringify({projectionParity: false, code})); process.exitCode = 1;
}
