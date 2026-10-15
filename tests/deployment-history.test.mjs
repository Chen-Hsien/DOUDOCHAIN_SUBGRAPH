import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import {
  createDeploymentRecord, deploymentIdFromOutput, publishWithHistory,
  readDeploymentRecord, resolveHistoryPath, verifyDeploymentRecord,
} from '../scripts/deployment-history.mjs';
import { TARGETS } from '../scripts/run-environment.mjs';

const cid = `Qm${'a'.repeat(44)}`;
const otherCid = `Qm${'b'.repeat(44)}`;
const blockHash = `0x${'1'.repeat(64)}`;

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'graph-deployment-evidence-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'node_modules/@graphprotocol/graph-cli'), { recursive: true });
  writeFileSync(join(root, 'node_modules/@graphprotocol/graph-cli/package.json'), '{"version":"0.90.1"}');
  const files = {
    'subgraph.yaml': 'specVersion: 1.0.0\ndataSources: []\n',
    'schema.graphql': 'type NFT @entity { id: ID! owner: Bytes! }\n',
    'networks.json': '{"arbitrum-sepolia":{}}\n',
    'package.json': '{"name":"example"}\n',
    'package-lock.json': '{"lockfileVersion":3}\n',
    '.generated.yaml': 'specVersion: 1.0.0\ndataSources: []\n',
    'src/handler.ts': 'export function handleTransfer(): void {}\n',
    'config/evidence.json': '{"startBlock":100}\n',
    'abis/NFT.json': '[]\n',
  };
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), contents);
  }
  const generatedPath = join(root, '.generated.yaml');
  const directory = createDeploymentRecord({
    root, targetName: 'test', target: TARGETS.test, versionLabel: '1.2.3',
    git: { branch: 'develop', commit: '1'.repeat(40), clean: true },
    generatedPath, checks: [{ name: 'rpc_chain_and_runtime', status: 'passed' }],
    now: new Date('2026-10-15T00:00:00Z'),
  });
  const outputDir = join(root, 'build/test');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'subgraph.yaml'), 'schema:\n  file: schema.graphql\n');
  writeFileSync(join(outputDir, 'schema.graphql'), files['schema.graphql']);
  writeFileSync(join(outputDir, 'NFT.wasm'), Buffer.from([0, 97, 115, 109]));
  const publish = (options = {}) => publishWithHistory({
    directory, generatedPath, outputDir,
    upload: async () => ({ status: 0, output: `Build completed: ${cid}\n` }),
    deploy: async () => 0, ...options,
  });
  return { root, directory, generatedPath, outputDir, publish, files };
}

test('manifest CID parser ignores ABI CIDs and ANSI; missing or ambiguous output is rejected', () => {
  assert.equal(deploymentIdFromOutput(`Add file to IPFS ${otherCid}\nBuild completed: \x1b[34m${cid}\x1b[0m\n`), cid);
  for (const output of ['Build completed: build/test/subgraph.yaml', `Add file to IPFS ${cid}`, `Build completed: ${cid}trailing`, `Build completed: ${cid}\nBuild completed: ${otherCid}\n`]) {
    assert.throws(() => deploymentIdFromOutput(output), /exactly one/);
  }
});

test('accepted deployment saves resolved manifests, schema, WASM, Git and checks BEFORE deploying the exact CID', async t => {
  const f = fixture(t);
  const status = await f.publish({
    upload: async () => {
      writeFileSync(f.generatedPath, 'specVersion: 1.0.0\n# network resolved by compiler\n');
      return { status: 0, output: `Build completed: ${cid}\n` };
    },
    deploy: async actualCid => {
      const record = readDeploymentRecord(f.directory);
      assert.equal(actualCid, cid);
      assert.equal(record.deploymentId, cid);
      assert.equal(record.status, 'uploaded');
      assert.equal(record.git.commit, '1'.repeat(40));
      assert.equal(record.git.clean, true);
      assert.deepEqual(record.toolchain, { node: process.version, graphCli: '0.90.1' });
      assert.equal(readFileSync(join(f.directory, 'snapshots/generated-manifest.yaml'), 'utf8'), 'specVersion: 1.0.0\n# network resolved by compiler\n');
      assert.equal(readFileSync(join(f.directory, 'snapshots/schema.graphql'), 'utf8'), f.files['schema.graphql']);
      assert.deepEqual(readFileSync(join(f.directory, 'snapshots/compiled/NFT.wasm')), Buffer.from([0, 97, 115, 109]));
      assert.deepEqual(Object.keys(record.snapshots), [
        'abis/NFT.json', 'compiled/NFT.wasm', 'compiled/schema.graphql', 'compiled/subgraph.yaml',
        'config/evidence.json', 'generated-manifest.yaml', 'networks.json', 'package-lock.json', 'package.json',
        'resolved-networks.json', 'schema.graphql', 'source-manifest.yaml', 'src/handler.ts',
      ]);
      assert.ok(Object.values(record.snapshots).every(hash => /^[a-f0-9]{64}$/.test(hash)));
      return 0;
    },
  });
  assert.equal(status, 0);
  const record = readDeploymentRecord(f.directory);
  assert.equal(record.status, 'deployment_accepted');
  assert.equal(record.indexing, 'not_verified');
  assert.equal(record.graftEligibility, 'not_assessed');
  assert.deepEqual(record.checks.slice(-2), [
    { name: 'build_and_ipfs_upload', status: 'passed' },
    { name: 'studio_deploy_acknowledgement', status: 'passed' },
  ]);
  await assert.rejects(f.publish(), /cannot be reused/);
});

test('failed upload never deploys and cannot become a usable base', async t => {
  const f = fixture(t);
  assert.equal(await f.publish({ upload: async () => ({ status: 9, output: '' }), deploy: () => assert.fail('must not deploy') }), 9);
  const record = readDeploymentRecord(f.directory);
  assert.equal(record.status, 'build_or_upload_failed');
  assert.equal(record.deploymentId, null);
});

test('missing manifest CID fails before deploying, even when CLI exit code is zero', async t => {
  const f = fixture(t);
  await assert.rejects(f.publish({ upload: async () => ({ status: 0, output: `ABI ${cid}` }), deploy: () => assert.fail('must not deploy') }), /confirmed evidence/);
  assert.equal(readDeploymentRecord(f.directory).status, 'artifact_capture_failed');
});

test('incomplete compiled evidence is rejected before sending a deploy request', async t => {
  const f = fixture(t);
  rmSync(join(f.outputDir, 'schema.graphql'));
  await assert.rejects(f.publish({ deploy: () => assert.fail('must not deploy') }), /confirmed evidence/);
  assert.equal(readDeploymentRecord(f.directory).status, 'artifact_capture_failed');
});

for (const mode of ['exit', 'throw']) {
  test(`ambiguous remote acceptance (${mode}) retains CID and marks unconfirmed`, async t => {
    const f = fixture(t);
    const promise = f.publish({ deploy: () => {
      if (mode === 'throw') throw new Error('https://secret.invalid/token');
      return 2;
    } });
    if (mode === 'throw') await assert.rejects(promise, /confirmed evidence/);
    else assert.equal(await promise, 2);
    const record = readDeploymentRecord(f.directory);
    assert.equal(record.status, 'deployment_unconfirmed');
    assert.equal(record.deploymentId, cid);
    assert.equal(JSON.stringify(record).includes('secret.invalid'), false);
  });
}

test('snapshot changes fail integrity validation before any further action', async t => {
  const f = fixture(t);
  await f.publish();
  writeFileSync(join(f.directory, 'snapshots/schema.graphql'), 'changed');
  assert.throws(() => readDeploymentRecord(f.directory), /integrity/);
});

function healthyMeta(overrides = {}) {
  return { deployment: cid, block: { number: 500, hash: blockHash }, hasIndexingErrors: false, ...overrides };
}

async function verify(f, options = {}) {
  return verifyDeploymentRecord({
    directory: f.directory, targetName: 'test', target: TARGETS.test,
    endpoint: 'https://example.invalid/private-token',
    fetchImpl: async () => ({ ok: true, json: async () => ({ data: { _meta: healthyMeta() } }) }),
    ...options,
  });
}

test('pinned-block metadata is saved as an append-only observation, never as sync or graft approval', async t => {
  const f = fixture(t);
  await f.publish();
  const before = readFileSync(join(f.directory, 'record.json'), 'utf8');
  const one = await verify(f, { block: 500, fetchImpl: async (url, request) => {
    assert.equal(url, 'https://example.invalid/private-token');
    assert.equal(request.redirect, 'error');
    assert.match(JSON.parse(request.body).query, /block: \{ number: 500 \}/);
    return { ok: true, json: async () => ({ data: { _meta: { ...healthyMeta(), secret: 'private-token' } } }) };
  } });
  const two = await verify(f);
  assert.notEqual(one.path, two.path);
  assert.equal(readFileSync(join(f.directory, 'record.json'), 'utf8'), before);
  assert.deepEqual(one.verification, {
    formatVersion: 1, checkedAt: one.verification.checkedAt, deploymentId: cid,
    target: 'test', recordSha256: one.verification.recordSha256,
    requestedBlock: 500, status: 'healthy_observed', reason: null,
    meta: healthyMeta(), syncCompletion: 'not_assessed', graftEligibility: 'not_assessed',
  });
  assert.match(one.verification.recordSha256, /^[a-f0-9]{64}$/);
  assert.equal(readFileSync(one.path, 'utf8').includes('private-token'), false);
});

for (const [name, payload, reason] of [
  ['old deployment endpoint', { data: { _meta: healthyMeta({ deployment: otherCid }) } }, 'deployment_id_mismatch'],
  ['indexing error', { data: { _meta: healthyMeta({ hasIndexingErrors: true }) } }, 'indexing_errors_or_unknown'],
  ['missing error flag', { data: { _meta: healthyMeta({ hasIndexingErrors: undefined }) } }, 'indexing_errors_or_unknown'],
  ['invalid hash', { data: { _meta: healthyMeta({ block: { number: 500, hash: null } }) } }, 'invalid_block_metadata'],
  ['wrong block', { data: { _meta: healthyMeta({ block: { number: 499, hash: blockHash } }) } }, 'block_mismatch'],
  ['GraphQL error even with data', { data: { _meta: healthyMeta() }, errors: [{ message: 'private-token' }] }, 'graphql_error'],
]) {
  test(`verification rejects ${name} and preserves sanitized failure evidence`, async t => {
    const f = fixture(t);
    await f.publish();
    const result = await verify(f, { block: 500, fetchImpl: async () => ({ ok: true, json: async () => payload }) });
    assert.equal(result.verification.status, 'failed');
    assert.equal(result.verification.reason, reason);
    assert.equal(result.verification.meta, null);
    assert.equal(readFileSync(result.path, 'utf8').includes('private-token'), false);
  });
}

test('network failures are recorded without URLs, provider errors or credentials', async t => {
  const f = fixture(t);
  await f.publish();
  const result = await verify(f, { fetchImpl: async () => { throw new Error('https://example.invalid/private-token'); } });
  assert.equal(result.verification.reason, 'query_unavailable');
  assert.equal(readFileSync(result.path, 'utf8').includes('private-token'), false);
});

test('wrong target, unsubmitted records and invalid blocks never query an endpoint', async t => {
  const f = fixture(t);
  const fetchImpl = () => assert.fail('must not query');
  await assert.rejects(verify(f, { fetchImpl }), /No submitted deployment/);
  await f.publish();
  await assert.rejects(verify(f, { targetName: 'prod', target: TARGETS.prod, fetchImpl }), /selected target/);
  await assert.rejects(verify(f, { target: { ...TARGETS.test, slug: 'wrong' }, fetchImpl }), /selected target/);
  for (const block of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(verify(f, { block, fetchImpl }), /safe integer/);
  assert.equal(readdirSync(f.directory).filter(name => name.startsWith('verification-')).length, 0);
});

test('record paths are confined to attempt directories', t => {
  const f = fixture(t);
  assert.equal(resolveHistoryPath(f.root, f.directory), f.directory);
  for (const input of ['.', '.deployment-history', '.deployment-history/../../outside', '/tmp/outside']) {
    assert.throws(() => resolveHistoryPath(f.root, input), /attempt directory/);
  }
});

test('both CI environments preserve hidden evidence on failure and keep query URLs in secrets', () => {
  const cliRequire = createRequire(import.meta.resolve('@graphprotocol/graph-cli'));
  const workflow = cliRequire('js-yaml').safeLoad(readFileSync(new URL('../.github/workflows/subgraph-deploy.yml', import.meta.url), 'utf8'));
  for (const [jobName, target, queryKey] of [
    ['deploy-test', 'test', 'THEGRAPH_TEST_QUERY_URL'],
    ['deploy-production', 'prod', 'THEGRAPH_PROD_QUERY_URL'],
  ]) {
    const steps = workflow.jobs[jobName].steps;
    const deploy = steps.find(step => step.run === `npm run deploy:${target}`);
    assert.equal(deploy.env[queryKey], '${{ secrets.THEGRAPH_QUERY_URL }}');
    const archive = steps.at(-1);
    assert.equal(archive.if, 'always()');
    assert.equal(archive.uses, 'actions/upload-artifact@v4');
    assert.deepEqual(archive.with, {
      name: `subgraph-deployment-${target}-\${{ github.run_id }}-\${{ github.run_attempt }}`,
      path: '.deployment-history/', 'include-hidden-files': true,
      'if-no-files-found': 'warn', 'retention-days': 90,
    });
  }
});
