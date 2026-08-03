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
