import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLocalEnv, TARGETS } from './run-environment.mjs';
import { QUERY_ENDPOINT_KEYS, resolveHistoryPath, verifyDeploymentRecord } from './deployment-history.mjs';

export async function main(argv = process.argv.slice(2)) {
  loadLocalEnv();
  const [targetName, input, blockText, ...extra] = argv;
  if (!TARGETS[targetName] || !input || extra.length || (blockText !== undefined && !/^\d+$/.test(blockText))) {
    throw new Error('Usage: npm run deployment:verify -- test|prod .deployment-history/<target>/<attempt> [block]');
  }
  const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
  const directory = resolveHistoryPath(root, input);
  const result = await verifyDeploymentRecord({
    directory, targetName, target: TARGETS[targetName],
    endpoint: process.env[QUERY_ENDPOINT_KEYS[targetName]]?.trim(),
    block: blockText === undefined ? undefined : Number(blockText),
  });
  console.log(`Verification: ${result.verification.status}; ${result.verification.reason ?? 'metadata matched'}. Evidence: ${result.path}`);
  if (result.verification.status !== 'healthy_observed') process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await main(); }
  catch { console.error('Deployment verification failed. Check the target, saved record and query endpoint configuration.'); process.exitCode = 1; }
}
