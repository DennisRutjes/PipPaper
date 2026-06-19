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

type Provider = "gemini" | "ollama";

function getProvider(): Provider {
    const envProvider = Deno.env.get("LLM_PROVIDER")?.toLowerCase();
    return (envProvider as Provider) || "gemini";
}

async function evaluateWithOllama(prompt: string, _chartImage?: string): Promise<AICoachResult> {
    const model = Deno.env.get("OLLAMA_MODEL") || "gemma4";
    const baseUrl = Deno.env.get("OLLAMA_BASE_URL") || "http://localhost:11434";
    
    try {
        const res = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model,
                messages: [{ role: "user", content: prompt }],
                stream: false,
            }),
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Ollama API error (${res.status}): ${err}`);
        }

        const data = await res.json();
        const text = data.message?.content || "No response from Ollama.";
        
        let rating: number | undefined;
        let grade: string | undefined;
        
        const ratingMatch = text.match(/(?:Rating|Score).*?(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*5/i);
        if (ratingMatch && ratingMatch[1]) {
            rating = parseFloat(ratingMatch[1]);
        }

        const gradeMatch = text.match(/(?:Trade Grade|Grade).*?([A-F][+-]?)/i);
        if (gradeMatch && gradeMatch[1]) {
            grade = gradeMatch[1].toUpperCase();
        }

        if ((rating === undefined || rating === 0) && grade) {
            if (grade.startsWith("A")) rating = 5;
            else if (grade.startsWith("B")) rating = 4;
            else if (grade.startsWith("C")) rating = 3;
            else if (grade.startsWith("D")) rating = 2;
            else if (grade.startsWith("F")) rating = 1;
        }

        return { advice: text, rating, grade, provider: "ollama", model };
    } catch (err) {
        throw new Error(`Ollama unavailable. Make sure Ollama is running with '${model}' model cached. Error: ${(err as Error).message}`);
    }
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

    return `You are an expert trading coach analyzing a completed trade. Be honest and direct.

CRITICAL GRADING PHILOSOPHY:
- Grade EXECUTION QUALITY and STRATEGY ADHERENCE, NOT the financial outcome.
- A loss that follows the strategy rules perfectly is a well-executed trade. Losses are an inherent, expected part of any profitable trading system. Do NOT penalize a trade simply because it lost money.
- A win with poor discipline (chasing, no stop, oversized risk) should be graded harshly.
- A loss with proper entry timing, correct stop placement, and correct position sizing should be graded HIGHLY.
- Ask: "Did the trader follow their plan?" If yes, the grade should reflect good execution regardless of P&L.

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
1. **Trade Grade**: [Grade A+ to F — based on execution quality and strategy adherence, NOT win/loss]
2. **Analysis**: [2 sentences max on execution quality and whether the plan was followed]
3. **Actionable Tip**: [1 sentence practical tip for improvement]
4. **Rating**: X/5
5. **Rating Reason**: [1 short sentence]

IMPORTANT: Be extremely concise. Total response under 100 words. Use markdown.`;
}

export async function evaluateTrade(trade: Trade, journalNotes?: string, chartImage?: string): Promise<AICoachResult> {
    const provider = getProvider();
    const prompt = await buildPrompt(trade, journalNotes);
    
    if (provider === "ollama") {
        return evaluateWithOllama(prompt, chartImage);
    }
    
    return evaluateWithGemini(prompt, chartImage);
}

async function evaluateWithGemini(prompt: string, chartImage?: string): Promise<AICoachResult> {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey || apiKey === "your_gemini_key_here") {
        throw new Error("GEMINI_API_KEY not configured. Add it to your .env file, or switch to local model (wllama/ollama) in LLM_PROVIDER.");
    }
    
    const settings = await storage.getSettings();
    const model = settings.ai_model || Deno.env.get("AI_MODEL") || "gemini-1.5-pro";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const parts: any[] = [{ text: prompt }];

    if (chartImage) {
        const base64Image = chartImage.replace(/^data:image\/\w+;base64,/, "");
        
        parts.push({
            inline_data: {
                mime_type: "image/png",
                data: base64Image
            }
        });
    }

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { 
                maxOutputTokens: 8192,
                temperature: 0.7,
            },
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
        // Extract rating with improved regex to handle decimals and markdown variations
        // Matches: "**Rating**: 4/5", "Rating: 4.5/5", "Rating: **4**/5", "Rating: 4 out of 5"
        const ratingMatch = text.match(/(?:Rating|Score).*?(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*5/i);
        if (ratingMatch && ratingMatch[1]) {
            rating = parseFloat(ratingMatch[1]);
        }

        // Extract grade
        const gradeMatch = text.match(/(?:Trade Grade|Grade).*?([A-F][+-]?)/i);
        if (gradeMatch && gradeMatch[1]) {
            grade = gradeMatch[1].toUpperCase();
        }

        // Fallback 1: Look for any "X/5" pattern if strict parsing failed
        if (rating === undefined || rating === 0) {
            const looseMatch = text.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
            if (looseMatch && looseMatch[1]) {
                rating = parseFloat(looseMatch[1]);
            }
        }

        // Fallback 2: If no rating found but grade exists, estimate rating
        if ((rating === undefined || rating === 0) && grade) {
            if (grade.startsWith("A")) rating = 5;
            else if (grade.startsWith("B")) rating = 4;
            else if (grade.startsWith("C")) rating = 3;
            else if (grade.startsWith("D")) rating = 2;
            else if (grade.startsWith("F")) rating = 1;
        }
    }

    return { advice: text, rating, grade, provider: "gemini", model };
}

export async function evaluateOverallPerformance(trades: Trade[]): Promise<AICoachResult> {
    const provider = getProvider();
    
    const recentTrades = trades
        .filter(t => !!t.AIAdvice || !!t.AIRating)
        .sort((a, b) => b.ExitTimestamp - a.ExitTimestamp)
        .slice(0, 20);

    if (recentTrades.length < 3) {
        throw new Error("Need at least 3 evaluated trades (with AI advice) to provide a meaningful meta-analysis. Evaluate individual trades first.");
    }

    const tradeSummaries = recentTrades.map(t => {
        const side = t.Side || ((t.EntryPrice || 0) > (t.ExitPrice || 0) && (t.PnL || 0) > 0 ? "SHORT" : "LONG");
        const pnl = t.PnL || 0;
        const result = pnl > 0 ? "WIN" : pnl < 0 ? "LONG" : "BREAKEVEN";
        const mistakes = t.Mistakes?.join(", ") || "None";
        const rating = t.AIRating ? `${t.AIRating}/5` : "N/A";
        const grade = t.AIGrade || "N/A";
        const date = new Date(t.ExitTimestamp * 1000).toLocaleDateString();
        const adviceSnippet = t.AIAdvice ? t.AIAdvice.substring(0, 200).replace(/\n/g, " ") + "..." : "No detailed advice";

        return `- [${date}] ${t.Symbol} (${side}): ${result} ($${pnl.toFixed(0)}), Setup: ${t.SetupIDs?.join(",") || "None"}, Mistakes: ${mistakes}, Rating: ${rating}, Grade: ${grade}. Previous AI Evaluation: "${adviceSnippet}"`;
    }).join("\n");

    const prompt = `You are a high-level trading performance mentor focusing strictly on PROCESS, DISCIPLINE, and EXECUTION quality. Your task is to perform a meta-analysis on the last ${recentTrades.length} trades, specifically looking at the patterns identified by the previous AI evaluations for each trade.

Historical Trade Evaluations:
${tradeSummaries}

Based on the data AND the previous AI evaluations provided above, provide a high-level coaching assessment. Focus on recurring psychological patterns, execution consistency, and strategic drift. Be extremely critical and honest. Do not sugarcoat bad habits. Call out psychological flaws directly.

CRITICAL GUIDELINE: Ignore the dollar amounts of wins or losses. Focus entirely on whether the trader followed their process, managed risk correctly, and avoided recurring mistakes. A "profitable" trade with bad process should be treated as a failure. A "loss" with perfect execution should be praised.

Format your response exactly as follows:
## 1. Strengths
[Bullet points on consistent positive habits in execution and discipline]

## 2. Weaknesses & Patterns
[Bullet points on recurring process failures or psychological traps highlighted across evaluations]

## 3. Key Insight
[One major observation about their current evolution in discipline and process adherence]

## 4. Action Plan
[1-2 specific process-based "homework" items for the next trading week - e.g., "Set a hard stop before entry", "Wait for 2nd candle confirmation"]

Keep it constructive, direct, and under 300 words. Use markdown.`;

    if (provider === "ollama") {
        return evaluateWithOllama(prompt);
    }
    
    return evaluateOverallWithGemini(prompt);
}

async function evaluateOverallWithGemini(prompt: string): Promise<AICoachResult> {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey || apiKey === "your_gemini_key_here") {
        throw new Error("GEMINI_API_KEY not configured. Add it to your .env file, or switch to local model (wllama/ollama) in LLM_PROVIDER.");
    }

    const settings = await storage.getSettings();
    const model = settings.ai_model || Deno.env.get("AI_MODEL") || "gemini-1.5-pro";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
                maxOutputTokens: 8192,
                temperature: 0.7,
            },
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini API error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No advice generated.";

    return { advice: text, provider: "gemini", model };
}
