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
    createdAt: number | null;
    updatedAt: number | null;
}