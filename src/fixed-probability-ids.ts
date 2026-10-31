import { BigInt, Bytes, dataSource, ethereum } from '@graphprotocol/graph-ts';
import { FixedProbabilityDeployment, FixedProbabilityEvent } from '../generated/schema';

export const ZERO = BigInt.zero();
export const UINT_MAX = BigInt.fromString('115792089237316195423570985008687907853269984665640564039457584007913129639935');
export const ZERO_BYTES = Bytes.fromHexString('0x' + '00'.repeat(32));

export function uintKey(value: BigInt): string {
  assert(value.ge(ZERO) && value.le(UINT_MAX), 'FixedProbability: uint256 range');
  const text = value.toString();
  return '0'.repeat(78 - text.length) + text;
}
export function deploymentId(event: ethereum.Event): string {
  return dataSource.context().getBigInt('chainId').toString() + ':' + event.address.toHexString();
}
export function entityId(event: ethereum.Event, kind: string, value: BigInt): string {
  return deploymentId(event) + ':' + kind + ':' + uintKey(value);
}
export function scopeId(event: ethereum.Event, scope: Bytes): string {
  return deploymentId(event) + ':scope:' + scope.toHexString();
}
export function eventId(event: ethereum.Event): string {
  return deploymentId(event) + ':event:' + event.transaction.hash.toHexString() + ':' + uintKey(event.logIndex);
}
function parameterJSON(value: ethereum.Value): string {
  if (value.kind == ethereum.ValueKind.BOOL) return value.toBoolean() ? 'true' : 'false';
  if (value.kind == ethereum.ValueKind.UINT || value.kind == ethereum.ValueKind.INT) return '"' + value.toBigInt().toString() + '"';
  if (value.kind == ethereum.ValueKind.ADDRESS) return '"' + value.toAddress().toHexString() + '"';
  if (value.kind == ethereum.ValueKind.FIXED_BYTES || value.kind == ethereum.ValueKind.BYTES) return '"' + value.toBytes().toHexString() + '"';
  // All event arrays in this ABI contain uint256. No unescaped arbitrary strings.
  assert(value.kind == ethereum.ValueKind.ARRAY, 'FixedProbability: unsupported audit parameter');
  const values = value.toArray();
  const parts = new Array<string>();
  for (let i = 0; i < values.length; i++) parts.push(parameterJSON(values[i]));
  return '[' + parts.join(',') + ']';
}
export function audit(event: ethereum.Event, name: string): boolean {
  const id = eventId(event);
  if (FixedProbabilityEvent.load(id) != null) return false;
  const dep = deploymentId(event);
  if (FixedProbabilityDeployment.load(dep) == null) {
    const context = dataSource.context();
    const d = new FixedProbabilityDeployment(dep);
    d.chainId = context.getBigInt('chainId');
    d.contractAddress = event.address;
    d.eventSourceAddress = event.address;
    d.startBlock = context.getBigInt('startBlock');
    d.protocolVersion = context.getString('protocolVersion');
    d.save();
  }
  const row = new FixedProbabilityEvent(id);
  row.deployment = dep;
  row.eventName = name;
  const fields = new Array<string>();
  for (let i = 0; i < event.parameters.length; i++) {
    const p = event.parameters[i];
    fields.push('"' + p.name + '":' + parameterJSON(p.value));
  }
  row.parameters = '{' + fields.join(',') + '}';
  row.transactionHash = event.transaction.hash;
  row.blockNumber = event.block.number;
  row.blockHash = event.block.hash;
  row.timestamp = event.block.timestamp;
  row.logIndex = event.logIndex;
  row.save();
  return true;
}
