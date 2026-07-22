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
- `networks.json` 與 `config/deployment-evidence.json` 的 13 個 data sources 全部完成

## 指令

```bash
npm run build:test
npm run build:prod
npm run deploy:test
npm run deploy:prod
```

`build:prod` 在 production address、startBlock 與 deployment transaction 尚未完成前會失敗。正式 deploy 還會用 Arbitrum One RPC 驗證 chain ID、receipt 成功狀態、receipt block 與 startBlock，以及合約地址目前是否有 bytecode。

## GitHub 設定

建立兩個 GitHub Environments：

- `test`：secrets `THEGRAPH_DEPLOY_KEY`、`ARBITRUM_SEPOLIA_RPC_URL`
- `production`：secrets `THEGRAPH_DEPLOY_KEY`、`ARBITRUM_ONE_RPC_URL`，並啟用 required reviewers，只允許 `main`

保護 `main`，要求 PR 與 `Subgraph CI` checks 通過。部署 workflow 僅支援手動 `workflow_dispatch`，不會因 push 自動部署；test 必須從 `develop`、production 必須從 `main` 觸發，且兩者都要求 clean worktree。
