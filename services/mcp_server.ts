/// <reference lib="deno.unstable" />
// ───────────────────────────────────────────────────────────────────────────
// PipPaper MCP server (JSON-RPC 2.0 over HTTP).
//
// Lets opencode (or any MCP client) annotate imported Tradovate trades in
// the journal without touching the UI: tag setups, mark sides, record
// mistakes, write entry/exit notes, set stop/target, rate trades, and add
// rich-text per-trade journal notes. Also exposes the playbook (setups) and
// tag library so the agent can create new setups as the strategy evolves.
//
// Shares the same Deno KV store as the running PipPaper server, so every
// write is immediately visible in the dashboard.
// ───────────────────────────────────────────────────────────────────────────

import { storage } from "./storage/StorageKV.ts";
import type { Trade } from "./storage/entities/Trade.ts";
import type { Setup } from "./storage/entities/Setup.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function json(text: string | object) {
  return {
    content: [
      { type: "text" as const, text: typeof text === "string" ? text : JSON.stringify(text, null, 2) },
    ],
  };
}

// ─── Tool catalogue ──────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "list_trades",
    description:
      "List trades from the journal, newest first. Use this to discover BrokerTradeIDs for annotation. Optionally filter by symbol, side, or date range, or only unannotated trades (no Side/SetupIDs).",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max trades to return (default 25)." },
        symbol: { type: "string", description: "Filter by symbol (e.g. 'MNQU6', 'NQ')." },
        unannotated: { type: "boolean", description: "If true, only return trades missing Side or SetupIDs." },
      },
    },
  },
  {
    name: "get_trade",
    description:
      "Fetch a single trade by BrokerTradeID with all annotation fields (Side, SetupIDs, Mistakes, EntryNotes, ExitNotes, Rating, StopLoss, ProfitTarget, AIAdvice).",
    inputSchema: {
      type: "object",
      properties: { trade_id: { type: "string" } },
      required: ["trade_id"],
    },
  },
  {
    name: "annotate_trade",
    description:
      "Annotate a single trade. Pass only the fields you want to set. This is the primary tool for tagging Tradovate imports: set Side (LONG/SHORT), SetupIDs (from the playbook), Mistakes[], EntryNotes, ExitNotes, Rating (1-5), StopLoss, ProfitTarget, EntryReason, ExitReason. All updates are merged (partial update), so missing fields keep their current value.",
    inputSchema: {
      type: "object",
      properties: {
        trade_id: { type: "string", description: "BrokerTradeID of the trade to annotate." },
        side: { type: "string", enum: ["LONG", "SHORT"] },
        setup_ids: { type: "array", items: { type: "number" }, description: "SetupIDs from the playbook to link to this trade." },
        mistakes: { type: "array", items: { type: "string" }, description: "Free-form mistake tags (e.g. 'chased entry', 'moved stop'). Pass [] to clear." },
        rating: { type: "integer", minimum: 1, maximum: 5, description: "1-5 star manual trade rating." },
        entry_reason: { type: "string", enum: ["market", "limit", "stop", "other"] },
        exit_reason: { type: "string", enum: ["market", "limit", "stop_loss", "trailing_stop", "take_profit", "time_exit", "other"] },
        entry_notes: { type: "string" },
        exit_notes: { type: "string" },
        stop_loss: { type: "number", description: "Stop loss price." },
        profit_target: { type: "number", description: "Profit target price." },
      },
      required: ["trade_id"],
    },
  },
  {
    name: "bulk_annotate",
    description:
      "Apply the same annotation to many trades at once (e.g. tag all of today's MNQU6 trades as LONG with a setup). Uses the same field names as annotate_trade (minus trade_id). Returns a per-trade result list.",
    inputSchema: {
      type: "object",
      properties: {
        trade_ids: { type: "array", items: { type: "string" } },
        side: { type: "string", enum: ["LONG", "SHORT"] },
        setup_ids: { type: "array", items: { type: "number" } },
        mistakes: { type: "array", items: { type: "string" } },
        entry_reason: { type: "string", enum: ["market", "limit", "stop", "other"] },
        exit_reason: { type: "string", enum: ["market", "limit", "stop_loss", "trailing_stop", "take_profit", "time_exit", "other"] },
        entry_notes: { type: "string" },
        exit_notes: { type: "string" },
        stop_loss: { type: "number" },
        profit_target: { type: "number" },
      },
      required: ["trade_ids"],
    },
  },
  {
    name: "list_setups",
    description:
      "List all playbook setups with their SetupIDs (needed to link trades via setup_ids).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "create_setup",
    description:
      "Create a new playbook setup. Returns the created SetupID so you can immediately link trades to it via annotate_trade.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Setup name (e.g. 'Hourly Open Reversion')." },
        description: { type: "string" },
        rules: { type: "string", description: "Entry/exit rules (plain text or HTML)." },
        color: { type: "string", description: "Hex color for the tag pill (e.g. '#10b981')." },
      },
      required: ["name", "color"],
    },
  },
  {
    name: "save_trade_note",
    description:
      "Save a rich-text per-trade journal note (the long-form reflection shown on the trade detail page). Overwrites any existing note for this trade.",
    inputSchema: {
      type: "object",
      properties: {
        trade_id: { type: "string" },
        html: { type: "string", description: "HTML content of the note." },
      },
      required: ["trade_id", "html"],
    },
  },
  {
    name: "list_tags",
    description: "List all custom tags (Mistake/Setup/General categories) with their IDs and colors.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleListTrades(args: any) {
  const all = await storage.getTrades();
  const filtered = all
    .filter((t) => (args?.symbol ? (t.Symbol ?? "").toUpperCase().includes(String(args.symbol).toUpperCase()) : true))
    .filter((t) => (args?.unannotated ? (!t.Side || !t.SetupIDs || t.SetupIDs.length === 0) : true))
    .sort((a, b) => (b.EntryTimestamp || 0) - (a.EntryTimestamp || 0));
  const limit = Math.max(1, Math.min(200, Number(args?.limit ?? 25)));
  return json({
    total: all.length,
    returned: Math.min(limit, filtered.length),
    trades: filtered.slice(0, limit).map((t) => ({
      BrokerTradeID: t.BrokerTradeID,
      Symbol: t.Symbol,
      Side: t.Side ?? null,
      PnL: t.PnL,
      EntryPrice: t.EntryPrice,
      ExitPrice: t.ExitPrice,
      EntryTimestamp: t.EntryTimestamp,
      SetupIDs: t.SetupIDs ?? [],
      Mistakes: t.Mistakes ?? [],
      Rating: t.Rating ?? null,
    })),
  });
}

async function handleGetTrade(args: any) {
  const t = await storage.getTrade(String(args?.trade_id));
  if (!t) return json({ error: `No trade with id ${args?.trade_id}` });
  return json(t);
}

function buildUpdates(args: any): Partial<Trade> {
  const u: any = {};
  if (args?.side) u.Side = args.side;
  if (args?.setup_ids !== undefined) u.SetupIDs = args.setup_ids;
  if (args?.mistakes !== undefined) u.Mistakes = args.mistakes;
  if (args?.rating !== undefined) u.Rating = args.rating;
  if (args?.entry_reason !== undefined) u.EntryReason = args.entry_reason;
  if (args?.exit_reason !== undefined) u.ExitReason = args.exit_reason;
  if (args?.entry_notes !== undefined) u.EntryNotes = args.entry_notes;
  if (args?.exit_notes !== undefined) u.ExitNotes = args.exit_notes;
  if (args?.stop_loss !== undefined) u.StopLoss = args.stop_loss;
  if (args?.profit_target !== undefined) u.ProfitTarget = args.profit_target;
  return u;
}

async function handleAnnotateTrade(args: any) {
  const id = String(args?.trade_id);
  const updates = buildUpdates(args);
  const updated = await storage.updateTrade(id, updates);
  if (!updated) return json({ error: `No trade with id ${id}` });
  return json({ ok: true, trade: updated });
}

async function handleBulkAnnotate(args: any) {
  const ids: string[] = Array.isArray(args?.trade_ids) ? args.trade_ids : [];
  const updates = buildUpdates(args);
  const results: any[] = [];
  for (const id of ids) {
    const updated = await storage.updateTrade(id, updates);
    results.push({ trade_id: id, ok: !!updated });
  }
  return json({ ok: true, applied: results.filter((r) => r.ok).length, total: ids.length, results });
}

async function handleListSetups() {
  const setups = await storage.getSetups();
  return json({ count: setups.length, setups });
}

async function handleCreateSetup(args: any) {
  const setup: Setup = {
    Name: String(args?.name),
    Description: args?.description ?? "",
    Rules: args?.rules ?? "",
    Color: String(args?.color ?? "#3b82f6"),
  };
  await storage.saveSetup(setup);
  return json({ ok: true, setup });
}

async function handleSaveTradeNote(args: any) {
  await storage.saveTradeNote(String(args?.trade_id), String(args?.html));
  return json({ ok: true });
}

async function handleListTags() {
  const tags = await storage.getTags();
  return json({ count: tags.length, tags });
}

// ─── Tool dispatcher ─────────────────────────────────────────────────────────

async function dispatchTool(name: string, args: any) {
  switch (name) {
    case "list_trades": return await handleListTrades(args);
    case "get_trade": return await handleGetTrade(args);
    case "annotate_trade": return await handleAnnotateTrade(args);
    case "bulk_annotate": return await handleBulkAnnotate(args);
    case "list_setups": return await handleListSetups();
    case "create_setup": return await handleCreateSetup(args);
    case "save_trade_note": return await handleSaveTradeNote(args);
    case "list_tags": return await handleListTags();
    default:
      return json({ error: `Unknown tool: ${name}` });
  }
}

// ─── JSON-RPC over HTTP ──────────────────────────────────────────────────────

function rpcResult(id: any, result: any) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    headers: { "Content-Type": "application/json" },
  });
}

function rpcError(id: any, code: number, message: string) {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Handle an incoming MCP HTTP request (JSON-RPC 2.0).
 * Mount this at /mcp on the PipPaper server (port 8000).
 */
export async function handleMcpHttp(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let msg: any;
  try {
    msg = JSON.parse(await request.text());
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { id, method, params } = msg;

  try {
    switch (method) {
      case "initialize":
        return rpcResult(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "pippaper", version: "1.0.0" },
        });

      case "notifications/initialized":
        return new Response(null, { status: 204 });

      case "tools/list":
        return rpcResult(id, { tools: TOOLS });

      case "tools/call": {
        const { name, arguments: args } = params;
        try {
          const result = await dispatchTool(name, args ?? {});
          return rpcResult(id, result);
        } catch (err) {
          console.error(`[PipPaper MCP] Tool ${name} threw:`, err);
          return rpcResult(id, { content: [{ type: "text", text: `Tool ${name} failed: ${(err as Error).message}` }], isError: true });
        }
      }

      default:
        return rpcError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    return rpcError(id, -32603, `Internal error: ${(err as Error).message}`);
  }
}
