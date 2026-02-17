import { Handlers } from "$fresh/server.ts";
import { storage } from "../../services/storage/StorageKV.ts";
import { evaluateTrade } from "../../services/ai/AICoachService.ts";

export const handler: Handlers = {
    async POST(req) {
        try {
            const { tradeId, journalNotes, chartImage } = await req.json();

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

            const result = await evaluateTrade(trade, journalNotes, chartImage);

            // Persist the advice on the trade
            await storage.updateTrade(tradeId, {
                AIAdvice: result.advice,
                AIRating: result.rating,
                AIGrade: result.grade,
                AIProvider: `${result.provider}/${result.model}`,
                AITimestamp: Date.now() / 1000,
            });

            return new Response(JSON.stringify({
                success: true,
                advice: result.advice,
                rating: result.rating,
                grade: result.grade,
                provider: result.provider,
                model: result.model,
            }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            console.error("AI Coach error:", e);
            return new Response(JSON.stringify({ error: (e as Error).message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },
};
