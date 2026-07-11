# Design Discussion: Crispify PipPaper

> CRISPY-V Phase 3 — HUMAN CHECKPOINT
> Mode: crispify (extract contracts from existing code)
> The contracts below are DESCRIPTIVE (what the code does), not PRESCRIPTIVE.

---

## Current State

PipPaper is a trade journaling platform with ~5k lines of Deno/Fresh code. It works, has users, and has no formal contracts. Data flows:

```
Tradovate CSV → ImporterService → ┌─ StorageKV (Deno KV) ←── Manual entry (POST /api/trades)
                                  │                    ←── Backup import
                                  │
KlineService (Yahoo Finance) ─────┤
                                  │
AICoachService (Gemini/Ollama) ───┤
                                  │
MCP Server (JSON-RPC) ────────────┘
                                  │
                          Fresh Pages (SSR) → Islands (Preact)
                                  │
                          GET /api/export → .gz download
```

**Key files:**
- `services/storage/StorageKV.ts` (330 lines) — the active data layer
- `services/storage/StorageService.ts` + `ports/Storage.ts` — DEAD CODE (SQLite adapter, never imported)
- `services/ai/AICoachService.ts` (323 lines) — AI provider abstraction
- `services/kline/KlineService.ts` (246 lines) — market data fetching
- `routes/api/trades.ts` — only input validation: 4 truthy checks
- `routes/index.tsx` (390 lines) — dashboard with 10+ KPI calculations

## Desired End State

After crispify, PipPaper will have:
1. **OpenSpec YAML** (`artifacts/04-openspec.yaml`) formalizing 22+ contracts extracted from code
2. **Runtime validators** that enforce these contracts at API boundaries
3. **Zod schemas** for all entities (currently only `Config` has a schema)
4. **V-Model tests** (unit → integration → system → acceptance) verifying the spec matches behavior
5. **Zero behavioral changes** — crispify adds guards and tests, it does NOT change what the code does

The spec will document current behavior AS-IS, including known inconsistencies.

## Patterns to Follow

| Pattern | Found in | Why use it |
|---------|----------|------------|
| Singleton storage | `StorageKV.ts:330` | Clean global access, consistent across all consumers |
| Entity interfaces in separate files | `services/storage/entities/` | Clear type contracts per domain object |
| Zod schema validation | `schemas/Config.ts` | Already the pattern for Config — extend to all entities |
| KV key namespace convention | `StorageKV.ts` | Consistent `[entity, id]` key structure — good to formalize |
| Kline chunking | `StorageKV.ts` | Solid solution to 64KB limit — worth a formal invariant |

## Patterns to AVOID

| Anti-pattern | Found in | Why avoid |
|--------------|----------|-----------|
| Dead code (SQLite adapter) | `StorageService.ts`, `ports/Storage.ts`, `adapters/sqlite/` | Confuses new developers, makes "which storage?" ambiguous |
| Read-modify-write without atomicity | `StorageKV.ts: updateTrade` | Race condition under concurrent updates |
| KPI inconsistency (gross vs net PnL) | `index.tsx:55-89` | winRate uses gross PnL, expectancy uses net — undocumented and surprising |
| No input validation beyond truthiness | `routes/api/trades.ts:31` | `!entryPrice` passes for `entryPrice: 0` (a valid price!), no type/range checks |
| Import-backup overwrites without dedup | `routes/api/import-backup.ts:62` | Inconsistent with TradovateImporter's dedup — data loss risk |
| Trade ID confusion (numeric vs string) | Multiple files | Note.TradeID references numeric ID; KV primary key is BrokerTradeID (string); kline cache keyed by numeric ID |

## V-Model Test Mapping

| Design Level | What we're deciding | Test Level | How we'll verify |
|---|---|---|---|
| **Business** | "Trades are never overwritten on import" | Acceptance | Import CSV with existing trade → confirm original annotations preserved |
| **Business** | "Backup round-trips losslessly" | Acceptance | Export → import → verify all entities match |
| **System** | "PnL sign convention is consistent" | System | Create trade with commission → verify KPIs use correct gross/net |
| **System** | "Kline chunking transparent" | System | Save large kline dataset → retrieve → verify data integrity |
| **Architecture** | "Storage singleton is the only data path" | Integration | Verify all routes import from `StorageKV`, not legacy `StorageService` |
| **Architecture** | "Entity schemas validate at boundaries" | Integration | POST malformed trade → verify schema rejection |
| **Component** | "R-multiple formula" | Unit | Given StopLoss, EntryPrice, PnL, multiplier, qty → verify exact R value |
| **Component** | "Side inference logic" | Unit | Given entry/exit/pnl → verify inferred Side |
| **Component** | "PnL calculation for LONG vs SHORT" | Unit | Given prices + qty + side → verify formula |

## Resolved Decisions

These are decisions I've made based on the research. Push back if you disagree.

1. **DESCRIBE, don't PRESCRIBE**: The spec documents current behavior, including the gross/net PnL inconsistency. We do NOT "fix" it during crispify — we document it as an invariant of the current system. If you want to change it, that's a future `bugfix` or `feature` run.

2. **22 contracts to extract**: 6 invariants, 5 preconditions, 4 postconditions, 3 properties, plus API interface definitions. See Phase 4 for the full enumeration.

3. **Zod schemas for all entities**: Currently only `Config` has a Zod schema. Crispify adds schemas for Trade, Note, Setup, Tag, and the Export format. These become the runtime validators.

4. **Keep dead code**: The SQLite adapter is dead but removing it is a `refactor`, not part of crispify. We'll document it in the spec as a known architectural property.

5. **API contracts for all 9 endpoints**: Every REST endpoint gets a formal interface definition in the spec.

6. **No Lean 4 proofs in this iteration**: The `formal:` field will use semi-formal notation for documentation, but we won't attempt Lean 4 verification for the initial crispify. That can come later.

## Open Questions

These need YOUR decision before I proceed to Phase 4.

### Q1: How to handle the gross/net PnL inconsistency?

**Context**: `winRate` and `profitFactor` use gross PnL (ignoring commissions). `totalPnL` and `expectancy` use net PnL (including commissions). A trade with PnL=+$5 and commission=-$10 counts as a "win" but contributes -$5 to totalPnL.

- **Option A**: Document as-is (DESCRIPTIVE spec). The spec says "winRate uses gross, expectancy uses net." Tests verify this exact behavior. If you later want to change it, that's a separate pipeline run.
- **Option B**: Treat as a bug. Fix in Phase 7 so all KPIs use net PnL consistently. This changes behavior.
- **Option C**: Document as-is but add a `# KNOWN-INCONSISTENCY` comment and a failing test that documents the desired future behavior.
- **Recommendation**: **Option A** (pure crispify). Document current behavior. Changing it is a future decision.

### Q2: How to handle import-backup overwrites?

**Context**: `POST /api/import-backup` calls `saveTrade()` directly, overwriting existing trades with same BrokerTradeID. But `ImporterService.importTradovateTrades()` dedupes (skips existing). This means backup import can silently destroy manual annotations.

- **Option A**: Document as-is. Backup import overwrites, CSV import dedupes. Two different behaviors.
- **Option B**: Add dedup to backup import in Phase 7 (behavioral change).
- **Recommendation**: **Option A** for crispify. But I'll flag this as a `severity: medium` invariant with a note.

### Q3: How to handle the `entryPrice: 0` validation bug?

**Context**: `routes/api/trades.ts:31` checks `!entryPrice` which is falsy for `0`. A legitimate price of `$0.00` would be rejected. This is a bug, but $0 prices are rare.

- **Option A**: Document the current validation behavior (`!= null && !== "" && !== 0`) as the precondition.
- **Option B**: Fix the validation to use proper type checking (`typeof entryPrice === 'number'` or `entryPrice !== undefined && entryPrice !== ""`).
- **Recommendation**: **Option B** — this is a clear bug, and crispify should at minimum not encode the bug into the spec. The precondition will say "entryPrice is a parseable number" and the validator will check properly.

### Q4: Scope of contract guards — minimal or comprehensive?

**Context**: Phase 7 adds runtime validators. How aggressive should they be?

- **Option A (minimal)**: Add Zod schemas + validate at API boundaries only (POST /api/trades, import-backup, MCP annotate).
- **Option B (comprehensive)**: Validate at every entry point including internal service calls, MCP tools, and Fresh page handlers.
- **Recommendation**: **Option A** — validate at external boundaries only. Internal calls trust each other. This avoids performance overhead and false rejections on legacy data.

### Q5: What about the TradovateImporter as a state machine?

**Context**: The importer parses CSV rows, groups by contract, matches buy/sell fills, determines entry/exit by timestamp ordering. This is a natural state machine (RAW → PARSED → GROUPED → MATCHED → SAVED).

- **Option A**: Model it as a state machine in the spec.
- **Option B**: Just specify preconditions (CSV format) and postconditions (trades saved with dedup).
- **Recommendation**: **Option B** — the importer's internal logic is implementation detail. We specify the contract (CSV in → deduped trades out), not the algorithm.

### Q6: Should I model the AI Coach as a state machine?

**Context**: Trades go from "unevaluated" → "evaluated" (has AIAdvice). Overall performance needs ≥3 evaluated trades.

- **Option A**: Yes — model trade evaluation state (`unevaluated → evaluated`).
- **Option B**: No — just a precondition ("≥3 trades with AIAdvice for overall evaluation").
- **Recommendation**: **Option B** — it's a simple precondition, not a complex state machine.

## Assumptions (to validate in Phase 6.5 Preflight)

| ID | Assumption | Impact if wrong |
|----|-----------|-----------------|
| ASM-001 | Deno 2.9.1 supports `CompressionStream`/`DecompressionStream` | Export/import breaks |
| ASM-002 | Deno KV atomic operations work for kline metadata | Chunking reliability |
| ASM-003 | `zod@v3.22.2` is importable via `npm:zod` in Deno | Schema validation impossible |
| ASM-004 | Yahoo Finance API is still accessible without API key | Kline fetching breaks (but this is existing, not new) |
| ASM-005 | Gemini API REST interface is stable | AI Coach may need updates (existing, not new) |
| ASM-006 | Fresh's `Handlers` pattern supports our test harness | Integration test setup |
| ASM-007 | `lizard` handles TypeScript files | Complexity gate for Phase 7 |

---

**Action required**: Please review and provide feedback on:

- [ ] Answer Q1–Q6 (gross/net PnL, import overwrite, entryPrice bug, guard scope, state machines)
- [ ] Are the patterns to follow correct?
- [ ] Are there patterns to avoid that I missed?
- [ ] Any contracts I missed or got wrong?
- [ ] Any of the resolved decisions you disagree with?

🛑 HUMAN CHECKPOINT — I will NOT proceed to Phase 4 until you approve.
