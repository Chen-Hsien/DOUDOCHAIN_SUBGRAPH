import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

export const HISTORY_DIRECTORY = '.deployment-history';
export const QUERY_ENDPOINT_KEYS = Object.freeze({ test: 'THEGRAPH_TEST_QUERY_URL', prod: 'THEGRAPH_PROD_QUERY_URL' });
export const GRAPH_IPFS_URL = 'https://api.thegraph.com/ipfs/api/v0';
const cidPattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;

function saveRecord(directory, record) {
  const temporary = join(directory, `.record-${randomUUID()}.tmp`);
  writeFileSync(temporary, json(record), { flag: 'wx' });
  renameSync(temporary, join(directory, 'record.json'));
}

export function deploymentIdFromOutput(output) {
  // The pinned graph-cli emits the manifest CID here; other printed CIDs are ABI/WASM files.
  const plain = output.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const matches = [...plain.matchAll(/Build completed:\s*(Qm[1-9A-HJ-NP-Za-km-z]{44})(?=\s|$)/g)];
  if (matches.length !== 1) throw new Error('Expected exactly one manifest Deployment ID from graph-cli.');
  return matches[0][1];
}

function copyTree(source, destination) {
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) copyFileSync(from, to);
    else throw new Error('Deployment snapshots must not contain symlinks or special files.');
  }
}

function inventory(directory, prefix = '') {
  return Object.fromEntries(readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).flatMap(entry => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return Object.entries(inventory(join(directory, entry.name), name));
    if (!entry.isFile()) throw new Error('Invalid snapshot file.');
    return [[name, sha256(readFileSync(join(directory, entry.name)))]];
  }));
}

function checkSnapshots(directory, expected) {
  const actual = inventory(join(directory, 'snapshots'));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('Deployment snapshot integrity check failed.');
}

export function readDeploymentRecord(directory) {
  const record = JSON.parse(readFileSync(join(directory, 'record.json'), 'utf8'));
  if (record.formatVersion !== 1 || !['test', 'prod'].includes(record.target) ||
      !/^[0-9a-f]{40}$/.test(record.git?.commit ?? '') || record.git.clean !== true || !record.snapshots ||
      !Object.keys(record.snapshots).length) throw new Error('Invalid deployment record.');
  if (record.deploymentId !== null && !cidPattern.test(record.deploymentId ?? '')) throw new Error('Invalid Deployment ID.');
  checkSnapshots(directory, record.snapshots);
  return record;
}

export function createDeploymentRecord({ root, targetName, target, versionLabel, git, generatedPath, resolvedNetworkPath = join(root, 'networks.json'), checks, now = new Date() }) {
  const directory = join(root, HISTORY_DIRECTORY, targetName, `${now.toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
  const snapshots = join(directory, 'snapshots');
  mkdirSync(snapshots, { recursive: true });
  const files = {
    'source-manifest.yaml': join(root, 'subgraph.yaml'),
    'generated-manifest.yaml': generatedPath,
    'schema.graphql': join(root, 'schema.graphql'),
    'networks.json': join(root, 'networks.json'),
    'resolved-networks.json': resolvedNetworkPath,
    'package.json': join(root, 'package.json'),
    'package-lock.json': join(root, 'package-lock.json'),
  };
  for (const [name, path] of Object.entries(files)) copyFileSync(path, join(snapshots, name));
  // Save source mappings, ABI and deployment evidence too; the Git SHA remains the source identity.
  for (const name of ['src', 'abis', 'config']) {
    if (existsSync(join(root, name))) copyTree(join(root, name), join(snapshots, name));
  }
  const record = {
    formatVersion: 1, createdAt: now.toISOString(), target: targetName,
    network: target.network, studioSlug: target.slug, versionLabel, git,
    toolchain: {
      node: process.version,
      graphCli: JSON.parse(readFileSync(join(root, 'node_modules/@graphprotocol/graph-cli/package.json'), 'utf8')).version,
    },
    deploymentId: null, status: 'prepared', checks,
    snapshots: inventory(snapshots),
    indexing: 'not_verified', graftEligibility: 'not_assessed',
  };
  writeFileSync(join(directory, 'record.json'), json(record), { flag: 'wx' });
  return directory;
}

export async function publishWithHistory({ directory, generatedPath, outputDir, upload, deploy }) {
  const record = readDeploymentRecord(directory);
  if (record.status !== 'prepared') throw new Error('A deployment attempt cannot be reused.');
  const save = () => saveRecord(directory, record);
  try {
    const result = await upload();
    if (result.status !== 0) {
      record.status = 'build_or_upload_failed';
      record.checks.push({ name: 'build_and_ipfs_upload', status: 'failed' });
      save();
      return result.status || 1;
    }
    record.deploymentId = deploymentIdFromOutput(result.output);
    // graph-cli resolves --network and migrations before building. Archive the resolved input.
    copyFileSync(generatedPath, join(directory, 'snapshots/generated-manifest.yaml'));
    copyTree(outputDir, join(directory, 'snapshots/compiled'));
    record.snapshots = inventory(join(directory, 'snapshots'));
    if (!record.snapshots['compiled/subgraph.yaml'] || !record.snapshots['compiled/schema.graphql'] ||
        !Object.keys(record.snapshots).some(path => path.startsWith('compiled/') && path.endsWith('.wasm'))) {
      throw new Error('Compiled manifest, schema and WASM evidence are required.');
    }
    record.status = 'uploaded';
    record.checks.push({ name: 'build_and_ipfs_upload', status: 'passed' });
    save(); // Persist CID and exact build artifacts BEFORE sending the deploy request.
    const status = await deploy(record.deploymentId);
    record.status = status === 0 ? 'deployment_accepted' : 'deployment_unconfirmed';
    record.checks.push({ name: 'studio_deploy_acknowledgement', status: status === 0 ? 'passed' : 'unconfirmed' });
    save();
    return status;
  } catch {
    // A failed response cannot establish that the remote deployment did not happen.
    record.status = record.status === 'uploaded' ? 'deployment_unconfirmed' : 'artifact_capture_failed';
    save();
    throw new Error('Deployment did not complete with confirmed evidence; inspect the saved record before retrying.');
  }
}

export async function verifyDeploymentRecord({ directory, targetName, target, endpoint, block, fetchImpl = fetch, now = new Date() }) {
  const record = readDeploymentRecord(directory);
  if (record.target !== targetName || record.network !== target.network || record.studioSlug !== target.slug) throw new Error('Deployment record does not match the selected target.');
  if (!record.deploymentId || !['deployment_accepted', 'deployment_unconfirmed'].includes(record.status)) throw new Error('No submitted deployment to verify.');
  if (!endpoint || !/^https?:$/.test(new URL(endpoint).protocol)) throw new Error('A valid query endpoint is required.');
  if (block !== undefined && (!Number.isSafeInteger(block) || block < 0)) throw new Error('Verification block must be a non-negative safe integer.');
  const verification = {
    formatVersion: 1, checkedAt: now.toISOString(), deploymentId: record.deploymentId,
    target: targetName, recordSha256: sha256(readFileSync(join(directory, 'record.json'))),
    requestedBlock: block ?? null, status: 'failed', reason: null, meta: null,
    // Healthy metadata is an observation, not finality, parity, or approval to graft.
    syncCompletion: 'not_assessed', graftEligibility: 'not_assessed',
  };
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: `query DeploymentEvidence { _meta${block === undefined ? '' : `(block: { number: ${block} })`} { deployment block { number hash } hasIndexingErrors } }` }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) verification.reason = 'http_error';
    else {
      const payload = await response.json();
      const meta = payload.data?._meta;
      if (payload.errors?.length) verification.reason = 'graphql_error';
      else if (meta?.deployment !== record.deploymentId) verification.reason = 'deployment_id_mismatch';
      else if (meta.hasIndexingErrors !== false) verification.reason = 'indexing_errors_or_unknown';
      else if (!Number.isSafeInteger(meta.block?.number) || meta.block.number < 0 || !hashPattern.test(meta.block?.hash ?? '')) verification.reason = 'invalid_block_metadata';
      else if (block !== undefined && meta.block.number !== block) verification.reason = 'block_mismatch';
      else {
        verification.status = 'healthy_observed';
        verification.meta = { deployment: meta.deployment, block: { number: meta.block.number, hash: meta.block.hash }, hasIndexingErrors: false };
      }
    }
  } catch {
    verification.reason = 'query_unavailable';
  }
  // Never persist the query URL, headers, raw remote errors or arbitrary response fields.
  const path = join(directory, `verification-${randomUUID()}.json`);
  writeFileSync(path, json(verification), { flag: 'wx' });
  return { path, verification };
}

export function resolveHistoryPath(root, input) {
  const directory = resolve(root, input);
  const historyRoot = resolve(root, HISTORY_DIRECTORY);
  if (!relative(historyRoot, directory) || relative(historyRoot, directory).startsWith(`..${sep}`) || relative(historyRoot, directory) === '..') throw new Error('Choose an attempt directory inside .deployment-history.');
  return directory;
}
