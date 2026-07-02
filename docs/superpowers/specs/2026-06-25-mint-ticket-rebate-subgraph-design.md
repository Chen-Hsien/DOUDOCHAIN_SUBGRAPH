# Mint Ticket Quantity 與 Rebate Events Subgraph 設計

日期：2026-06-25
狀態：Draft
Repo：doudochain_amoy
Branch：codex/mint-ticket-rebate-spec

## 背景

Bundle module 新流程只需要索引 ticket quantity mint 與 rebate tier events。沒有 ticket
options，因此 subgraph 不需要 ticket purchase option schema，也不需要
`TicketPurchaseConfigured` handler。

## 合約事件

需要索引：

```solidity
event BundleRebateTiersCleared(uint256 indexed seriesID);

event BundleRebateTierConfigured(
  uint256 indexed seriesID,
  uint256 indexed tierIndex,
  uint256 minimumTicketQuantity,
  uint256 rebatePoints
);

event TicketPurchaseMinted(
  uint256 indexed seriesID,
  address indexed buyer,
  uint256 ticketQuantity,
  uint256 priceInPoints,
  bool revealImmediately,
  uint256 firstTokenID
);

event TicketPurchaseRebatePaid(
  uint256 indexed seriesID,
  address indexed buyer,
  uint256 ticketQuantity,
  uint256 rebatePoints
);
```

不再索引新流程的：

- `TicketPurchaseConfigured`
- `BundleConfigured`
- `BundleMinted`

若歷史查詢仍需要舊 bundle data，可以保留舊 entities/handlers 作為 legacy，但新功能不使用。

## ABI 與 subgraph.yaml

Bundle datasource 新增 handlers：

```yaml
- event: BundleRebateTiersCleared(indexed uint256)
  handler: handleBundleRebateTiersCleared
- event: BundleRebateTierConfigured(indexed uint256,indexed uint256,uint256,uint256)
  handler: handleBundleRebateTierConfigured
- event: TicketPurchaseMinted(indexed uint256,indexed address,uint256,uint256,bool,uint256)
  handler: handleTicketPurchaseMinted
- event: TicketPurchaseRebatePaid(indexed uint256,indexed address,uint256,uint256)
  handler: handleTicketPurchaseRebatePaid
```

Datasource proxy address 沿用 Bundle module proxy。`startBlock` 可沿用既有值；若要降 indexing
成本，可改成此次 upgrade block，但要確認不影響仍需回放的歷史資料。

## Schema

### SeriesRebateTierConfig

處理 clear event 與 active tier set version。

```graphql
type SeriesRebateTierConfig @entity {
  id: ID!
  seriesID: BigInt!
  version: BigInt!
  tierCount: BigInt!
  lastClearedAt: BigInt
  updatedAt: BigInt!
  transactionHash: Bytes!
  tiers: [SeriesRebateTier!] @derivedFrom(field: "config")
}
```

ID：`seriesID`

### SeriesRebateTier

```graphql
type SeriesRebateTier @entity {
  id: ID!
  config: SeriesRebateTierConfig!
  seriesID: BigInt!
  configVersion: BigInt!
  tierIndex: BigInt!
  minimumTicketQuantity: BigInt!
  rebatePoints: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}
```

ID：`seriesID-tierIndex`

`configVersion` 仍保存在 entity 上供除錯與稽核。`SeriesRebateTierConfig.tierCount`
會記錄目前 active tier 數，讓 `BundleRebateTiersCleared(seriesID)` 可以先移除舊 active
tiers，再寫入新版 tiers。因此一般 GraphQL 查詢只用 `where: { seriesID }` 就會取得目前有效
階層，不會混到舊 version。

### TicketPurchaseMint

```graphql
type TicketPurchaseMint @entity {
  id: ID!
  seriesID: BigInt!
  buyer: Bytes!
  ticketQuantity: BigInt!
  priceInPoints: BigInt!
  revealImmediately: Boolean!
  firstTokenID: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}
```

ID：`transactionHash-logIndex`

### TicketPurchaseRebate

```graphql
type TicketPurchaseRebate @entity {
  id: ID!
  seriesID: BigInt!
  buyer: Bytes!
  ticketQuantity: BigInt!
  rebatePoints: BigInt!
  blockNumber: BigInt!
  blockTimestamp: BigInt!
  transactionHash: Bytes!
}
```

ID：`transactionHash-logIndex`

## Mapping 行為

### handleBundleRebateTiersCleared

- Load or create `SeriesRebateTierConfig(seriesID)`。
- `version += 1`。
- 記錄 clear event block/tx metadata。
- 依照 clear 前的 `tierCount` 移除目前 active `SeriesRebateTier(seriesID-tierIndex)`。
- 將 `tierCount` 歸零，等待後續 configured events 寫入新版 tiers。

### handleBundleRebateTierConfigured

- Load or create `SeriesRebateTierConfig(seriesID)`。
- 若不存在 config，建立 `version = 0`，支援缺少 clear event 的歷史重放。
- Create/update `SeriesRebateTier(seriesID-tierIndex)`，並把目前 `config.version` 寫入
  `configVersion`。

### handleTicketPurchaseMinted

- Create `TicketPurchaseMint`。
- 保存原始 `ticketQuantity`。
- 保存 `priceInPoints`，此值是整筆購買總價。
- 保存 `revealImmediately`。

### handleTicketPurchaseRebatePaid

- Create `TicketPurchaseRebate`。
- 這是 backend `/v1/user/mint/orders` 顯示實際回饋點數的首選資料來源。

## Query 範例

取得最新 rebate tiers：

```graphql
query SeriesRebateTiers($seriesID: BigInt!) {
  seriesRebateTiers(
    where: { seriesID: $seriesID }
    orderBy: minimumTicketQuantity
    orderDirection: asc
  ) {
    configVersion
    minimumTicketQuantity
    rebatePoints
  }
}
```

`SeriesRebateTier` 只保留目前 active tiers；若需要追歷史，查
`BundleRebateTiersCleared` / `BundleRebateTierConfigured` event entities。

取得 mint/rebate：

```graphql
query TicketPurchases($buyer: Bytes!, $seriesID: BigInt!) {
  ticketPurchaseMints(where: { buyer: $buyer, seriesID: $seriesID }) {
    ticketQuantity
    priceInPoints
    revealImmediately
    transactionHash
  }
  ticketPurchaseRebates(where: { buyer: $buyer, seriesID: $seriesID }) {
    ticketQuantity
    rebatePoints
    transactionHash
  }
}
```

## 遺漏風險

1. Clear event 無法直接刪除舊 tiers
   - 使用 versioning。

2. Order rebate reconciliation
   - 同一 tx 可能同時有 `TicketPurchaseMinted` 與 `TicketPurchaseRebatePaid`。
   - 關聯時使用 transaction hash + buyer + seriesID，不要只看 buyer 最新一筆。

3. 舊 bundle entities
   - 歷史資料若仍需查詢，保留 legacy schema。
   - 新 mint/rebate 功能不要寫入舊 entities。

## 測試計畫

1. `graph codegen`
   - 新 event type 產生成功。

2. Mapping tests
   - `BundleRebateTiersCleared` 會增加 version。
   - `BundleRebateTierConfigured` 寫入最新 version tiers。
   - `TicketPurchaseMinted` 保存 `ticketQuantity`、總價 `priceInPoints`、`revealImmediately`。
   - `TicketPurchaseRebatePaid` 保存 `rebatePoints`。

3. Query snapshot
   - 最新 rebate tiers 不會混到 clear 前的舊 tiers。
   - mint/rebate 可透過 transaction hash 對帳。

## 驗收條件

- Subgraph schema 支援 rebate tiers、ticket purchase mint、ticket purchase rebate。
- 不需要 ticket options schema。
- Clear + reconfigure tiers 後，query 只拿最新 active tier set。
- Backend 可用 subgraph event 資料回填 mint order 的 `rebatePointsEarned`。
