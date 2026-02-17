import { Handlers } from "$fresh/server.ts";
import { storage } from "../../services/storage/StorageKV.ts";
import { fetchKlines } from "../../services/kline/KlineService.ts";

export const handler: Handlers = {
    async GET(req) {
        try {
            const url = new URL(req.url);
            const tradeId = url.searchParams.get("tradeId");
            const forceRefresh = url.searchParams.get("refresh") === "1";

            if (!tradeId) {
                return new Response(JSON.stringify({ error: "Missing tradeId" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            const trade = await storage.getTrade(tradeId);
            if (!trade) {
                return new Response(JSON.stringify({ error: "Trade not found" }), {
                    status: 404,
                    headers: { "Content-Type": "application/json" },
                });
            }

            // 1. Check if kline data is already persisted in separate KV store
            let klineData = await storage.getKlineData(tradeId);
            
            // 2. Fallback: Check if it's stored on the trade object (legacy)
            if (!klineData && trade.KlineData) {
                // Only migrate if it looks valid (has candles)
                if (trade.KlineData.candles && trade.KlineData.candles.length > 0) {
                    console.log(`[Kline] Migrating legacy data for ${tradeId}`);
                    klineData = trade.KlineData;
                    // Migrate to new storage
                    await storage.saveKlineData(tradeId, klineData);
                } else {
                    console.log(`[Kline] Legacy data for ${tradeId} is invalid/empty. Skipping migration.`);
                }
            }

            // Return cached if available, valid, and not forcing refresh
            if (klineData && klineData.candles && klineData.candles.length > 0 && !forceRefresh) {
                return new Response(JSON.stringify({
                    success: true,
                    cached: true,
                    ...klineData,
                    entryTimestamp: trade.EntryTimestamp,
                    exitTimestamp: trade.ExitTimestamp,
                    entryPrice: trade.EntryPrice,
                    exitPrice: trade.ExitPrice,
                    side: trade.Side,
                    stopLoss: trade.StopLoss,
                    profitTarget: trade.ProfitTarget,
                }), {
                    headers: { "Content-Type": "application/json" },
                });
            }

            // 3. Fetch fresh kline data (only if missing or forced)
            klineData = await fetchKlines(
                trade.Symbol || "SPY",
                trade.EntryTimestamp,
                trade.ExitTimestamp,
            );

            // 4. Persist it permanently
            await storage.saveKlineData(tradeId, klineData);

            return new Response(JSON.stringify({
                success: true,
                cached: false,
                ...klineData,
                entryTimestamp: trade.EntryTimestamp,
                exitTimestamp: trade.ExitTimestamp,
                entryPrice: trade.EntryPrice,
                exitPrice: trade.ExitPrice,
                side: trade.Side,
                stopLoss: trade.StopLoss,
                profitTarget: trade.ProfitTarget,
            }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            console.error("Kline fetch error:", e);
            return new Response(JSON.stringify({ error: (e as Error).message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },
};
