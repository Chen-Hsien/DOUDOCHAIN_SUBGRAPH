import { Bytes, crypto, dataSource, json, JSONValue, JSONValueKind } from '@graphprotocol/graph-ts';
import { FixedProbabilitySeriesMetadata, FixedProbabilityPrizeMetadata } from '../generated/schema';

function text(value: JSONValue | null): string | null {
  return value != null && value.kind == JSONValueKind.STRING ? value.toString() : null;
}

// Metadata failures are presentation failures, never reasons to stop chain indexing.
export function handleFixedProbabilitySeriesContent(content: Bytes): void {
  const id = dataSource.stringParam();
  if (FixedProbabilitySeriesMetadata.load(id) != null) return;
  const metadata = new FixedProbabilitySeriesMetadata(id);
  metadata.contentHash = Bytes.fromByteArray(crypto.keccak256(content));
  metadata.contentUtf8 = content.length <= 524288 ? content.toString() : '';
  metadata.valid = false;
  if (content.length > 524288) { metadata.save(); return; }
  const parsed = json.try_fromBytes(content);
  if (parsed.isError || parsed.value.kind != JSONValueKind.OBJECT) { metadata.save(); return; }
  const object = parsed.value.toObject();
  const name = text(object.get('name')), description = text(object.get('description'));
  const image = text(object.get('image')), terms = text(object.get('redemptionTerms'));
  const freeTerms = text(object.get('freeOrderTerms'));
  const prizes = object.get('prizes');
  if (text(object.get('schemaVersion')) != 'fixed-probability-series-v3' ||
      name == null || name!.length == 0 || description == null || image == null ||
      terms == null || freeTerms == null || prizes == null || prizes.kind != JSONValueKind.ARRAY) {
    metadata.save(); return;
  }
  const entries = prizes.toArray();
  if (entries.length == 0 || entries.length > 32) { metadata.save(); return; }
  const ids = new Array<string>();
  const records = new Array<FixedProbabilityPrizeMetadata>();
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].kind != JSONValueKind.OBJECT) { metadata.save(); return; }
    const prize = entries[i].toObject();
    const prizeId = text(prize.get('prizeId')), prizeName = text(prize.get('name'));
    const prizeDescription = text(prize.get('description'));
    const prizeImage = text(prize.get('image')), nftImage = text(prize.get('nftImage'));
    const animation = prize.get('animation_url');
    if (prizeId == null || prizeId!.length == 0 || ids.includes(prizeId!) ||
        prizeName == null || prizeName!.length == 0 || prizeDescription == null ||
        prizeImage == null || nftImage == null ||
        (animation != null && animation.kind != JSONValueKind.STRING)) { metadata.save(); return; }
    ids.push(prizeId!);
    const record = new FixedProbabilityPrizeMetadata(id + ':prize:' + prizeId!);
    record.seriesMetadata = id; record.prizeId = prizeId!; record.prizeIndex = i;
    record.name = prizeName!; record.description = prizeDescription!;
    record.image = prizeImage!; record.nftImage = nftImage!;
    if (animation != null) record.animationUrl = animation.toString();
    records.push(record);
  }
  metadata.name = name!; metadata.description = description!; metadata.image = image!;
  metadata.redemptionTerms = terms!; metadata.freeOrderTerms = freeTerms!;
  metadata.valid = true; metadata.save();
  // Save only after every entry has passed validation, so no partial prize catalog appears.
  for (let i = 0; i < records.length; i++) records[i].save();
}
