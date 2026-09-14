# 正式站系列 72 metadata 置換造成索引停止

## 已查證的原因

- 正式 subgraph：`doudochain-v-2`，Arbitrum One，版本 `1dc424ab594c`。
- Deployment：`QmZeqQsr6MYf96f82bqFzwAvU5aWBbTwmtEjRTXrtZqGM6`。
- Studio 日誌：https://thegraph.com/studio/subgraph/doudochain-v-2/logs
- 首次失敗：2026-09-10 01:21:15 台灣時間，區塊 `503435617`。
- `RevealTokenMetadata` INSERT 違反 `reveal_token_metadata_id_block_range_excl`；ID 為 `0x37325f7375625072697a655f37`、`0x37325f7375625072697a655f34`，即 `72_subPrize_7`、`72_subPrize_4`。
- 後續到 attempt 13 都是 `subgraph writer poisoned by previous error`，不是新的根因。
- Gateway 三個 indexer 回報 latest `503435614`、`503435616`、`503435647`；查詢較新區塊會回 `Unavailable(missing block)`。`_meta.hasIndexingErrors=false` 不能當成同步正常的依據。

已透過正式 Arbitrum RPC 解碼成功 receipt：

| 事件 | 區塊 | 交易 |
| --- | --- | --- |
| NewSeries，系列 72「吉伊卡哇 文具」 | 497261842 | `0x24dc13da5242421772ad28d9fbb99135627a2324ab2305d6d4abf73e7f7a6f55` |
| UpdateSeriesInformation，置換 metadata | 499533390 | `0x20abd34c06cc860732a8cd136dbca5adec7528e8050ede5c5dab57fc3d0331c2` |

舊 reveal CID：`QmQRNRr5mhvVoXT5FangUyeSqJekCu5xfmiGzst2vBpvkb`。
新 reveal CID：`bafybeihcbkxsu26jtwufaqdkd2cjlhgswoxladgupilyzrodkr2vqjzs7y`。

新舊 `/4`、`/7` JSON 均已 HTTP 200 取回，保存在 `tests/fixtures/series-72-reveal.ts`。子賞 4 名称由「吉伊卡哇 木頭鉛筆 2B 黃」改為「吉伊卡哇 木頭鉛筆 2B 藍」；子賞 7 內容不變，但完整 CID/path 不同。原 handler 的 ID 不含 CID，所以兩個 file source 各自建立相同 ID，造成資料庫衝突。錯誤發生在非同步 file source 寫入階段，因此不必與置換交易位於同一區塊。

The Graph 官方規則：file source entity 在各來源間隔離，不能把跨來源 `.load()` 當作更新或去重；需要以 IPFS hash 與 entity ID 組合區分版本。
來源：https://thegraph.com/docs/en/subgraphs/developing/creating/advanced/#ipfsarweave-file-data-sources

## 修復契約

1. `RevealTokenMetadata.id` 改為 `Bytes.fromUTF8(seriesID.toHexString() + ':' + subPrizeID + ':' + fullIpfsPath)`，完整保留 CID、目錄及子賞路徑，包含 `/999`。
2. File-owned metadata 為 immutable，保留舊版與新版，新增 `ipfsPath` 供追溯。
3. Chain-owned `RevealTokenMetadataSource` 記錄已註冊來源。同版重複 NewSubPrize／NewTicketStatus／UpdateTicketStatus 不再註冊；換回舊 URI 會重用舊來源。
4. `UpdateSeriesInformation` 的 reveal path 有變時，載入該系列鏈上子賞及票券，建立新來源並更新票券關聯。來源抵達順序不會把新關聯改回舊版。
5. 保留擁有者、揭曉時間、交換狀態、數量與事件歷史。關聯只由鏈上事件決定，不從 file handler 修改鏈上 entity。
6. 缺 URI、非 IPFS URI、子賞 0 不製造無效來源或懸空 metadata 關聯；補正 URI 後可修復既有票券。不同 gateway 指向同一 CID/path 視為同版。
7. 此次未改 unreveal 路徑處理：其原 ID 已含 hash，且系列 72 的 unreveal URI 未變。Series metadata 的 ID 同樣已含 hash。

## 消費端與部署

Backend `packages/graph/src/{index,rewards,nft-procurement}.ts` 與 frontend `lib/apollo/api/{token,doudo-market}` 使用 `revealMetadata { name image ... }` 關聯，未發現硬編碼 `series_subPrize` ID；既有欄位仍保留。票券既有 API 欄位不需變更。

本次 schema/entity ID 改變，需要新 deployment **從既有正式 startBlock 重建索引**；不能把故障部署當 graft base，也不能跳過錯誤區塊或回退 metadata 來掩蓋問題。

發布前依 `docs/deployment.md` 使用 main、乾淨 worktree 與正式設定。維護保持 PAUSED，待新版本同步跨過 `503435617` 並接近 head，再檢查系列 72 子賞 4／7、票券關聯、`/999` 與 gateway實際 deployment。Studio 部署及去中心化網路 publish 是不同步驟，單純 build 或 deploy 不代表正式 gateway 已換版。

## 測試邊界

Matchstick 回歸測試使用真實新舊 metadata，驗證版本共存、舊 ID 不再產生、舊檔晚到、操作補正、gateway 別名、重複事件、換回舊 CID、缺 URI、子賞 0、LAST PRIZE 999 與票券歷史欄位。Graph build 驗證正式 manifest 與 AssemblyScript。

Matchstick 不是正式 Graph Node/PostgreSQL，不能宣稱已在本機重現其 SQL exclusion constraint。正式修復完成仍以新 deployment 的實際索引及 consumer 查詢驗證為準。

本地結果（2026-09-10）：
- `npm run codegen`、`npm run build:prod` 通過。
- Matchstick 0.6.0 原生 macOS runner：全部 40 tests 通過。
- `npm run test:deployment`：7 tests 通過。
- 暫時還原舊 ID 算法後，新回歸套件 5 failed / 1 passed；恢復修正後 6/6 通過，證明測試會攔截此次失敗格式。
- `git diff --check` 通過；src 不再出現 `_subPrize_` 舊 ID 或 `RevealTokenMetadata.load` 跨 file source 讀取。
- 尚未部署、publish、重建正式索引或解除維護。
