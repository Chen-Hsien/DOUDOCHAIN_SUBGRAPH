import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const deployment = JSON.parse(read('../config/fixed-probability-deployment.json'));

export function validateFixedProbabilityDeployment(network, config, evidence, manifest, abi = read('../abis/FixedProbabilityLottery.json')) {
  const name = 'FixedProbabilityLottery';
  const included = /^    name: FixedProbabilityLottery$/m.test(manifest);
  if (network !== 'arbitrum-sepolia') {
    if (included || config?.[name]) throw new Error('FixedProbabilityLottery is only deployed on Sepolia.');
    return;
  }
  if (!included) throw new Error('Sepolia fixed probability source is missing.');
  for (const value of [config?.[name], evidence?.[name]]) {
    if (value?.address?.toLowerCase() !== deployment.address.toLowerCase() || value?.startBlock !== deployment.startBlock) {
      throw new Error('FixedProbabilityLottery configuration differs from the deployment artifact.');
    }
  }
  if (evidence[name].transactionHash !== deployment.transactionHash) throw new Error('FixedProbabilityLottery deployment transaction mismatch.');
  if (createHash('sha256').update(abi).digest('hex') !== deployment.abiSha256) throw new Error('FixedProbabilityLottery ABI hash mismatch.');
  const block = manifest.split('    name: FixedProbabilityLottery\n')[1]?.split(/^  - kind:|^templates:/m)[0] ?? '';
  const contextField = (name, type, value) => new RegExp(`${name}:\\s*\\n\\s+type: ${type}\\s*\\n\\s+data: "${value}"`).test(block);
  if (!contextField('chainId', 'BigInt', deployment.chainId) || !contextField('startBlock', 'BigInt', deployment.startBlock) ||
      !contextField('protocolVersion', 'String', '3') || !block.includes(`address: "${deployment.address}"`) || !block.includes(`startBlock: ${deployment.startBlock}`)) {
    throw new Error('FixedProbabilityLottery manifest source/context mismatch.');
  }
  const expected = JSON.parse(abi).filter(x => x.type === 'event').map(e => `${e.name}(${e.inputs.map(p => `${p.indexed ? 'indexed ' : ''}${p.type}`).join(',')})`).sort();
  const actual = [...block.matchAll(/- event: ([^\n]+)/g)].map(x => x[1]).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('FixedProbabilityLottery event handlers differ from ABI.');
}
