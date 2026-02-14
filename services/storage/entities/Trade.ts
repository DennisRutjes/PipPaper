export type EntryReason = "market" | "limit" | "stop" | "other" | null;
export type ExitReason = "market" | "limit" | "stop_loss" | "trailing_stop" | "take_profit" | "time_exit" | "other" | null;

export interface Trade {
    TradeID: number;
    BrokerTradeID: string;
    Symbol: string | null;
    Broker: string | null;
    Quantity: number | null;
    PnL: number | null;
    AdjustedCost: number | null;
    Currency: string | null;
    EntryPrice: number | null;
    EntryTimestamp: number;
    ExitPrice: number | null;
    ExitTimestamp: number;
    // Extended fields
    SetupIDs?: number[];        // Links to playbook setups
    Mistakes?: string[];        // Mistake tags (free-form strings)
    StopLoss?: number | null;
    ProfitTarget?: number | null;
    Side?: "LONG" | "SHORT" | null;
    Rating?: number | null;     // 1-5 star trade rating
    IsManual?: boolean;         // True if manually entered (not imported)
    // Entry/Exit reasons
    EntryReason?: EntryReason;
    ExitReason?: ExitReason;
    EntryNotes?: string | null;  // Brief notes on why entered
    ExitNotes?: string | null;   // Brief notes on why exited
    // AI Coach
    AIAdvice?: string | null;    // Persisted AI coach evaluation
    AIProvider?: string | null;  // Which LLM provided the advice (gemini/claude)
    AITimestamp?: number | null;  // When the advice was generated
    AIRating?: number | null;    // AI-generated rating (1-5)
    KlineData?: any;             // Cached kline data { symbol, interval, candles, fetchedAt }
    createdAt: number | null;
    updatedAt: number | null;
}
