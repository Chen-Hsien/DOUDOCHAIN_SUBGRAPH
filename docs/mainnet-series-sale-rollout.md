# Arbitrum One 販售期限索引

正式 Studio slug 是 `doudochain-v-2`。網站、API 和 worker 使用現有 Subgraph ID `HS4oauJ4GSxNUroWB8bE85ER2GU4X5apckyaaGSkUYCK`。本次 mapping 可以從原有代理和起始區塊重建，並索引升級後的事件。

## 預先同步

1. 從已整合下架與 Coupon V2 的版本執行 `npm run build:prod` 與 `npm run test:deployment`。確認兩種玩法都有 SeriesSaleScheduleChanged handler。正式 RPC 必須能讀取配置中的歷史部署收據與代理 runtime。
2. 在鏈上升級前，依正式發布授權從 main 執行既有 Deploy Subgraph workflow，選 prod 與唯一版本標籤。保存 workflow 的 deployment-history artifact，從已接受的那次部署取出 CID。部署到 Studio 後，舊 Gateway 可繼續提供舊版查詢。
3. 將 `ARBITRUM_ONE_RPC_URL` 與 `THEGRAPH_PROD_QUERY_URL` 由 secret store 傳入驗證程序。在 Studio 先用此次版本的端點與 CID 執行 `npm run verify:mainnet-sale-index -- "$CID"`。這會在主網已 finalized 的區塊實查兩種系列、新欄位、區塊 hash 與索引健康度。預先同步不需要先升級合約。
4. 經正式發布授權後，把已核對的同一個 CID publish 至原 Subgraph ID。改以正式 Gateway 作為 `THEGRAPH_PROD_QUERY_URL` 重跑上一步。Gateway 在重建期間可能回舊版，驗證命令遇到舊 CID 或缺欄位會失敗。維持站上舊查詢，直到正式 URL 通過檢查。

## 升級與營運驗收

- 正式升級後，使用真實主網收據更新 `config/fixed-probability-buyback-deployments.json` 的 42161 紀錄。將原 implementation 和 libraries 保存到 implementationHistory，填入 supersededAtBlock 與升級交易。更換現行 implementation、libraries 的部署地址、交易、區塊及 runtimeHash，保存升級交易與區塊 hash。代理地址、代理起始區塊、歷史索引 ABI 的身份皆沿用原紀錄。此登記影響後續部署的 runtime 預檢；現有 mapping 已監聽代理事件。
- 由營運安排一般與固定機率各一筆實際設定排程的交易，等待 finalized。將收據的**排程交易**分別帶入下列命令。程式核對收據和事件來源、指定區塊的 getter 與 Graph 實體的截止、修訂版和提前停售狀態，成功後保留輸出的 JSON。

```sh
npm run verify:mainnet-sale-index -- "$CID" "$CORE_SCHEDULE_TX" "$FIXED_SCHEDULE_TX"
```

若只有 schema 驗證通過，發布紀錄應標成「索引與鏈高已確認」。兩筆排程交易核對成功後才標成「兩種玩法寫入與索引一致」。若索引還落後，讓 worker 依既有策略重試，並保留買家端相容查詢。
