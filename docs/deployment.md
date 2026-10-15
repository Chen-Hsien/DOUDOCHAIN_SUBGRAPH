# Arbitrum Subgraph 雙環境部署

本 repo 共用 schema、mappings、ABI 與測試，但部署到兩個獨立的 The Graph Studio projects。

| 環境 | Git branch | Network | Studio slug |
| --- | --- | --- | --- |
| 測試 | `develop` | `arbitrum-sepolia` | `doudochain-arb-v-2` |
| 正式 | `main` | `arbitrum-one` | `doudochain-v-2` |

Slug 與 network 固定在 `scripts/run-environment.mjs`，不可由環境變數覆寫。`subgraph.yaml` 是不可變的來源 manifest；build/deploy 只會修改被 Git 忽略的 `.subgraph.<network>.generated.yaml`。

## 本機環境

從 `.env.example` 建立不進 Git 的 `.env`。不要把 deploy key、含 token 的 RPC URL 或其他秘密提交到 repo、README、issue 或對話。

測試部署需要：

- `THEGRAPH_TEST_DEPLOY_KEY`
- `THEGRAPH_TEST_VERSION_LABEL`：semver（例如 `v1.2.3`）或 7–40 字元 Git SHA
- `ARBITRUM_SEPOLIA_RPC_URL`：驗證 chain ID `421614` 與 13 個合約地址的 bytecode

正式部署另外需要：

- `THEGRAPH_PROD_DEPLOY_KEY`
- `THEGRAPH_PROD_VERSION_LABEL`
- `THEGRAPH_PROD_CONFIRM=doudochain-v-2@arbitrum-one`
- `ARBITRUM_ONE_RPC_URL`
- 目前分支為 `main`
- Git worktree 完全乾淨
- `networks.json` 與 `config/deployment-evidence.json` 的 13 個 data sources 必須與正式部署一致

## 指令

```bash
npm run build:test
npm run build:prod
npm run deploy:test
npm run deploy:prod
```

`build:prod` 會先驗證 production address、startBlock 與 deployment transaction 是否完整。正式 deploy 還會用 Arbitrum One RPC 驗證 chain ID、receipt 成功狀態、receipt block 與 startBlock，以及合約地址目前是否有 bytecode。

## 部署履歷與驗證證據

`deploy:test` / `deploy:prod` 在分支、乾淨工作區、codegen、network configuration 與鏈上檢查通過後，會自動建立：

```text
.deployment-history/<test|prod>/<UTC時間-UUID>/
  record.json
  snapshots/
    source-manifest.yaml
    generated-manifest.yaml
    schema.graphql
    networks.json
    resolved-networks.json     # CLI 實際使用的完整目標 network，包含原生 UUPS 與市場
    package.json
    package-lock.json
    src/、abis/、config/
    compiled/                 # 編譯後 manifest、schema、ABI、WASM
  verification-<UUID>.json     # 每次線上觀察另存一份，可能有多份
```

`record.json` 保存目標 network / Studio slug、version label、實際 Git commit、branch、clean 狀態、Node / Graph CLI 版本、檢查項目與結果，以及每個快照檔案的 SHA-256。秘密環境變數、deploy key、RPC / query URL、HTTP headers 與原始遠端錯誤不會寫進履歷。

發布順序為 `graph build --ipfs` → 解析 manifest CID → 保存 CID 與編譯產物 → `graph deploy --ipfs-hash <同一個CID>`。Deployment ID 取自固定版本 Graph CLI 的 manifest build 結果，不取 ABI/WASM CID，也不從可能仍指向舊版的 query endpoint 猜測。`compiled/subgraph.yaml` 是 CLI 寫出的本地編譯 manifest，其檔案路徑仍為本地相對路徑；線上 manifest 的內容識別碼另存於 `deploymentId`。

| 履歷狀態 | 意義 |
| --- | --- |
| `prepared` | 本地檢查已通過，尚未完成上傳 |
| `build_or_upload_failed` | CLI 編譯／上傳失敗，未送出發布請求 |
| `artifact_capture_failed` | 未能取得唯一的 manifest CID 或完整保存證據，停止發布 |
| `uploaded` | CID 與產物已保存；若程序在此中斷，遠端是否受理仍須查核 |
| `deployment_accepted` | Studio 發布命令成功，尚不代表索引完成 |
| `deployment_unconfirmed` | 發布回應失敗或中斷，可能已被遠端受理，不應盲目重試 |

本機履歷被 Git 忽略，不會造成下次發布的 clean-worktree 檢查失敗。GitHub 部署 workflow 即使失敗也會上傳 `.deployment-history/`，artifact 名稱含環境、run ID 與 run attempt，設定保留 90 天。需長期保存的履歷應在到期前下載歸檔；artifact 到期後，不能依賴 Actions 再取得這份證據。不同 runner 的歷史不會自動合併；比對舊版時先下載對應 artifact。

### 查核線上實際版本

在 `.env` 設定 `THEGRAPH_TEST_QUERY_URL` 或 `THEGRAPH_PROD_QUERY_URL`，指向要驗證的確切版本 endpoint。CI 可在各 GitHub Environment 設定 secret `THEGRAPH_QUERY_URL`。設定存在時，發布成功後會自動做一次 `_meta` 觀察；新版本尚未可查時會保存失敗紀錄，不會把已受理的部署誤判為發布失敗，也不會自動等待同步或更換 endpoint。

之後可重複執行唯讀驗證；以下路徑需替換成實際 attempt 目錄：

```bash
npm run deployment:verify -- test .deployment-history/test/<attempt>

# 在選定區塊驗證，區塊號碼僅為範例
npm run deployment:verify -- test .deployment-history/test/<attempt> 320000000
```

驗證器先核對履歷目標與全部快照雜湊，再查詢 `_meta`。只有 Deployment ID 完全相符、`hasIndexingErrors` 明確為 false、區塊號碼與 hash 格式正確，且指定區塊時回傳高度吻合，才記為 `healthy_observed`。否則保存固定失敗原因，CLI 以非零狀態結束。每份觀察包含當時 `record.json` 的 SHA-256；反覆查核不覆寫先前觀察或部署紀錄。

`healthy_observed` 僅證明該版本在觀察時可查詢；不證明已追上鏈頭、finality、完整資料 parity，或部署環境一定能 graft。`indexing` / `syncCompletion` 與 `graftEligibility` 保持未驗證／未評估，避免誤用。

### 作為後續 grafting 的基準

本次加入履歷保存與唯讀驗證，尚未加入自動選取 graft base、schema 相容分析或歷史語意判斷，也不會自動改動 manifest 的 `graft` / `startBlock`。後續比對應以「已用 `_meta.deployment` 對上的履歷」為基準，檢查 schema、mapping、entity ID、事件涵蓋範圍、指定區塊保留狀態與環境可用性，再決定是否沿用。

舊部署若沒有可靠的 commit / schema / manifest 對應證據，不能把目前 HEAD 當成舊版來源補登。從新流程開始累積可信履歷；先前部署仍需獨立還原與核對。

正式部署中 `ICHICHAIN` 與 `RevealOnChainData` 共用 Core proxy；`DoudoCoreVRFRouter` 與既有相容 data source `DoudoVRFRouter` 共用同一個正式 Router。

## 2026-09-15 Buyback 正式部署

- 新 Buyback proxy：`0x876668Ae85a7656434641F0CE51e55cf1b4F04aE`，部署區塊 `505136483`。
- Core proxy：`0x4749289F940F0C6B7cf68A19b0BDc611b80cdb0A`，`MODULE_ROLE` 授權區塊 `505136506`。
- 完整交易紀錄位於 `config/buyback-deployment.json`；合約來源為 main `1fbd7f2`，backend 地址更新為 `35254e1`。
- Buyback 使用 `PrizeBuybackModule` 動態 template。Core 的 `RoleGranted` handler 驗證 `core()` 與 `MAX_BATCH_SIZE()` 後，建立 `PrizeBuybackModuleRegistration` 並開始索引 `PrizeBuybackBurned`。不要額外加入相同地址的靜態 data source，以免重複處理。
- Core、Bundle、Redraw 的 proxy 均未變更；本次 implementation 升級不替換 `networks.json` 的 proxy 地址，也不改動既有 startBlock。Core 從 `488650672` 重播，涵蓋此次授權事件。
- 正式部署前會核對 Buyback 部署 receipt、Core 授權 log，以及授權區塊上的 `core()` / `MAX_BATCH_SIZE()`，避免部署成功但未註冊 template。
- 部署後查詢 `_meta` 的錯誤與索引高度，並確認 `prizeBuybackModuleRegistration(id: "0x876668ae85a7656434641f0ce51e55cf1b4f04ae")` 的 core 與 blockNumber。索引尚未到 `505136506` 前不能宣稱 Buyback 已就緒。

## GitHub 設定

建立兩個 GitHub Environments：

- `test`：secrets `THEGRAPH_DEPLOY_KEY`、`ARBITRUM_SEPOLIA_RPC_URL`
- `production`：secrets `THEGRAPH_DEPLOY_KEY`、`ARBITRUM_ONE_RPC_URL`，並啟用 required reviewers，只允許 `main`

保護 `main`，要求 PR 與 `Subgraph CI` checks 通過。部署 workflow 僅支援手動 `workflow_dispatch`，不會因 push 自動部署；test 必須從 `develop`、production 必須從 `main` 觸發，且兩者都要求 clean worktree。

## 2026-10-15 固定機率 UUPS staging 部署

- Arbitrum Sepolia 新 Proxy：`0x51a9f7f467498fee72eFBe37043897A3c225F235`，起始區塊 `319353178`，交易 `0x22ec35535f7e054ce484f5dfb17524e9974ce61d2b122eabce89cd6ebe629aea`。
- Implementation：`0x0213973159DC44e9AfDB04eeD6a9e4f8F42d8975`；完整 proxy / implementation / library / marketplace 證據保存在 `config/fixed-probability-buyback-deployments.json`。
- 舊 V3 `0x745Cb4540696Cf67a453aA3cE301CA50e1239fc5` 的 source / startBlock 保留；舊合約的 5 個系列不搬移、不改寫。
- 市場是 Thirdweb factory 建立的 clone，起始區塊 `271876629`。驗證 creation receipt 成功狀態與區塊、factory `ProxyDeployedV2` 的 emitter / proxy / implementation，以及建立前無 code、建立當下與目前 runtime hash 一致；不接受沒有建立事件的普通呼叫 receipt 冒充部署證據。
- 本次線上基底 `Qme5rJfEMBcy5iHFpa5bq6AYCiCrjfAeSBoSZgHffLPL83` 的 schema CID 為 `QmWtAejLFgZdmwPKFiUeXGXj1PDGmvw8M91P9yVAy4kFLi`，確認沒有 `burned`。新版本加入 `burned: Boolean!` 並新增市場歷史，不能沿用近期基底跳過回補；本次完整重建，不設定 graft。
- CLI 使用 `.networks.<network>.generated.json`，由通過驗證的基本配置與原生部署證據組成，避免 native source 已加入 manifest 卻不在 CLI network file 中。
- 索引追上與市場資料覆蓋驗證完成前，Backend 的原生回收 registry 必須保留 `enabled=false`、`marketplaceIndexReady=false`。不能將發布已受理當成可以簽回收授權。
