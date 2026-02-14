/// <reference lib="deno.unstable" />
import { Trade } from "./entities/Trade.ts";

const kv = await Deno.openKv();

export class StorageKV {
  async saveTrade(trade: Trade): Promise<void> {
    // Use BrokerTradeID as the key, or generate a new ID if needed.
    // Assuming BrokerTradeID is unique per broker.
    const key = ["trades", trade.BrokerTradeID];
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

  async clearTrades(): Promise<void> {
    const entries = kv.list({ prefix: ["trades"] });
    for await (const entry of entries) {
      await kv.delete(entry.key);
    }
  }
}

export const storage = new StorageKV();
