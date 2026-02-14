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

            // Return cached if available and not forcing refresh
            if (trade.KlineData && !forceRefresh) {
                return new Response(JSON.stringify({
                    success: true,
                    cached: true,
                    ...trade.KlineData,
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

            // Fetch fresh kline data
            const klineData = await fetchKlines(
                trade.Symbol || "SPY",
                trade.EntryTimestamp,
                trade.ExitTimestamp,
            );

            // Cache it on the trade
            await storage.updateTrade(tradeId, { KlineData: klineData });

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
