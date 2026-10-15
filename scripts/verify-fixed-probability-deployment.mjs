// The staging V3 collection was explicitly retired. Never reintroduce its source,
// including when composing manifests or recovering an archived deployment record.
export function validateFixedProbabilityDeployment(network, config, evidence, manifest) {
  const name = 'FixedProbabilityLottery';
  if (/^    name: FixedProbabilityLottery$/m.test(manifest) || config?.[name] || evidence?.[name]) {
    throw new Error('Retired FixedProbabilityLottery V3 source must be removed.');
  }
}
