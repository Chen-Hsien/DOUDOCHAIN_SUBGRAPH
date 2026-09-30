# 固定機率抽獎 V3 索引與驗收

更新：2026-09-30。V3 合約與初版 subgraph v3.0.0 已部署至 Arbitrum Sepolia；本 PR 的免單會員快照修正仍需部署。沒有真實 V3 購買／揭獎／兌換聯合驗收，不能把離線測試當成實網交易證據。

## 資料契約

測試來源：Arbitrum Sepolia，chainId 421614，FixedProbabilityLottery 位址 0x745Cb4540696Cf67a453aA3cE301CA50e1239fc5，部署起始區塊 313999040。

固定機率事件與既有一番賞分開投影。系列保存完整 17 欄設定和原始 flat configData；訂單最多 10 抽，每抽一個 Draw，購買交易立即每抽鑄一張 NFT，VRF callback 揭露同一批 NFT。prizes 的權重固定，不提供剩餘獎品數量。

- EligibilityConsumed 可以先於 OrderRequested；暫存關聯後在相同交易內綁定。
- 所有 DrawSettled 到齊才接受 OrderSettled；可重複中同獎，多個免單命中仍只退整筆折後金額一次。
- Transfer 決定 currentOwner；mintRecipient 保存原始購買者，開獎歷史不隨 NFT 轉讓消失。V3 不需要獨立領取 NFT。
- 會員消費於購買記錄，免單於帳務結算沖銷。付費免單保留購買時的會員等級／到期快照，只有最終 reward 歸零。會員事件仍由既有 template 索引，不重複計算總額。
- Graph 不提供平台 ledger 已退點、VRF 已驗證或鏈外新會員身份已驗證的結論。
- 所有新 ID 含 chain/address namespace；數值 ID 左補零 78 位，鏈上 uint256 與金額不經浮點數。

## 環境隔離

共用 subgraph.yaml 保留原來源。scripts/target-manifest.mjs 只替 arbitrum-sepolia 合併 config/fixed-probability-source.yaml；主網不含本來源。codegen、build、deploy 與 validator 使用相同目標 manifest。

新 source 的 ABI hash、13 個事件形狀、地址、部署 receipt、startBlock 與具名 context 必須符合 config/fixed-probability-deployment.json。未來主網部署需另行提供真實部署證據，不能填零地址或關閉 gate。

## 本地驗證

依序執行：

    npm run test:deployment
    npm run codegen
    npm run build:test
    npm run build:prod
    npm test
    npm run test:fixed-probability-parity

本次 V3 focused Matchstick 8 項、部署安全測試 13 項與 parity 工具離線測試 8 項通過。Parity 覆蓋 pending 已鑄 NFT、callback settled、尚未 finalized 的預期淨消費、付費免單、轉讓與兌換，並包含錯誤資料負斷言。

## 候選版與 RPC parity

只在已有候選 endpoint 時執行：

    npm run parity:fixed-probability

需透過環境提供 ARBITRUM_SEPOLIA_RPC_URL、NEW_GRAPH_URL、FIXED_PROBABILITY_SUBGRAPH_DEPLOYMENT（實際 CID）、PARITY_BLOCK_NUMBER（十進位整數）；端點需要認證時提供 NEW_GRAPH_AUTH_TOKEN。工具不讀寫 .env，不打印 URL/token，不提交任何交易。

工具固定一個 canonical block hash；每一頁查詢連同 _meta 核對 CID／block／errors，全部 eth_call 使用同一 blockHash + requireCanonical。RPC 不支援該查詢或歷史資料不可用即失敗，不改用 latest。

Read ABI 獨立存於 abis/FixedProbabilityLotteryV3Read.json，取自 V3 編譯 artifact；manifest 仍使用 events-only ABI。核對全部系列設定與 V3 configHash、訂單狀態／words／金額、所有即時鑄造 NFT、owner／exchanged 與 scope mappings；僅在手動 parity 執行期間從部署區塊分段讀取 manifest 追蹤的 13 類 logs，比對每筆 audit 的完整參數、交易、logIndex、區塊與 timestamp，並核對總數及缺漏。執行前後再次核對 snapshot，遇重組失敗。

輸出 projectionParity 僅指該區塊索引與 RPC 一致；若沒有訂單，coverage=NO_ORDERS，不能當成端到端購買驗收。vrfVerified、ledgerVerified、legacyParityVerified 一律 false。工具不是 VRF 密碼學驗證器、財務 finality gate 或付款 worker。

舊固定機率 V2 測試資料已由使用者明確排除保留／遷移；一般系列資料仍要另外執行原 npm run parity-gate，在同一 PARITY_BLOCK_NUMBER 核對 OLD_GRAPH_URL 與 NEW_GRAPH_URL。兩份報告均通過且具實際訂單覆蓋，才可提出切換 endpoint 的交付；本輪尚未執行。

## 消費端

Backend 使用新 FixedProbabilityGraphClient，同快照 keyset cursor；buyer、resource、部署 CID、lastId 與 blockHash 均受 HMAC 綁定。Admin／Frontend 只經 backend 查詢，Graph token 不進瀏覽器。

新增 GET /v1/fixed-probability/orders/:id/verification-data 將訂單與完整系列放在同一快照，供前端重算；不是完整 proof-v2。正式金流、授權、到期保留釋放、會員資格與退款仍由 RPC／DB 處理，不能用 Graph 查無資料來重送交易或退回保留。

## 尚待實網驗收

- 本 PR mapping 部署與索引健康；既有會員 template 的歷史建立事件仍需保留。
- 真實候選端點 GraphQL／RPC parity 與舊資料零非預期差異。
- Graph Node 的重組／pruned snapshot 整合測試（現有 client fixture 只驗錯誤處理）。
- 四端完整購買、退款、會員、NFT、VRF 實網流程。


## 買家領取復原邊界（2026-09-26）

Backend 的 claim operation retry／cancel 是鏈下交易協調，不產生新抽獎、新 drawId 或 NFT。retry 僅在原交易 canonical finalized revert 後沿用原 NFT 清單；cancel 僅撤銷可證明未送出的操作。索引仍完全依 PrizeClaimed／Transfer 更新 draw claimed、原 recipient 與 NFT 當前 owner；不能因 API 回傳重試成功就先行新增 NFT。私人 recoveryJson／授權不進 Graph。

本次沒有修改合約事件、schema、mapping、startBlock 或 endpoint，因此沒有重跑 Matchstick／codegen／build；上列 61 個 Matchstick 是既有驗證結果。候選部署及真實 RPC parity 仍未執行。

本輪另重跑 13 個部署安全測試與 6 個 parity 工具離線測試，全部通過；不代表候選端點實網 parity。


## Proof-v2 事件定位查詢（2026-09-26）

Backend 新增 FixedProbabilityProofLocators query，在同一 pinned block 讀 order.createdEvent、series.createdEvent、randomnessEvent、settledEvent、accountingEvent 及 draws(first:10) 的 claimEvent。只輸出 transactionHash／blockNumber／blockHash／logIndex；audit.parameters 不當原始 receipt。Backend 重新查 canonical finalized RPC，前端另外選 RPC 再核對；Graph 缺位置時匯出會保留缺漏，不能把合成事件補進去。

所需 relations 已存在 schema／mapping，不需新 coordinator data source 或重建 schema。此輪新增 consumer query 的快照／上限／欄位測試；沒有 codegen／build／Matchstick、候選部署或實網 parity。原 61 Matchstick 仍是先前結果。

## 會員歷史與營運撤回的來源邊界（2026-09-26）

會員交易歷史以獨立 RPC trace／prestate 與固定 implementation runtime 核對；Graph 的有效等級或目前會員狀態不作歷史 proof。Backend 的發布撤回只發生於交易建立之前，保留 DB workflow／audit，不產生 SeriesCreated、SeriesStatusChanged 或虛構的取消事件。鏈上已發生的狀態仍由原 mapping 索引。

本輪 24 項跨 repo 共用 artifacts 比對一致；沒有更動 schema／mapping／manifest／startBlock／endpoint，因此沒有新增 codegen／build／Matchstick 結果。候選部署、reindex、實網 RPC parity 及 Graph Node reorg 仍未執行。
