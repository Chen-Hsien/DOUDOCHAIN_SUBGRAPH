# 固定機率主網索引準備紀錄

2026-10-31 的本機準備以 `b9e6e9e772b51a8bf509f373d429126ecd12a973` 為基底。`git fetch origin develop` 與 `git merge origin/develop` 通過，基底沒有前進。

`config/fixed-probability-buyback-deployments.json` 新增 Arbitrum One UUPS 部署列，完整保留 proxy receipt、runtime hash、implementation、三個 library 與 ABI digest。資料與本次提供的 `prepared-mainnet-context.json.graphDeployment`、`mainnet-contract-evidence.json` 逐欄一致。

| 網路 | 產生的 native datasource | 起始區塊 |
| --- | --- | --- |
| Arbitrum One | `FixedProbabilityBuyback_8fc4977a5a999db2efaccd1ecea090a542a61723` | 520016196 |
| Arbitrum Sepolia | `FixedProbabilityBuyback_51a9f7f467498fee72efbe37043897a3c225f235` | 319353178 |

One 產生 14 個 datasource。Sepolia 維持 15 個，含既有 marketplace `0x07Aa693Cdc2f7Adf20635bebed26fA9Db00F4954`，起始區塊 271876629。兩網原有 13 個 Core datasource 的地址與起始區塊保持不變。One 沒有新增 marketplace linkage。

Registry 的 `protocolVersion=1` 表示 native buyback 合約協定。Datasource context 的 `protocolVersion="3"` 表示固定機率產品版本。兩者保持原語意。`config/fixed-probability-deployment.json` 與 retired `FixedProbabilityLottery` 防護沒有改動。

以下本機驗證通過。

- `npm run test:deployment` 通過 42 項。
- `npm run test:fixed-probability-parity` 通過 8 項。
- `node scripts/validate-network-config.mjs arbitrum-one` 與 `arbitrum-sepolia` 通過。
- `npm run codegen`、`npm run build:test`、`npm run build:prod` 通過。
- `node scripts/prepare-matchstick.mjs` 與 `node_modules/.bin/graph test fixed-probability --version 0.6.0 --recompile` 通過 23 項，包含 metadata、native burn 與 UUPS upgrade 測試。
- `node_modules/.bin/graph test buyback-marketplace --version 0.6.0 --recompile` 通過 1 項。
- 產生的兩網 manifest、resolved network config 與編譯後 manifest 均符合上述 proxy、chainId、startBlock 與產品 context。

這次沒有部署、上傳 IPFS、修改 endpoint、production CID 或部署歷史，也沒有重新查詢線上 RPC 或索引端點。編譯與 fixture parity 通過不代表 production 已索引新 proxy。後續獲授權部署時，仍須通過既有分支、乾淨 worktree、RPC runtime 與 receipt gate，保存實際發布 CID，核對線上 schema、同步區塊、native proxy 覆蓋與事件 parity。主網 marketplace linkage 必須另取得證據。
