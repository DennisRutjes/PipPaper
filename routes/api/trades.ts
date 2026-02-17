import { Handlers } from "$fresh/server.ts";
import { storage } from "../../services/storage/StorageKV.ts";
import { Trade } from "../../services/storage/entities/Trade.ts";

export const handler: Handlers = {
    // GET /api/trades - list all trades
    async GET(_req) {
        try {
            const trades = await storage.getTrades();
            return new Response(JSON.stringify(trades), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: (e as Error).message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },

    // POST /api/trades — manual trade entry
    async POST(req) {
        try {
            const body = await req.json();
            const {
                symbol, side, entryPrice, exitPrice, quantity,
                entryDate, entryTime, exitDate, exitTime,
                stopLoss, profitTarget, pnl, commission
            } = body;

            if (!symbol || !entryPrice || !exitPrice || !quantity) {
                return new Response(JSON.stringify({ error: "Missing required fields: symbol, entryPrice, exitPrice, quantity" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            const entryTs = new Date(`${entryDate}T${entryTime || "09:30"}:00`).getTime() / 1000;
            const exitTs = new Date(`${exitDate || entryDate}T${exitTime || "16:00"}:00`).getTime() / 1000;

            const ep = parseFloat(entryPrice);
            const xp = parseFloat(exitPrice);
            const qty = parseInt(quantity);
            const calculatedPnl = pnl !== undefined && pnl !== ""
                ? parseFloat(pnl)
                : (side === "SHORT" ? (ep - xp) * qty : (xp - ep) * qty);

            const tradeId = `manual_${Date.now()}`;

            const trade: Trade = {
                TradeID: Date.now(),
                BrokerTradeID: tradeId,
                Symbol: symbol.toUpperCase(),
                Broker: "Manual",
                Quantity: qty,
                PnL: calculatedPnl,
                AdjustedCost: commission ? -Math.abs(parseFloat(commission)) : 0,
                Currency: "USD",
                EntryPrice: ep,
                EntryTimestamp: entryTs,
                ExitPrice: xp,
                ExitTimestamp: exitTs,
                Side: side || null,
                StopLoss: stopLoss ? parseFloat(stopLoss) : null,
                ProfitTarget: profitTarget ? parseFloat(profitTarget) : null,
                IsManual: true,
                createdAt: Date.now() / 1000,
                updatedAt: Date.now() / 1000,
            };

            await storage.saveTrade(trade);

            return new Response(JSON.stringify({ success: true, tradeId, trade }), {
                status: 201,
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: (e as Error).message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },

    // DELETE /api/trades?id=xxx
    async DELETE(req) {
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) {
            return new Response(JSON.stringify({ error: "Missing trade id" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        await storage.deleteTrade(id);
        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" },
        });
    },
};
