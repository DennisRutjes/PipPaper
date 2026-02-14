import { Trade } from "../storage/entities/Trade.ts";
import { storage } from "../storage/StorageKV.ts";
import { getSymbolMultiplier } from "../config/SymbolConfig.ts";

export interface AICoachResult {
    advice: string;
    rating?: number;
    grade?: string;
    provider: string;
    model: string;
}

async function buildPrompt(trade: Trade, journalNotes?: string): Promise<string> {
    const side = trade.Side || ((trade.EntryPrice || 0) > (trade.ExitPrice || 0) && (trade.PnL || 0) > 0 ? "SHORT" : "LONG");
    const pnl = trade.PnL || 0;
    const netPnl = pnl + (trade.AdjustedCost || 0);
    const durationMs = Math.abs(trade.ExitTimestamp - trade.EntryTimestamp) * 1000;
    const durationMin = Math.round(durationMs / 60000);
    
    // Calculate R-Multiple with Multiplier
    let rMultiple = "N/A";
    if (trade.StopLoss && trade.EntryPrice) {
        const riskPrice = Math.abs(trade.EntryPrice - trade.StopLoss);
        if (riskPrice > 0) {
            const multiplier = await getSymbolMultiplier(trade.Symbol || "");
            const riskDollars = riskPrice * multiplier * (trade.Quantity || 1);
            
            if (riskDollars > 0) {
                const r = netPnl / riskDollars;
                rMultiple = r.toFixed(2) + "R";
            }
        }
    }

    return `You are an expert trading coach analyzing a completed trade. Provide constructive, actionable feedback and a rating.

Trade Details:
- Symbol: ${trade.Symbol}
- Side: ${side}
- Result: ${netPnl > 0 ? "WIN" : netPnl < 0 ? "LOSS" : "BREAKEVEN"}
- Entry Price: $${trade.EntryPrice}
- Exit Price: $${trade.ExitPrice}
- Quantity: ${trade.Quantity}
- Gross P&L: $${pnl.toFixed(2)}
- Net P&L: $${netPnl.toFixed(2)}
- Commissions: $${Math.abs(trade.AdjustedCost || 0).toFixed(2)}
- Duration: ${durationMin} minutes
- Stop Loss: ${trade.StopLoss ? "$" + trade.StopLoss : "Not set"}
- Profit Target: ${trade.ProfitTarget ? "$" + trade.ProfitTarget : "Not set"}
- R-Multiple (Realized): ${rMultiple}
- Entry Type: ${trade.EntryReason || "Unknown"}
- Exit Type: ${trade.ExitReason || "Unknown"}
- Entry Notes: ${trade.EntryNotes || "None"}
- Exit Notes: ${trade.ExitNotes || "None"}
- Mistakes Tagged: ${trade.Mistakes?.join(", ") || "None"}

${journalNotes ? "Trader's Journal Notes:\n" + journalNotes : ""}

Provide your analysis in this format:
1. **Trade Grade**: [Grade]
2. **Analysis**: [2 sentences max on what went well and what didn't]
3. **Actionable Tip**: [1 sentence practical tip]
4. **Rating**: X/5
5. **Rating Reason**: [1 short sentence]

IMPORTANT: Be extremely concise. Total response under 100 words. Use markdown.`;
}

export async function evaluateTrade(trade: Trade, journalNotes?: string): Promise<AICoachResult> {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey || apiKey === "your_gemini_key_here") {
        throw new Error("GEMINI_API_KEY not configured. Add it to your .env file.");
    }

    const prompt = await buildPrompt(trade, journalNotes);
    
    // Get model from settings, env, or default to flagship
    const settings = await storage.getSettings();
    const model = settings.ai_model || Deno.env.get("AI_MODEL") || "gemini-1.5-pro";

    // Use Gemini REST API directly (no npm dependency needed)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1024 },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("Gemini API error:", err);
        throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    console.log("Gemini Response:", JSON.stringify(data, null, 2));
    
    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    let rating: number | undefined;
    let grade: string | undefined;
    
    if (!text) {
        if (data.error) {
            text = `API Error: ${data.error.message}`;
        } else if (data.promptFeedback) {
            text = `Safety Block: ${JSON.stringify(data.promptFeedback)}`;
        } else {
            text = `Unexpected response format: ${JSON.stringify(data).substring(0, 200)}...`;
        }
    } else {
        // Extract rating
        const ratingMatch = text.match(/\*\*Rating\*\*:?\s*(\d)\/5/i) || text.match(/Rating:?\s*(\d)\/5/i);
        if (ratingMatch && ratingMatch[1]) {
            rating = parseInt(ratingMatch[1]);
        }

        // Extract grade
        const gradeMatch = text.match(/\*\*Trade Grade\*\*:?\s*([A-F][+-]?)/i) || text.match(/Trade Grade:?\s*([A-F][+-]?)/i);
        if (gradeMatch && gradeMatch[1]) {
            grade = gradeMatch[1].toUpperCase();
        }
    }

    return { advice: text, rating, grade, provider: "gemini", model };
}
