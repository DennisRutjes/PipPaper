# Structure Outline: Crispify PipPaper

> CRISPY-V Phase 5 — HUMAN CHECKPOINT
> Mode: crispify — adds validators + tests, does NOT change behavior (except Q3 fix)
> This is the "C header file" — signatures and types, not implementation details.

## Test File Location

Per user instruction: all tests go under `artifacts/tests/` with subdirectories per V-Model level:
```
artifacts/tests/
  unit/           — UT-001 through UT-009
  integration/    — IT-001 through IT-006
  system/         — ST-001 through ST-005
  acceptance/     — AT-001 through AT-004
```

## Implementation Phases (Vertical Slices)

### Phase A: Entity Zod Schemas + Export Validator

**New/changed files:**
- `schemas/Trade.ts` — **NEW** — Zod schema for Trade entity (validates INV-001, INV-002, PRE-001)
- `schemas/Note.ts` — **NEW** — Zod schema for Note entity
- `schemas/Setup.ts` — **NEW** — Zod schema for Setup entity
- `schemas/Tag.ts` — **NEW** — Zod schema for Tag entity
- `schemas/Export.ts` — **NEW** — Zod schema for backup import format (validates PRE-004)
- `schemas/index.ts` — **NEW** — re-exports all schemas
- `schemas/Config.ts` — unchanged (existing)

**New types/signatures:**
```typescript
// schemas/Trade.ts
import { z } from "zod";
export const TradeSchema = z.object({
  TradeID: z.number().optional(),
  BrokerTradeID: z.string().min(1),           // INV-001: unique PK
  Symbol: z.string(),
  Broker: z.string().optional(),
  Quantity: z.number(),
  PnL: z.number().nullable().optional(),       // guarded with || 0 everywhere
  AdjustedCost: z.number().nullable().optional(), // INV-002: negative convention
  Currency: z.string().optional(),
  EntryPrice: z.number(),                      // PRE-001: number, 0 is valid
  EntryTimestamp: z.number().optional(),
  ExitPrice: z.number(),                       // PRE-001
  ExitTimestamp: z.number().optional(),
  Side: z.enum(["LONG", "SHORT"]).nullable().optional(),
  StopLoss: z.number().nullable().optional(),
  ProfitTarget: z.number().nullable().optional(),
  Rating: z.number().min(1).max(5).optional(), // 1-5 constraint
  // ... AI fields, notes, etc.
  createdAt: z.number().optional(),
  updatedAt: z.number().optional(),
});
export type Trade = z.infer<typeof TradeSchema>;

// schemas/Export.ts
export const ExportSchema = z.object({
  version: z.literal(1),
  app: z.literal("PipPaper"),                  // PRE-004
  exportedAt: z.string(),
  data: z.object({
    trades: z.array(TradeSchema),
    notes: z.array(NoteSchema),
    setups: z.array(SetupSchema),
    tags: z.array(TagSchema),
  }),
});
```

**Contract guards active:**
- INV-001 (BrokerTradeID non-empty string)
- INV-002 (AdjustedCost nullable number — convention documented, not enforced)
- PRE-001 (entryPrice/exitPrice/quantity as number type — fixes falsy check)
- PRE-004 (Export validates app === "PipPaper")

**Test checkpoint:**
- [ ] Schemas importable via `npm:zod`
- [ ] TradeSchema.parse() accepts valid trade
- [ ] TradeSchema rejects empty BrokerTradeID
- [ ] TradeSchema accepts entryPrice=0 (Q3 fix)

---

### Phase B: API Boundary Validators (entryPrice fix + import validation)

**New/changed files:**
- `routes/api/trades.ts` — **CHANGED** — Replace truthy checks with Zod validation for POST handler (Q3 fix)
- `routes/api/import-backup.ts` — **CHANGED** — Replace manual `app === "PipPaper"` check with ExportSchema.safeParse()
- `utils/validate.ts` — **NEW** — Helper: `validateOrFail(schema, data): {success, data} | {error Response}`

**New types/signatures:**
```typescript
// utils/validate.ts
import { z } from "zod";
export function validateOrFail<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: Response }
```

**Changes to routes/api/trades.ts (POST handler):**
```typescript
// BEFORE (buggy — rejects entryPrice=0):
const { symbol, entryPrice, exitPrice, quantity } = body;
if (!symbol || !entryPrice || !exitPrice || !quantity) {
  return new Response("Missing fields", { status: 400 });
}

// AFTER (Q3 fix — proper Zod validation):
const ManualTradeInputSchema = z.object({
  symbol: z.string().min(1),
  entryPrice: z.number(),    // 0 is valid
  exitPrice: z.number(),
  quantity: z.number(),
  // optional fields...
});
const result = ManualTradeInputSchema.safeParse(body);
if (!result.success) {
  return new Response(JSON.stringify({ error: result.error.issues }), { status: 400 });
}
```

**Contract guards active:**
- PRE-001 (proper numeric type validation, entryPrice=0 accepted)
- PRE-004 (import-backup uses Zod schema validation)

**Test checkpoint:**
- [ ] POST /api/trades with entryPrice=0 succeeds (Q3 fix)
- [ ] POST /api/trades with entryPrice="abc" rejected
- [ ] POST /api/import-backup with app="Other" rejected
- [ ] Existing valid trades still accepted (no regression)

---

### Phase C: Unit Tests

**New files:**
- `artifacts/tests/unit/trade_validation_test.ts` — UT-001, UT-002, UT-003
- `artifacts/tests/unit/pnl_calculation_test.ts` — UT-004, UT-005
- `artifacts/tests/unit/r_multiple_test.ts` — UT-006
- `artifacts/tests/unit/symbol_mapping_test.ts` — UT-007
- `artifacts/tests/unit/side_inference_test.ts` — UT-008
- `artifacts/tests/unit/ai_threshold_test.ts` — UT-009

**Test runner**: Deno test (`deno test`)

**Key test signatures:**
```typescript
// UT-001: entryPrice validation (Q3 fix)
Deno.test("UT-001: Manual trade entry validates required fields", () => { ... });
Deno.test("UT-001: entryPrice=0 is accepted (Q3 fix)", () => { ... });

// UT-004: PnL formula
Deno.test("UT-004: LONG PnL = (exit-entry)*qty", () => { ... });
Deno.test("UT-004: SHORT PnL = (entry-exit)*qty", () => { ... });

// UT-006: R-multiple
Deno.test("UT-006: R-multiple = netPnL / (risk * mult * qty)", () => { ... });
```

**Contract guards verified:**
- INV-001, INV-002 (entity schema validation)
- PRE-001 (PnL formula + field validation)
- PRE-003 (AI threshold)
- PRE-005 (symbol mapping cascade)
- PROP-001 (R-multiple formula)

**Test checkpoint:**
- [ ] All 9 unit tests pass
- [ ] `deno test artifacts/tests/unit/` exits 0

---

### Phase D: Integration + System + Acceptance Tests

**New files:**
- `artifacts/tests/integration/storage_singleton_test.ts` — IT-001
- `artifacts/tests/integration/api_boundary_test.ts` — IT-002
- `artifacts/tests/integration/save_trade_test.ts` — IT-003
- `artifacts/tests/integration/ai_coach_test.ts` — IT-004 (mock AICoachService)
- `artifacts/tests/integration/backup_import_test.ts` — IT-005, IT-006
- `artifacts/tests/system/kpi_consistency_test.ts` — ST-001
- `artifacts/tests/system/kline_chunking_test.ts` — ST-002, ST-003
- `artifacts/tests/system/local_first_test.ts` — ST-004
- `artifacts/tests/system/zero_config_test.ts` — ST-005
- `artifacts/tests/acceptance/csv_import_dedup_test.ts` — AT-001
- `artifacts/tests/acceptance/backup_roundtrip_test.ts` — AT-002
- `artifacts/tests/acceptance/import_overwrite_test.ts` — AT-003
- `artifacts/tests/acceptance/entryprice_zero_test.ts` — AT-004

**Contract guards verified (all remaining):**
- INV-003, INV-005, INV-006 (import dedup, storage singleton, backup overwrite)
- POST-001, POST-002, POST-003, POST-004 (save timestamps, dedup, AI persist, export completeness)
- PROP-002, PROP-003 (local-first, zero-config)

**Test checkpoint (full V-Model):**
- [ ] Unit tests pass (Phase C)
- [ ] Integration tests pass
- [ ] System tests pass
- [ ] Acceptance tests pass
- [ ] `deno test artifacts/tests/` exits 0

---

## Summary

| Phase | Files changed | New types | Contract coverage |
|-------|--------------|-----------|-------------------|
| A | 5 new schemas | TradeSchema, NoteSchema, SetupSchema, TagSchema, ExportSchema | INV-001, INV-002, PRE-001, PRE-004 (4/18 = 22%) |
| B | 2 routes + 1 util | validateOrFail helper | PRE-001 (enforced), PRE-004 (enforced) (6/18 = 33%) |
| C | 6 test files | 9 unit tests | + INV-001, INV-002, PRE-001, PRE-003, PRE-005, PROP-001 verified (12/18 = 67%) |
| D | 13 test files | 6 integ + 5 system + 4 acceptance | + INV-003, INV-005, INV-006, PRE-002, POST-001-004, PROP-002, PROP-003 (18/18 = 100%) |

## Complexity Gate

After Phase B (code changes), run:
```bash
lizard -C 15 -L 60 -a 5 -w schemas/*.ts routes/api/trades.ts routes/api/import-backup.ts utils/validate.ts
```
All functions must pass (CCN ≤ 15, length ≤ 60, params ≤ 5).

---

**Action required**: Please review:
- [ ] Is the phase ordering correct? (A: schemas → B: validators → C: unit tests → D: higher tests)
- [ ] Are the test file locations under `artifacts/tests/` acceptable?
- [ ] Is the Q3 fix approach (Zod validation replacing truthy check) correct?
- [x] Dead code REMOVED (StorageService.ts, ports/, adapters/sqlite/) — CHECKPOINT_5 decision

✅ CHECKPOINT_5 APPROVED — dead code removed, OpenSpec is canonical spec.
