import { BigInt, Bytes, log } from "@graphprotocol/graph-ts"
import { NewSubPrize, SeriesPrizePoolInventory } from "../generated/schema"

function seriesInventoryId(seriesID: BigInt): Bytes {
  return Bytes.fromUTF8(seriesID.toString())
}

function subPrizeEntityId(seriesID: BigInt, subPrizeID: BigInt): Bytes {
  return Bytes.fromUTF8(
    seriesID.toString().concat("-").concat(subPrizeID.toString())
  )
}

export function trackSeriesSubPrize(
  seriesID: BigInt,
  subPrizeID: BigInt
): void {
  let id = seriesInventoryId(seriesID)
  let inventory = SeriesPrizePoolInventory.load(id)
  if (inventory == null) {
    inventory = new SeriesPrizePoolInventory(id)
    inventory.seriesID = seriesID
    inventory.subPrizeIDs = []
  }

  let existing = inventory.subPrizeIDs
  let ordered = new Array<BigInt>()
  let inserted = false

  for (let i = 0; i < existing.length; i++) {
    let current = existing[i]
    if (current.equals(subPrizeID)) {
      return
    }
    if (!inserted && subPrizeID.lt(current)) {
      ordered.push(subPrizeID)
      inserted = true
    }
    ordered.push(current)
  }

  if (!inserted) {
    ordered.push(subPrizeID)
  }

  inventory.subPrizeIDs = ordered
  inventory.save()
}

export function snapshotSeriesPrizePool(
  seriesID: BigInt
): Array<BigInt> | null {
  let inventory = SeriesPrizePoolInventory.load(seriesInventoryId(seriesID))
  if (inventory == null || inventory.subPrizeIDs.length == 0) {
    log.warning(
      "Cannot snapshot reveal prize pool for series {} because its inventory is missing",
      [seriesID.toString()]
    )
    return null
  }

  let remainingQuantities = new Array<BigInt>()
  let subPrizeIDs = inventory.subPrizeIDs
  for (let i = 0; i < subPrizeIDs.length; i++) {
    let subPrizeID = subPrizeIDs[i]
    let subPrize = NewSubPrize.load(subPrizeEntityId(seriesID, subPrizeID))
    if (subPrize == null) {
      log.warning(
        "Cannot snapshot reveal prize pool for series {} because sub-prize {} is missing",
        [seriesID.toString(), subPrizeID.toString()]
      )
      return null
    }
    remainingQuantities.push(subPrize.subPrizeRemainingQuantity)
  }

  return remainingQuantities
}
