import { nativeBuybackDeployments, nativeBuybackFragment } from './native-buyback-deployments.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

// Base sources and their historical starting blocks remain unchanged.
export function targetManifest(network, base = readFileSync(resolve(root, 'subgraph.yaml'), 'utf8')) {
  if (!['arbitrum-sepolia', 'arbitrum-one'].includes(network)) throw new Error('Unsupported manifest network.');
  if (/name:\s*FixedProbabilityLottery\b/.test(base)) throw new Error('FixedProbabilityLottery must use the Sepolia-only fragment.');
  const native = nativeBuybackFragment(network,nativeBuybackDeployments(network));
  if (network === 'arbitrum-one') return native ? base.replace(/^templates:/m,`${native}\ntemplates:`) : base;
  const marker = /^templates:/m;
  if (!marker.test(base)) throw new Error('Base manifest templates section missing.');
  return base.replace(marker, `${native}\ntemplates:`);
}
