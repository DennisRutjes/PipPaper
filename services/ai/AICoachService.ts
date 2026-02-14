import { GoogleGenerativeAI } from "npm:@google/generative-ai";
import { Trade } from "../storage/entities/Trade.ts";

export class AICoachService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    }

    async evaluateTrade(trade: Trade, notes?: string): Promise<string> {
        const prompt = `
        You are an expert trading coach. Analyze the following trade and provide constructive feedback.
        Focus on risk management, execution, and potential psychological factors.
        
        Trade Details:
        - Symbol: ${trade.Symbol}
        - Side: ${(trade.EntryPrice || 0) > (trade.ExitPrice || 0) && (trade.PnL || 0) > 0 ? "SHORT" : "LONG"}
        - Entry Price: ${trade.EntryPrice}
        - Exit Price: ${trade.ExitPrice}
        - Quantity: ${trade.Quantity}
        - P&L: $${(trade.PnL || 0).toFixed(2)}
        - Duration: ${new Date(trade.ExitTimestamp * 1000).getTime() - new Date(trade.EntryTimestamp * 1000).getTime()} ms
        
        Trader's Notes:
        ${notes || "No notes provided."}
        
        Provide a concise analysis (max 3 bullet points) and one actionable tip for improvement.
        `;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Error generating AI evaluation:", error);
            return "Unable to evaluate trade at this time. Please check your API key and try again.";
        }
    }
}
