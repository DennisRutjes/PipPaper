import * as sqlite from "https://deno.land/x/sqlite@v3.8/mod.ts";
import {Storage} from "../../ports/Storage.ts";
import {Note} from "../../entities/Note.ts";
import {Trade} from "../../entities/Trade.ts";
import readTextFileSync = Deno.readTextFileSync;

function Now() {
    return Date.now()
}

export class StorageSqlite implements Storage {
    db: sqlite.DB;

    initScript(path: string): void {
        console.log("initializing database: " + path);
        const sql = readTextFileSync(path);
        this.db.execute(sql);
    }

    constructor(databasePath: string, scriptPath: string) {
        this.db = new sqlite.DB(databasePath);
        this.initScript(scriptPath);
    }

    createTrade(trade: Trade): Trade {
        const now = Now()
        this.db.query(
            "INSERT INTO Trade (BrokerTradeID, Symbol, Broker, Quantity, PnL, AdjustedCost, Currency, EntryPrice, EntryTimestamp, ExitPrice, ExitTimestamp, createdAt, updatedAt) VALUES (:BrokerTradeID, :Symbol, :Broker, :Quantity, :PnL, :AdjustedCost, :Currency, :EntryPrice, :EntryTimestamp, :ExitPrice, :ExitTimestamp, :createdAt,:updatedAt)",
            {
                BrokerTradeID: trade.BrokerTradeID,
                Symbol: trade.Symbol,
                Broker: trade.Broker,
                Quantity: trade.Quantity,
                PnL: trade.PnL,
                AdjustedCost: trade.AdjustedCost,
                Currency: trade.Currency,
                EntryPrice: trade.EntryPrice,
                EntryTimestamp: trade.EntryTimestamp,
                ExitPrice: trade.ExitPrice,
                ExitTimestamp: trade.ExitTimestamp,
                createdAt: now,
                updatedAt: now,
            },
        );

        // array destructerizing
        const [first] = this.db.query(
            "SELECT * FROM Trade ORDER BY TradeID DESC LIMIT 1",
        )
            .map(([TradeID, BrokerTradeID,
                      Symbol, Broker, Quantity,
                      PnL, AdjustedCost, Currency,
                      EntryPrice, EntryTimestamp,
                      ExitPrice, ExitTimestamp,
                      createdAt, updatedAt]) => {
                return <Trade>{
                    TradeID: TradeID, BrokerTradeID: BrokerTradeID,
                    Symbol: Symbol, Broker: Broker, Quantity: Quantity,
                    PnL: PnL, AdjustedCost: AdjustedCost, Currency: Currency,
                    EntryPrice: EntryPrice,
                    EntryTimestamp: EntryTimestamp,
                    ExitPrice: ExitPrice,
                    ExitTimestamp: ExitTimestamp,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                };
            });
        return first;
    }


    createNote(note: Note): Note {
        this.db.query(
            "INSERT INTO Note (NoteData, createdAt, updatedAt) VALUES (:NoteData, strftime('%s', 'now'), strftime('%s', 'now'))",
            {
                NoteData: note.NoteData
            },
        );

        // array destructerizing
        const [first] = this.db.query(
            "SELECT * FROM Note ORDER BY NoteID DESC LIMIT 1",
        )
            .map(([NoteID, NoteData, createdAt, updatedAt]) => {
                return <Note>{
                    NoteID: NoteID,
                    NoteData: NoteData,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                };
            });
        return first;
    }

    listNotes(): Note[] {
        return this.db.query(
            "SELECT * FROM Note ORDER BY NoteID DESC",
        )
            .map(([NoteID, NoteData, createdAt, updatedAt]) => {
                return <Note>{
                    NoteID: NoteID,
                    NoteData: NoteData,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                };
            });
    }

    listTrades(): Trade[] {
        return this.db.query("SELECT * FROM Trade ORDER BY TradeID ASC")
            .map(([TradeID, BrokerTradeID,
                      Symbol, Broker, Quantity,
                      PnL, AdjustedCost, Currency,
                      EntryPrice, EntryTimestamp,
                      ExitPrice, ExitTimestamp,
                      createdAt, updatedAt]) => {
                return <Trade>{
                    TradeID: TradeID, BrokerTradeID: BrokerTradeID,
                    Symbol: Symbol, Broker: Broker, Quantity: Quantity,
                    PnL: PnL, AdjustedCost: AdjustedCost, Currency: Currency,
                    EntryPrice: EntryPrice,
                    EntryTimestamp: EntryTimestamp,
                    ExitPrice: ExitPrice,
                    ExitTimestamp: ExitTimestamp,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                };
            });
    }

    getTrade(tradeID: number): Trade {
        const [first] = this.db.query(
            "SELECT * FROM Trade WHERE TradeID=:tradeID",
            {tradeID: tradeID}
        )
            .map(([TradeID, BrokerTradeID,
                      Symbol, Broker, Quantity,
                      PnL, AdjustedCost, Currency,
                      EntryPrice, EntryTimestamp,
                      ExitPrice, ExitTimestamp,
                      createdAt, updatedAt]) => {
                return <Trade>{
                    TradeID: TradeID, BrokerTradeID: BrokerTradeID,
                    Symbol: Symbol, Broker: Broker, Quantity: Quantity,
                    PnL: PnL, AdjustedCost: AdjustedCost, Currency: Currency,
                    EntryPrice: EntryPrice,
                    EntryTimestamp: EntryTimestamp,
                    ExitPrice: ExitPrice,
                    ExitTimestamp: ExitTimestamp,
                    createdAt: createdAt,
                    updatedAt: updatedAt
                };
            });

        return first
    }
}
