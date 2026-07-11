# Phase 2: Research — PipPaper Codebase Facts

> CRISPY-V Crispify Mode | Objective facts only — no opinions.
> Each question from Phase 1 answered with file paths, signatures, and formulas.

---

## Q1: Data Model & Identity

### Q1.1 — Core domain entities and fields

**Trade** (`services/storage/entities/Trade.ts`, 39 lines):
```typescript
interface Trade {
  TradeID: number;          // Date.now() — legacy numeric id
  BrokerTradeID: string;    // PRIMARY KEY for KV storage
  Symbol: string;
  Broker: string;
  Quantity: number;
  PnL: number | null;       // nullable — guarded everywhere with || 0
  AdjustedCost: number;     // commissions, STORED AS NEGATIVE (e.g., -2.50)
  Currency: string;
  EntryPrice: number;
  EntryTimestamp: number;   // unix seconds
  ExitPrice: number;
  ExitTimestamp: number;    // unix seconds
  // optional fields:
  SetupIDs?: number[];
  Mistakes?: string[];
  StopLoss?: number | null;
  ProfitTarget?: number | null;
  Side?: "LONG" | "SHORT" | null;
  Rating?: number;          // 1-5, manual
  IsManual?: boolean;
  EntryReason?: "market" | "limit" | "stop" | "other" | null;
  ExitReason?: "market" | "limit" | "stop_loss" | "trailing_stop" | "take_profit" | "time_exit" | "other" | null;
  EntryNotes?: string;
  ExitNotes?: string;
  AIAdvice?: string;
  AIProvider?: string;
  AITimestamp?: number;
  AIRating?: number;        // 1-5, from AI
  AIGrade?: string;         // A+ to F, from AI
  KlineData?: KlineData;    // legacy on-trade cache (migrated to separate KV key)
  createdAt: number;        // unix seconds
  updatedAt: number;        // unix seconds
}
```

**Note** (`services/storage/entities/Note.ts`):
```typescript
interface Note {
  NoteID?: number;
  NoteData: string;          // HTML from Quill editor
  NoteType: "journal" | "trade" | "daily_plan";
  TradeID?: number;
  PlanDate?: string;         // YYYY-MM-DD for daily_plan notes
  createdAt: number;
  updatedAt: number;
}
```

**Setup** (`services/storage/entities/Setup.ts`):
```typescript
interface Setup {
  SetupID?: number;
  Name: string;
  Description?: string;
  Rules?: string;
  Color: string;             // hex color, e.g., "#3b82f6"
  createdAt: number;
  updatedAt: number;
}
```

**Tag** (`services/storage/entities/Tag.ts`):
```typescript
interface Tag {
  TagID?: number;
  Name: string;
  Category: "mistake" | "setup" | "general";
  Color?: string;
  createdAt: number;
  updatedAt: number;
}
```

**Cost** (`services/storage/entities/Cost.ts`) — used only by TradovateImporter, not persisted directly:
```typescript
interface Cost {
  Contract: string;
  Timestamp: number;
  Type: string;
  Amount: number;
  Currency: string;
  tradeFillRefs: ...;
}
```

### Q1.2 — Primary keys and ID generation

| Entity | Primary Key | Key Namespace | ID Generation |
|--------|------------|---------------|---------------|
| Trade | `BrokerTradeID` (string) | `["trades", brokerTradeId]` | Importer: `buyFillId + "_" + sellFillId`; Manual: `"manual_" + Date.now()` |
| Note | `NoteID` | `["notes", noteId]` | `Date.now()` |
| Setup | `SetupID` | `["setups", setupId]` | `Date.now()` |
| Tag | `TagID` | `["tags", tagId]` | `Date.now()` |
| Settings | (single record) | `["settings"]` | N/A |
| Klines | tradeId reference | `["klines", tradeId]` + chunks | Derived from trade |

### Q1.3 — Enum values

- **Side**: `"LONG" | "SHORT" | null` (nullable, inferred when missing)
- **NoteType**: `"journal" | "trade" | "daily_plan"`
- **TagCategory**: `"mistake" | "setup" | "general"`
- **EntryReason**: `"market" | "limit" | "stop" | "other" | null`
- **ExitReason**: `"market" | "limit" | "stop_loss" | "trailing_stop" | "take_profit" | "time_exit" | "other" | null`

### Q1.4 — Entity relationships

- Trade → Setup: many-to-many via `Trade.SetupIDs: number[]` (references Setup.SetupID)
- Trade → Tag/Mistake: via `Trade.Mistakes: string[]` (stores tag NAMES, not IDs)
- Trade → Note: one-to-one via `Note.TradeID` matching `Trade.TradeID` (the numeric legacy id)
- Trade → KlineData: one-to-one, cached at `["klines", tradeId]` (note: keyed by numeric TradeID, not BrokerTradeID)

**IMPORTANT INCONSISTENCY**: Notes reference trades by numeric `TradeID`, but storage primary key is `BrokerTradeID`. Kline cache is keyed by `TradeID` (passed as `tradeId` param). The trade detail route loads notes by filtering all notes for `Note.TradeID === Trade.TradeID`.

---

## Q2: Storage Layer

### Q2.1 — Active vs Legacy store

**ACTIVE**: `services/storage/StorageKV.ts` (330 lines). Exports singleton `storage`. Used by ALL routes and services.

**LEGACY/DEAD**: `services/storage/StorageService.ts` + `ports/Storage.ts` + `adapters/sqlite/`. The `StorageService` exports singleton `store` but is NEVER imported by any route or service. The `Storage` port interface only declares 5 methods: `listTrades, createNote, listNotes, createTrade, getTrade`.

### Q2.2 — KV key namespaces

| Namespace | Key Shape | Value |
|-----------|-----------|-------|
| Trades | `["trades", brokerTradeId]` | Trade object |
| Notes | `["notes", noteId]` | Note object |
| Setups | `["setups", setupId]` | Setup object |
| Tags | `["tags", tagId]` | Tag object |
| Settings | `["settings"]` | Settings object (single record) |
| Symbol mappings | `["symbol_mappings"]` | User-defined symbol→mapping overrides |
| Symbol multipliers | `["symbol_multipliers"]` | User-defined symbol→multiplier overrides |
| Klines (meta) | `["klines", tradeId]` | Chunk metadata or legacy unchunked data |
| Klines (chunks) | `["klines", tradeId, chunkIndex]` | Individual kline data chunk |
| General advice | `["general_coach_advice"]` | Cached AI overall performance advice |

### Q2.3 — Kline chunking (64KB value limit handling)

- `CHUNK_SIZE = 50_000` bytes (safely under KV's 64KB limit)
- On save: serialize candles → split into chunks → store meta at `["klines", tradeId]` as `{__chunked: true, count: N}`, store each chunk at `["klines", tradeId, i]`
- On read: check if meta has `__chunked: true` → if so, read all N chunks and reassemble. If not chunked, return as-is (legacy format migration).
- Meta write uses atomic operation; chunk writes do not.

### Q2.4 — Atomicity

- **Atomic**: Only the kline chunk metadata write uses `kv.atomic()`.
- **Non-atomic**: All trade/note/setup/tag operations are simple `kv.set()` / `kv.delete()`.
- **Cascade behavior**: `deleteTrade` deletes the trade AND associated kline cache (meta + chunks) in a loop of separate `kv.delete()` calls — NOT atomic.
- **`saveTrade`**: Always sets `updatedAt = Date.now() / 1000`.
- **`updateTrade`**: `Object.assign(trade, updates)` then re-saves (read-modify-write — race condition possible under concurrent updates).

---

## Q3: API Surface

### Q3.1 — REST endpoints

| Method | Path | Handler File | Description |
|--------|------|-------------|-------------|
| GET | `/api/trades` | `routes/api/trades.ts` | List all trades |
| POST | `/api/trades` | `routes/api/trades.ts` | Manual trade entry |
| DELETE | `/api/trades?id=` | `routes/api/trades.ts` | Delete trade by BrokerTradeID |
| POST | `/api/ai-coach` | `routes/api/ai-coach.ts` | Evaluate single trade |
| GET | `/api/ai-coach-general` | `routes/api/ai-coach-general.ts` | Get cached overall advice |
| POST | `/api/ai-coach-general` | `routes/api/ai-coach-general.ts` | Regenerate overall advice |
| GET | `/api/klines?tradeId=&refresh=1` | `routes/api/klines.ts` | Get kline chart data |
| GET | `/api/export` | `routes/api/export.ts` | Gzip export all data |
| POST | `/api/import-backup` | `routes/api/import-backup.ts` | Import from .gz or JSON |

### Q3.2 — POST /api/trades contract (verified line-by-line)

**Request body** (JSON):
```json
{
  "symbol": "ES",           // REQUIRED — validated as truthy
  "side": "LONG",           // optional — "LONG" | "SHORT" | undefined
  "entryPrice": "4500.50",  // REQUIRED — string, parseFloat'd
  "exitPrice": "4505.25",   // REQUIRED — string, parseFloat'd
  "quantity": "2",          // REQUIRED — string, parseInt'd
  "entryDate": "2025-01-15",// used in Date constructor
  "entryTime": "09:30",     // optional, default "09:30"
  "exitDate": "2025-01-15", // optional, defaults to entryDate
  "exitTime": "16:00",      // optional, default "16:00"
  "stopLoss": "4498",       // optional
  "profitTarget": "4510",   // optional
  "pnl": "500",             // optional — if provided, overrides calculation
  "commission": "2.50"      // optional — stored as -Math.abs(commission)
}
```

**Validation**: Only checks `!symbol || !entryPrice || !exitPrice || !quantity` → 400 if missing.

**PnL calculation** (when not provided):
```typescript
side === "SHORT" ? (entryPrice - exitPrice) * qty : (exitPrice - entryPrice) * qty
```

**BrokerTradeID**: `"manual_" + Date.now()`

**Response 201**: `{ success: true, tradeId, trade }`
**Response 400**: `{ error: "Missing required fields: ..." }`
**Response 500**: `{ error: errorMessage }`

### Q3.3 — POST /api/ai-coach contract

**Request**: `{ tradeId, journalNotes?, chartImage? }`
- `tradeId` refers to `BrokerTradeID`
- 404 if trade not found
- On success: evaluates via AI provider, persists `AIAdvice, AIRating, AIGrade, AIProvider, AITimestamp` on the trade

### Q3.4 — GET /api/klines contract

**Query params**: `tradeId` (numeric TradeID), `refresh=1` (force re-fetch)
- Checks KV cache first at `["klines", tradeId]`
- Migrates legacy on-trade `KlineData` to separate KV key if found
- Fetches fresh via KlineService if cache miss or refresh forced
- Returns: candle data + trade overlay fields (entry/exit prices, timestamps)

### Q3.5 — Export format

```json
{
  "version": 1,
  "exportedAt": "2026-07-11T12:00:00.000Z",
  "app": "PipPaper",
  "data": { "trades": [...], "notes": [...], "setups": [...], "tags": [...] }
}
```
Gzipped, served as `application/gzip` with filename `pippaper_export_YYYY-MM-DD.json.gz`.

### Q3.6 — Import-backup behavior

**IMPORTANT DISCREPANCY**: Import-backup calls `storage.saveTrade()` directly for each trade — NO dedup check. This OVERWRITES existing trades with same BrokerTradeID. This differs from TradovateImporter which explicitly dedupes.

**Validation**: Checks `exportData.app === "PipPaper"` → 400 if invalid. Accepts both `.gz` and plain JSON.

---

## Q4: Business Logic & Invariants

### Q4.1 — PnL calculation

**Manual entry** (POST /api/trades, `routes/api/trades.ts:44-46`):
```
If side === "SHORT": PnL = (EntryPrice - ExitPrice) × Quantity
Else:                PnL = (ExitPrice - EntryPrice) × Quantity
```

**Imported trades**: PnL comes from the CSV/broker data directly, not calculated.

### Q4.2 — Net PnL

```
netPnL = (trade.PnL || 0) + (trade.AdjustedCost || 0)
```
Since `AdjustedCost` is stored as NEGATIVE (e.g., -2.50 for $2.50 commission), this is effectively `PnL - |commissions|`.

### Q4.3 — R-multiple (`routes/trade/[tradeID].tsx:120-126`)

```typescript
riskPerShare = StopLoss ? Math.abs(EntryPrice - StopLoss) : null;
rMultiple = (riskPerShare != null && riskPerShare > 0)
  ? netPnL / (riskPerShare × multiplier × (Quantity || 1))
  : null;
```
- Requires `StopLoss` to be set
- Requires `riskPerShare > 0` (StopLoss ≠ EntryPrice)
- `multiplier` from `SymbolConfig.getSymbolMultiplier(Symbol)`
- Returns null if StopLoss missing or riskPerShare is 0

### Q4.4 — Side inference (`services/utils/utils.ts: getTradeSide`)

Infers LONG/SHORT from price/pnl relationship when `trade.Side` is null/missing. Logic: if PnL and prices are consistent with long position (exit > entry → positive PnL), infer LONG; otherwise SHORT.

### Q4.5 — AdjustedCost sign convention

`AdjustedCost` represents commissions/fees, stored as a **NEGATIVE** number.
- Manual entry: `commission ? -Math.abs(parseFloat(commission)) : 0`
- Tradovate import: commissions summed as negative

### Q4.6 — Dashboard KPIs (`routes/index.tsx:44-103`)

All trades sorted by `ExitTimestamp` ascending before calculation.

| KPI | Formula | Uses commissions? |
|-----|---------|-------------------|
| totalPnL | `Σ (PnL \|\| 0) + (AdjustedCost \|\| 0)` | YES (net) |
| winRate | `(wins / total) × 100` where win = `PnL > 0` | NO (gross) |
| profitFactor | `grossProfit / grossLoss` (∞ if no losses, 0 if no profit) | NO (gross) |
| avgWin | `grossProfit / wins.length` | NO (gross) |
| avgLoss | `grossLoss / losses.length` | NO (gross) |
| expectancy | `totalPnL / trades.length` | YES (net) |
| bestTrade | `max(PnL)` | NO (gross) |
| worstTrade | `min(PnL)` | NO (gross) |
| winStreak | max consecutive `PnL > 0` | NO (gross) |
| lossStreak | max consecutive `PnL < 0` | NO (gross) |

**INCONSISTENCY**: `winRate` and `profitFactor` use GROSS PnL (ignoring commissions), while `totalPnL` and `expectancy` use NET PnL (including commissions). A trade with PnL=+$5 and commission=-$10 counts as a "win" for winRate but contributes -$5 to totalPnL.

### Q4.7 — Import dedup logic (TradovateImporter)

`ImporterService.importTradovateTrades(content)`:
1. Parse CSV via TradovateImporter
2. For each parsed trade, check if `BrokerTradeID` already exists in storage
3. If exists → SKIP (never overwrite — protects manual annotations)
4. If new → save via `storage.saveTrade()`

---

## Q5: External Integrations

### Q5.1 — AI Coach (`services/ai/AICoachService.ts`, 323 lines)

**Provider selection**: `getProvider()` reads `LLM_PROVIDER` env → `"gemini"` (default) | `"ollama"`.

**Gemini path**:
- API key from `GEMINI_API_KEY` env
- Model from: `settings.ai_model` → `AI_MODEL` env → default `"gemini-1.5-pro"`
- REST API call to `generativelanguage.googleapis.com`
- Supports optional `chartImage` (base64 image)

**Ollama path**:
- Model from `OLLAMA_MODEL` env (default `"gemma4"`)
- Base URL from `OLLAMA_BASE_URL` env (default `"http://localhost:11434"`)
- No image support

**Output**: `AICoachResult { advice: string, rating?: number, grade?: string, provider: string, model: string }`
- Rating extracted via regex (1-5 scale)
- Grade extracted via regex (A+ to F scale)
- Philosophy: evaluates EXECUTION quality, not P&L outcome

**Overall performance**: `evaluateOverallPerformance(trades)` requires ≥3 already-evaluated trades (trades with AIAdvice populated).

### Q5.2 — Kline fetching (`services/kline/KlineService.ts`, 246 lines)

**Dynamic interval selection** based on `timeSinceExit` and `tradeDuration`:
- <7 days since exit: 1m or 5m
- <60 days: 5m, 1h, or 1d
- >60 days: 1d

**Cascading fallback**: If 1m fails (too many candles), broadens to 5m → 15m → 1d.

**Symbol mapping** (`mapSymbol()`):
1. User-defined mappings (from KV storage)
2. DEFAULT_SYMBOL_MAP (e.g., "NQ" → "NQ=F")
3. Regex match for futures codes
4. Strip futures suffix
5. Return as-is

**Candle format**: `{ t: number, o: number, h: number, l: number, c: number, v: number }` (time, open, high, low, close, volume)

### Q5.3 — Yahoo auth (`services/kline/YahooAuth.ts`, 106 lines)

3-step auth mirroring yfinance:
1. GET `fc.yahoo.com` → get A3 cookie
2. GET query API for crumb
3. Use cookie+crumb in chart API requests

- Cached 12h (TTL_MS)
- `fetchChart()` retries once on 429/400 by refreshing session

### Q5.4 — Configuration cascade

**Symbol multiplier** (`SymbolConfig.getSymbolMultiplier`):
1. User storage override (`["symbol_multipliers"]`)
2. `SYMBOL_CONFIG` env (JSON map)
3. DEFAULT_MULTIPLIERS table (NQ=20, ES=50, MNQ=2, MES=5, YM=5, RTY=50, CL=1000, GC=100, SI=5000, ZB=1000, 6E=125000, 6J=12500000)
4. Strip futures code regex → default 1

**Symbol tick size** (`SymbolConfig.getTickSize`):
1. DEFAULT_TICK_SIZES table
2. Strip futures code → default 0.01

**Database URL**: `DATABASE_URL` env → parsed via Zod ConfigSchema `{ db: { databaseURL?: string } }`. Only config schema in project.

---

## Q6: MCP Server (`services/mcp_server.ts`, 314 lines)

### Q6.1 — Protocol
- JSON-RPC 2.0 over HTTP at `/mcp`
- Protocol version: `"2024-11-05"`
- Shares same Deno KV store (singleton `storage`)
- No authentication

### Q6.2 — Tools

| Tool | Description |
|------|-------------|
| `list_trades` | List all trades |
| `get_trade` | Get single trade by ID |
| `annotate_trade` | Add annotations to a trade (setups, mistakes, rating, notes) |
| `bulk_annotate` | Annotate multiple trades |
| `list_setups` | List all setups |
| `create_setup` | Create a new setup |
| `save_trade_note` | Save a journal note for a trade |
| `list_tags` | List all tags |

---

## Q7: Cross-Cutting Concerns

### Q7.1 — Date/time conventions

| Context | Format | Example |
|---------|--------|---------|
| Trade timestamps | Unix seconds | `1705315200` |
| Note PlanDate | YYYY-MM-DD | `"2025-01-15"` |
| Export exportedAt | ISO 8601 string | `"2026-07-11T12:00:00.000Z"` |
| createdAt/updatedAt | Unix seconds | `Date.now() / 1000` |
| API date inputs | YYYY-MM-DD + HH:MM | `"2025-01-15" + "T" + "09:30" + ":00"` → `Date()` → `/1000` |

### Q7.2 — Numeric nullability

- `PnL`: nullable (`number | null`) — guarded everywhere with `|| 0`
- `AdjustedCost`: typed as `number` but can effectively be 0 (not null in type, but nullable in practice)
- `StopLoss`, `ProfitTarget`: `number | null | undefined`
- `Rating`, `AIRating`: `number | undefined` (1-5)
- `Quantity`: always `number` (required)
- All guard patterns use `|| 0` for PnL/AdjustedCost, `|| 1` for Quantity in R-multiple

### Q7.3 — Concurrency concerns

1. **`updateTrade`**: Read-modify-write via `Object.assign` — race condition under concurrent updates to same trade
2. **Import + manual annotation**: If import runs while user annotates, import skips (dedup protects), but annotation persistence is a separate non-atomic write
3. **Kline cache**: Meta write is atomic, but chunk writes are not — partial writes possible if process crashes mid-chunking
4. **Delete cascade**: Trade + kline meta + kline chunks deleted in separate `kv.delete()` calls — not atomic

### Q7.4 — Fresh SSR data flow

1. `Handler.GET` runs server-side, fetches data from `storage` singleton
2. Data passed to `ctx.render({ ... })` as `props.data`
3. Page component receives via `PageProps<DataType>`, renders Preact SSR
4. Islands (client components) hydrate with data passed as props from page
5. `Handler.POST` handles form submissions, redirects after action

---

## Summary of Discovered Contracts (for Phase 3/4)

### Invariants (must ALWAYS hold)
1. `BrokerTradeID` is globally unique and immutable after creation
2. `AdjustedCost ≤ 0` (commissions stored as negative or zero)
3. Kline chunks never exceed 50,000 bytes
4. Export always includes `app: "PipPaper"` and `version: 1`
5. `EntryTimestamp` and `ExitTimestamp` are unix seconds (not ms)
6. AI rating (when present) is 1-5; AI grade (when present) is A+ to F

### Preconditions (must hold before operation)
7. POST /api/trades requires: symbol, entryPrice, exitPrice, quantity (truthy)
8. POST /api/ai-coach requires: tradeId must exist in storage
9. AI overall performance requires: ≥3 trades with AIAdvice populated
10. R-multiple calculation requires: StopLoss set AND StopLoss ≠ EntryPrice
11. Backup import requires: `app === "PipPaper"` in the import file

### Postconditions (must hold after operation)
12. After saveTrade: `updatedAt = Date.now() / 1000`
13. After manual entry: `BrokerTradeID = "manual_" + timestamp`, `IsManual = true`
14. After AI evaluation: trade has AIAdvice, AIProvider, AITimestamp set
15. After Tradovate import: existing trades are never overwritten

### Properties (quality attributes)
16. Privacy-first: all data stays local (Deno KV)
17. No external API calls except Yahoo Finance (klines) and Gemini/Ollama (AI)
18. Kline chunking ensures values <64KB (KV limit)

### Discrepancies (NOT bugs to fix — current behavior to document)
19. winRate/profitFactor use GROSS PnL; totalPnL/expectancy use NET PnL (commissions)
20. Import-backup OVERWRITES trades; Tradovate import SKIPS duplicates
21. Note.TradeID references numeric TradeID; storage primary key is BrokerTradeID
22. Kline cache keyed by numeric TradeID, not BrokerTradeID
