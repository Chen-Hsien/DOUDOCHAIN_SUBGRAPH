# Domain Docs

## Before exploring, read these

- **`CONTEXT.md`** at the repo root.
- **`docs/adr/`** entries that touch the area of work.

If these files do not exist, proceed silently. `/domain-modeling` creates them when terms or decisions are resolved.

## File structure

This is a single-context repository: root `CONTEXT.md` plus `docs/adr/`.

## Cross-repository ownership

- This repository owns `schema.graphql`, mappings, generated types, `subgraph.yaml`, and indexed query semantics.
- Contracts (`/Users/angustsai/ICHICHAIN_CONTRACT`) own emitted chain facts.
- Backend (`/Users/angustsai/doudochain-backend`) owns orchestration.
- Admin (`/Users/angustsai/doudo-admin`) and frontend (`/Users/angustsai/ichichain`) consume indexed state.

For cross-layer defects, trace `contract event → mapping → entity → GraphQL query → consumer` and fix the source of truth.

## Use the glossary's vocabulary

Use terms defined in `CONTEXT.md` in issue titles, refactor proposals, hypotheses, and tests. Flag ADR conflicts explicitly rather than silently overriding them.
