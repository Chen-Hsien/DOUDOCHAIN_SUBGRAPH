import { afterEach, assert, beforeEach, clearStore, dataSourceMock, test } from 'matchstick-as/assembly/index';
import { Bytes, crypto, DataSourceContext } from '@graphprotocol/graph-ts';
import { handleFixedProbabilitySeriesContent } from '../src/fixed-probability-metadata';

const PATH = 'QmRVusZrHSDEQz4LcvZpwrhCGx8tTE4HDESUc2gVJzRHfH/series-v2.json';
const PRIZE = '{"prizeId":"1","name":"波尼","description":"每份一件","image":"ipfs://images/prizeImageSrc/1.jpg","nftImage":"ipfs://images/prizeNFTimage/1.jpg","animation_url":"ipfs://images/prizeNFTanimation/1.mp4"}';
function manifest(prizes: string = PRIZE): Bytes {
  return Bytes.fromUTF8('{"schemaVersion":"fixed-probability-series-v3","name":"固定機率","description":"測試","image":"ipfs://images/thumbnails/thumbnails.jpg","redemptionTerms":"六十日內兌換","freeOrderTerms":"免單","prizes":[' + prizes + ']}');
}
beforeEach(() => {
  clearStore();
  dataSourceMock.setReturnValues(PATH, 'arbitrum-sepolia', new DataSourceContext());
});
afterEach(() => { clearStore(); dataSourceMock.resetValues(); });

test('IPFS metadata keeps committed bytes and resolves public series/prize media once', () => {
  const bytes = manifest();
  handleFixedProbabilitySeriesContent(bytes);
  assert.fieldEquals('FixedProbabilitySeriesMetadata', PATH, 'valid', 'true');
  assert.fieldEquals('FixedProbabilitySeriesMetadata', PATH, 'contentUtf8', bytes.toString());
  assert.fieldEquals('FixedProbabilitySeriesMetadata', PATH, 'contentHash', Bytes.fromByteArray(crypto.keccak256(bytes)).toHexString());
  assert.fieldEquals('FixedProbabilitySeriesMetadata', PATH, 'name', '固定機率');
  assert.fieldEquals('FixedProbabilityPrizeMetadata', PATH + ':prize:1', 'prizeIndex', '0');
  assert.fieldEquals('FixedProbabilityPrizeMetadata', PATH + ':prize:1', 'nftImage', 'ipfs://images/prizeNFTimage/1.jpg');
  assert.fieldEquals('FixedProbabilityPrizeMetadata', PATH + ':prize:1', 'animationUrl', 'ipfs://images/prizeNFTanimation/1.mp4');
});
test('malformed JSON fails presentation without aborting the mapping', () => {
  handleFixedProbabilitySeriesContent(Bytes.fromUTF8('{broken'));
  assert.fieldEquals('FixedProbabilitySeriesMetadata', PATH, 'valid', 'false');
  assert.entityCount('FixedProbabilityPrizeMetadata', 0);
});
test('a repeated file source preserves the immutable metadata without duplicate prize writes', () => {
  handleFixedProbabilitySeriesContent(manifest());
  handleFixedProbabilitySeriesContent(manifest());
  assert.entityCount('FixedProbabilitySeriesMetadata', 1);
  assert.entityCount('FixedProbabilityPrizeMetadata', 1);
  assert.fieldEquals('FixedProbabilitySeriesMetadata', PATH, 'valid', 'true');
});
test('duplicate or malformed later prizes cannot leave a partial catalog', () => {
  handleFixedProbabilitySeriesContent(manifest(PRIZE + ',' + PRIZE));
  assert.fieldEquals('FixedProbabilitySeriesMetadata', PATH, 'valid', 'false');
  assert.entityCount('FixedProbabilityPrizeMetadata', 0);
});
