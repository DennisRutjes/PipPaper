/// <reference lib="deno.unstable" />
import { Trade } from "./entities/Trade.ts";
import { Note } from "./entities/Note.ts";
import { Setup } from "./entities/Setup.ts";
import { Tag } from "./entities/Tag.ts";

const kv = await Deno.openKv();

export class StorageKV {
  // ─── Trades ───────────────────────────────────────────────────

  async saveTrade(trade: Trade): Promise<void> {
    const key = ["trades", trade.BrokerTradeID];
    trade.updatedAt = Date.now() / 1000;
    await kv.set(key, trade);
  }

  async getTrades(): Promise<Trade[]> {
    const trades: Trade[] = [];
    const entries = kv.list<Trade>({ prefix: ["trades"] });
    for await (const entry of entries) {
      trades.push(entry.value);
    }
    return trades;
  }

  async getTrade(brokerTradeId: string): Promise<Trade | null> {
    const result = await kv.get<Trade>(["trades", brokerTradeId]);
    return result.value;
  }

  async updateTrade(brokerTradeId: string, updates: Partial<Trade>): Promise<Trade | null> {
    const trade = await this.getTrade(brokerTradeId);
    if (!trade) return null;
    Object.assign(trade, updates);
    trade.updatedAt = Date.now() / 1000;
    await kv.set(["trades", brokerTradeId], trade);
    return trade;
  }

  async deleteTrade(brokerTradeId: string): Promise<void> {
    await kv.delete(["trades", brokerTradeId]);
  }

  async clearTrades(): Promise<void> {
    const entries = kv.list({ prefix: ["trades"] });
    for await (const entry of entries) {
      await kv.delete(entry.key);
    }
  }

  // ─── Notes ────────────────────────────────────────────────────

  async saveNote(note: Note): Promise<void> {
    const id = note.NoteID || Date.now();
    note.NoteID = id;
    note.createdAt = note.createdAt || Date.now() / 1000;
    note.updatedAt = Date.now() / 1000;
    await kv.set(["notes", id], note);
  }

  async getNotes(): Promise<Note[]> {
    const notes: Note[] = [];
    const entries = kv.list<Note>({ prefix: ["notes"] });
    for await (const entry of entries) {
      notes.push(entry.value);
    }
    return notes;
  }

  async deleteNote(noteId: number): Promise<void> {
    await kv.delete(["notes", noteId]);
  }

  // Trade notes
  async getTradeNote(tradeId: string): Promise<Note | null> {
    const notes = await this.getNotes();
    return notes.find(n => n.NoteType === "trade" && n.TradeID === tradeId) || null;
  }

  async saveTradeNote(tradeId: string, html: string): Promise<void> {
    const existing = await this.getTradeNote(tradeId);
    if (existing) {
      existing.NoteData = html;
      existing.updatedAt = Date.now() / 1000;
      await this.saveNote(existing);
    } else {
      await this.saveNote({
        NoteData: html,
        NoteType: "trade",
        TradeID: tradeId,
      });
    }
  }

  // Daily plans
  async getDailyPlan(date: string): Promise<Note | null> {
    const notes = await this.getNotes();
    return notes.find(n => n.NoteType === "daily_plan" && n.PlanDate === date) || null;
  }

  async saveDailyPlan(date: string, html: string): Promise<void> {
    const existing = await this.getDailyPlan(date);
    if (existing) {
      existing.NoteData = html;
      existing.updatedAt = Date.now() / 1000;
      await this.saveNote(existing);
    } else {
      await this.saveNote({
        NoteData: html,
        NoteType: "daily_plan",
        PlanDate: date,
      });
    }
  }

  // Journal entries
  async getJournalEntries(): Promise<Note[]> {
    const notes = await this.getNotes();
    return notes
      .filter(n => n.NoteType === "journal")
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  async saveJournalEntry(html: string): Promise<void> {
    await this.saveNote({
      NoteData: html,
      NoteType: "journal",
    });
  }

  // ─── Setups (Playbook) ────────────────────────────────────────

  async saveSetup(setup: Setup): Promise<void> {
    const id = setup.SetupID || Date.now();
    setup.SetupID = id;
    setup.createdAt = setup.createdAt || Date.now() / 1000;
    setup.updatedAt = Date.now() / 1000;
    await kv.set(["setups", id], setup);
  }

  async getSetups(): Promise<Setup[]> {
    const setups: Setup[] = [];
    const entries = kv.list<Setup>({ prefix: ["setups"] });
    for await (const entry of entries) {
      setups.push(entry.value);
    }
    return setups;
  }

  async getSetup(setupId: number): Promise<Setup | null> {
    const result = await kv.get<Setup>(["setups", setupId]);
    return result.value;
  }

  async deleteSetup(setupId: number): Promise<void> {
    await kv.delete(["setups", setupId]);
  }

  // ─── Tags (Custom mistake/setup tags) ──────────────────────────

  async saveTag(tag: Tag): Promise<void> {
    const id = tag.TagID || Date.now();
    tag.TagID = id;
    tag.createdAt = tag.createdAt || Date.now() / 1000;
    tag.updatedAt = Date.now() / 1000;
    await kv.set(["tags", id], tag);
  }

  async getTags(): Promise<Tag[]> {
    const tags: Tag[] = [];
    const entries = kv.list<Tag>({ prefix: ["tags"] });
    for await (const entry of entries) {
      tags.push(entry.value);
    }
    return tags;
  }

  async getTag(tagId: number): Promise<Tag | null> {
    const result = await kv.get<Tag>(["tags", tagId]);
    return result.value;
  }

  async deleteTag(tagId: number): Promise<void> {
    await kv.delete(["tags", tagId]);
  }

  async getTagsByCategory(category: string): Promise<Tag[]> {
    const tags = await this.getTags();
    return tags.filter(t => t.Category === category);
  }

  // ─── Global Settings ──────────────────────────────────────────
  
  async getSettings(): Promise<Record<string, string>> {
    const res = await kv.get<Record<string, string>>(["settings"]);
    return res.value || {};
  }

  async saveSetting(key: string, value: string): Promise<void> {
    const settings = await this.getSettings();
    settings[key] = value;
    await kv.set(["settings"], settings);
  }

  // ─── Symbol Mappings ──────────────────────────────────────────

  async getSymbolMappings(): Promise<Record<string, string>> {
    const res = await kv.get<Record<string, string>>(["symbol_mappings"]);
    return res.value || {};
  }

  async saveSymbolMapping(brokerSymbol: string, yahooSymbol: string): Promise<void> {
    const mappings = await this.getSymbolMappings();
    mappings[brokerSymbol] = yahooSymbol;
    await kv.set(["symbol_mappings"], mappings);
  }

  async deleteSymbolMapping(brokerSymbol: string): Promise<void> {
    const mappings = await this.getSymbolMappings();
    delete mappings[brokerSymbol];
    await kv.set(["symbol_mappings"], mappings);
  }

  // ─── Symbol Multipliers ───────────────────────────────────────

  async getSymbolMultipliers(): Promise<Record<string, number>> {
    const res = await kv.get<Record<string, number>>(["symbol_multipliers"]);
    return res.value || {};
  }

  async saveSymbolMultiplier(symbol: string, multiplier: number): Promise<void> {
    const multipliers = await this.getSymbolMultipliers();
    multipliers[symbol] = multiplier;
    await kv.set(["symbol_multipliers"], multipliers);
  }

  async deleteSymbolMultiplier(symbol: string): Promise<void> {
    const multipliers = await this.getSymbolMultipliers();
    delete multipliers[symbol];
    await kv.set(["symbol_multipliers"], multipliers);
  }

  // ─── Analytics helpers ────────────────────────────────────────

  async getSetupPerformance(): Promise<Record<number, { trades: number; wins: number; pnl: number }>> {
    const trades = await this.getTrades();
    const perf: Record<number, { trades: number; wins: number; pnl: number }> = {};
    for (const trade of trades) {
      if (trade.SetupIDs) {
        for (const setupId of trade.SetupIDs) {
          if (!perf[setupId]) perf[setupId] = { trades: 0, wins: 0, pnl: 0 };
          perf[setupId].trades++;
          perf[setupId].pnl += (trade.PnL || 0);
          if ((trade.PnL || 0) > 0) perf[setupId].wins++;
        }
      }
    }
    return perf;
  }

  // ─── Kline Data (Separate KV entry to avoid size limits on Trade object) ──

  async saveKlineData(tradeId: string, data: any): Promise<void> {
    // We use a separate key for klines. 
    // Note: Deno KV has a 64KB value limit. If klines are huge, we might need chunking,
    // but usually 1m/5m data for a single trade fits.
    try {
        await kv.set(["klines", tradeId], data);
    } catch (e) {
        console.error(`[StorageKV] Failed to save kline data for ${tradeId} (likely too large):`, e);
    }
  }

  async getKlineData(tradeId: string): Promise<any | null> {
    const result = await kv.get<any>(["klines", tradeId]);
    return result.value;
  }

  // ─── General Coach Advice ─────────────────────────────────────

  async saveGeneralAdvice(advice: string): Promise<void> {
    await kv.set(["general_coach_advice"], {
      advice,
      timestamp: Date.now() / 1000,
    });
  }

  async getGeneralAdvice(): Promise<{ advice: string; timestamp: number } | null> {
    const res = await kv.get<{ advice: string; timestamp: number }>(["general_coach_advice"]);
    return res.value;
  }
}

export const storage = new StorageKV();
