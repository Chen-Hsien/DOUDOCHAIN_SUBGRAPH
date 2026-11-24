# DOUDOCHAIN Subgraph Agent Guide

## Sync and ownership

- Remote sync is explicitly waived for this task. For later implementation, fetch and merge the task base branch before editing; if no usable remote exists, stop and report it unless the user waives sync again.
- This repo owns `schema.graphql`, mappings, generated types, `subgraph.yaml`, and indexed query semantics. Contracts own emitted chain facts; backend owns orchestration; Admin and frontend consume indexed state.
- Known roots: contracts `/Users/angustsai/ICHICHAIN_CONTRACT`, backend `/Users/angustsai/doudochain-backend`, admin `/Users/angustsai/doudo-admin`, frontend `/Users/angustsai/ichichain`.

## Discovery and safety

- Start from known schema, mapping, tests, and manifest paths; use scoped `rg` only for unknown symbols. Do not rediscover the system with broad home-directory searches.
- Treat events and chain state as the source of truth. Do not compensate for a missing or incorrect event only in a consumer query.
- Backend `.env` may name endpoints or chain configuration; never print secrets. Write new specifications in Chinese unless requested otherwise.

## Indexing and cross-layer changes

- For contract or workflow changes, trace `contract event → mapping → entity → GraphQL query → backend/frontend consumer`. Update ABI, manifest handlers, schema, mappings, generated types, and consumers together when applicable.
- Preserve event and entity compatibility. Search for legacy event names, fields, IDs, and query shapes before and after a change.
- For materialized runtime or metadata projections, define the expected event-to-entity contract and add fixtures for normal, edge, and legacy paths. Use a parity check before replacing a production query path.
- Keep query semantics explicit: cursor pagination for unbounded collections, stable ordering, and pinned blocks when one response combines related reads.

## Verification

- After coherent changes, run relevant code generation, `graph build`, focused Matchstick tests, and a sentinel search for the repaired failure class. Verify the deployed endpoint separately from local tests when deployment is in scope.
- Do not deploy, republish, change endpoints, or alter start blocks without explicit user authorization. Report any deployment, reindex, or parity verification not performed.

## Agent skills

### Issue tracker

Work is tracked in GitHub Issues for `Chen-Hsien/DOUDOCHAIN_SUBGRAPH`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default canonical triage labels. See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses single-context subgraph documentation with explicit cross-repository ownership boundaries. See `docs/agents/domain.md`.

## Feature 開工與合併

- 收到明確的新功能實作要求時，先在 DoudoChain 相關 repo 查重。沿用符合需求的未結案 GitHub Issue，或建立新票；讀回確認票號、網址和 open 狀態後，才建功能分支或改程式。只有討論或估工時可先做唯讀調查。若無開票權限，先回報阻礙。
- 跨 repo 的同一功能共用一張主票，其他需要修改的 repo 各自建立或沿用工作票，以 GitHub 原生 sub-issue 掛回主票。票面用繁中寫交付目標、驗收條件及涉及 repo，以獨立行寫「狀態：」與「下一步：」。有明確行動者或日期才填「下一步負責人：@登入名」或「回報日：YYYY-MM-DD」。團隊現有的 Slack 交付看板會從 GitHub 同步。
- 功能分支帶本 repo 票號，功能 PR 標題用 `feat: …`。PR 說明獨立一行寫 `Ticket: Chen-Hsien/DOUDOCHAIN_SUBGRAPH#NUMBER`，替換成該 repo 的有效未結案工作票。主票承接本 repo 實作時可直接填主票。草稿、修改說明和後續推送都沿用此格式。
- 未分類的 PR 預設須綁票。純修正、文件、維護等可用 Conventional Commit 類型如 `fix:`、`docs:`、`chore:`。含新功能的混合 PR 一律按 feature 處理。關票或重新開票後 GitHub 會重驗涉及的未合併 PR。
