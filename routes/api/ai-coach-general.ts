import { Handlers } from "$fresh/server.ts";
import { storage } from "../../services/storage/StorageKV.ts";
import { evaluateOverallPerformance } from "../../services/ai/AICoachService.ts";

export const handler: Handlers = {
    async GET() {
        try {
            const data = await storage.getGeneralAdvice();
            return new Response(JSON.stringify(data || { advice: null, timestamp: 0 }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: (e as Error).message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },
    async POST() {
        try {
            const trades = await storage.getTrades();
            
            // Generate fresh advice
            const result = await evaluateOverallPerformance(trades);
            
            // Persist
            await storage.saveGeneralAdvice(result.advice);
            
            return new Response(JSON.stringify({
                success: true,
                advice: result.advice,
                timestamp: Date.now() / 1000,
            }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: (e as Error).message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },
};
