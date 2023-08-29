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
  EntryTimestamp: number | null;
  ExitPrice: number | null;
  ExitTimestamp: number | null;
  createdAt: number | null;
  updatedAt: number | null;
}