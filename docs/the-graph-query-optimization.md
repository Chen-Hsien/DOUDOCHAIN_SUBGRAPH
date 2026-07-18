# The Graph 查詢效能與次數優化

更新日期：2026-07-11

## 目標與依據

本次優化以後端實際使用的 GraphQL operation 為範圍，依照 The Graph 官方建議完成下列調整：

- 僅查詢 API 實際需要的欄位，並對 root／nested collection 明確指定 `first`。
- 深分頁由 `skip` 改為 `id_gt` cursor。
- 多頁查詢第一頁取得 `_meta.block.hash`，續頁使用 `block: { hash }` 固定一致快照。
- 可同時取得的 root fields 合併為單一 GraphQL operation。
- 使用靜態 query document 與 variables，不動態拼接使用者輸入。
- 以 subgraph materialized projection 取代後端反覆掃描 event history。

官方參考：

- [GraphQL API：pagination、`id_gt` 與查詢限制](https://thegraph.com/docs/en/subgraphs/querying/graphql-api/)
- [Query best practices：欄位裁剪、明確 `first`、合併 root fields](https://thegraph.com/docs/en/subgraphs/querying/best-practices/)
- [Distributed systems：block pinning 與 reorg 處理](https://thegraph.com/docs/en/subgraphs/querying/distributed-systems/)
- [`@derivedFrom` 關聯最佳實務](https://thegraph.com/docs/en/subgraphs/best-practices/derivedfrom/)
- [Immutable entities 與 Bytes IDs](https://thegraph.com/docs/en/subgraphs/best-practices/immutable-entities-bytes-as-ids/)

## 已完成的查詢優化

| 路徑 | 原本行為 | 優化後 |
| --- | --- | --- |
| Series detail batch | detail、mint-lock、redraw 至少 3 次，lock 可能掃歷史頁 | 每 1,000 個 series 以 1 次 operation 取得 detail、runtime state、redraw |
| Realtime snapshot | 重複掃 minted／unrevealed ticket 與 mint-lock event | 常見情況 1 次；minted tickets 超過 1,000 才走 pinned cursor 續頁 |
| Mint reservation／preflight | 讀取該系列全部 lucky numbers | 只查候選 lucky numbers，使用 `luckyNumber_in`，每批 500 |
| Reveal proof index | 每次最多掃 20,000 筆 sent events，再查 metadata／owner | 無 viewer 時 1 次 summary query；viewer overlay 才增加 cursor query |
| Owned rewards 全量 | 最深可達多次 `skip`，每頁重傳 deposits | `id_gt` + pinned block；deposits 只在第一頁，超過 1,000 再走自己的 cursor |
| Series poster | 每頁重查 series metadata／prizes | metadata 僅第一頁；tickets 使用 `id_gt` + pinned block |
| Admin series summary | 逐頁掃 catalog 直到找到指定 ids | 直接使用 `seriesID_in` 查指定 ids |
| 相同並行 request | 同一 operation 可能同時重複送出 | request settle 前共用同一個 in-flight Promise |

## 新增的 subgraph projection

### `SeriesRuntimeState`

- 每個 series 一筆 mutable entity。
- 保存 `unrevealedCount` 與最新 mint lock。
- ticket reveal 狀態只有在 state transition 時調整 count，並防止 underflow。
- core 與 SeriesOps module 的 mint-lock event 都會更新同一筆 projection。

### `SeriesRevealSummary`／`SeriesRevealToken`

- 每個 series 一筆 summary，保存 proof occurrence 數、token occurrence 數及最新 proof。
- 每個 reveal request/token occurrence 建立 immutable token anchor；同一 token 若出現在不同 proof，仍保留各次 occurrence，與舊 API 語意一致。
- 找不到對應 `RevealDrawSent` 時會記錄 warning 並略過，避免產生空 hash/timestamp 的 ghost summary。

## Backend transport 策略

- Request timeout 預設 10 秒，涵蓋 response body 讀取，不只等待 headers。
- 有 fallback endpoint 時，primary 最多使用總 budget 的 60%，保留 40% 給 fallback。
- Primary 發生 retryable failure 後，15 秒內直接走 fallback，避免 outage 放大流量。
- HTTP 408／429／5xx、network error、malformed HTTP 200 body，以及明確 transient GraphQL execution error 才走 fallback。
- Schema validation error 不會先重送相同 query 到 fallback，避免 deterministic double call。
- 只有 catalog／summary 類 read path 使用短 TTL cache；mint、reservation、preflight 等交易安全路徑維持 fresh read。
- Cache 有最大筆數限制；projection capability 失敗後 60 秒會重新探測，避免 deployment rollout 後永久鎖在 legacy path。

可調整的環境變數：

- `THE_GRAPH_REQUEST_TIMEOUT_MS`（預設 `10000`）
- `THE_GRAPH_RESULT_CACHE_TTL_MS`（預設 `1000`）
- `THE_GRAPH_MAX_CACHED_RESPONSES`（預設 `500`）

## 上線順序與必要 gate

新增 projection 依賴完整歷史事件，因此新 subgraph deployment 必須從現有 `startBlock` 完整重建，不能 graft 舊 store。建議順序：

1. 部署新 subgraph version，等待同步完成。
2. 在切換 backend endpoint 前執行 parity gate。
3. 先小流量切換 backend，觀察 fallback、timeout、Graph request count 與 p95 latency。
4. 確認 projection path 穩定後，再淘汰 legacy query。

Parity gate：

- `count(SeriesRuntimeState) == count(NewSeries)`。
- `sum(SeriesRuntimeState.unrevealedCount) == count(NewTicketStatus where tokenRevealed=false)`。
- `count(SeriesRevealSummary) == distinct fulfilled series count`。
- `sum(SeriesRevealSummary.proofCount) == fulfilled/sent-with-series count`。
- `sum(SeriesRevealSummary.tokenCount) == sum(RevealDrawSent.revealTokenCount)`。

實際查詢與自動比對工具：

- GraphQL operations：`scripts/parity-gate/queries.graphql`
- 執行器：`scripts/parity-gate/run.mjs`

```bash
OLD_GRAPH_URL="https://old-endpoint.example/query" \
NEW_GRAPH_URL="https://new-endpoint.example/query" \
npm run parity-gate
```

如果 endpoint 需要 Bearer token，可另外設定 `OLD_GRAPH_AUTH_TOKEN` 與 `NEW_GRAPH_AUTH_TOKEN`。工具預設從兩邊共同已索引高度往前保留 64 blocks，再用該高度取得並核對相同 block hash；也可用 `PARITY_BLOCK_NUMBER` 指定比較高度，或用 `PARITY_FINALITY_BLOCKS` 調整保留 blocks。

工具會以每頁 1,000 筆、`id_gt` cursor 讀完所有資料，並同時比對舊／新 endpoint 的基礎 entity 集合、每個 series 的 unrevealed count、proof/token occurrence、latest proof 與 projection relation。全部通過時輸出 `"status": "PASS"` 並以 exit code `0` 結束；任何差異會輸出 `FAIL` 與前 10 筆差異，exit code 為 `1`。

部分 Studio gateway 在指定歷史 block number 時會回傳 `_meta.block.hash = null`。Parity gate 仍先保留 finality blocks；若兩端都提供 hash，會以 hash pin 並核對 hash；若任一端不提供，則改以相同 finalized block number pin，並在報告的 `warnings` 與 `comparisonBlock.pin` 明確標示降級模式，避免預設 gate 因 gateway 能力差異直接中止。

2026-07-11 現網唯讀基準為 144 筆 fulfilled proof、13 個 series、356 個 token occurrences；沒有 missing sent、duplicate occurrence 或 latest timestamp tie。此基準只能用於切換前後比對，不代表新 deployment 已完成驗證。

## 建議監控

- Graph calls／API request 與 fallback ratio。
- Graph p50／p95／p99 latency、timeout、429、5xx、GraphQL execution errors。
- Cursor pages／request 與 pinned-block retry 次數。
- Runtime projection miss、capability fallback、legacy query 使用率。
- Backend endpoint 的 reveal index、series realtime、reward list 與 reservation p95。
