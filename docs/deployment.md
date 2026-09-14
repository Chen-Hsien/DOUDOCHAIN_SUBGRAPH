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
