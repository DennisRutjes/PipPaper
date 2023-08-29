import {TradovateImporter} from "./tradovate/TradovateImporter.ts";
import {StorageService, store,} from "../storage/StorageService.ts";
import {Trade} from "../storage/entities/Trade.ts";
import {SqliteError} from "https://deno.land/x/sqlite@v3.8/src/error.ts";
import {Cost} from "../storage/entities/Cost.ts";
import {groupBy} from "../utils/utils.ts";


export class ImporterService {
    store: StorageService;

    constructor(store: StorageService) {
        this.store = store;
    }


    async importTradovate(path: string): Promise<number> {
        const sum = (total: number, value: number) => total + value;
        const importer: TradovateImporter = new TradovateImporter(path);

        const costObj = (await importer.readCosts("Cash History.csv")).filter((cost: Cost) => cost.Type !== "Trade Paired")
        // Group cost objects by 'Timestamp'
        const groupedCosts = groupBy(costObj, "Timestamp");

        // Extract keys (timestamps) and map to a new shape
        const costSummary = Object.keys(groupedCosts).map(timestamp => {
            // Calculate total 'Amount' for the current timestamp
            const totalAmount = groupedCosts[timestamp].reduce((total: number, cost: Cost) => total + cost.Amount, 0)

            // Return new 'Cost' object
            return <Cost>{
                Type: "Total Costs",
                Timestamp: +timestamp,
                Amount: totalAmount
            }
        });

        // Sort the summary by 'Timestamp'
        const sortedCostSummary = costSummary.sort((a: Cost, b: Cost) => a.Timestamp - b.Timestamp);
        console.log(sortedCostSummary)

        // todo
        // read fills ->

        return ((await importer.readTrades("Performance.csv"))
            .map((trade: Trade) => {
                try {
                    store.createTrade(trade)
                    return 1
                } catch (e) {
                    if (e.message.startsWith("UNIQUE constraint failed")) {
                        return 0
                    }
                    console.log("error:", e)
                    return 0
                }
            })).reduce(sum, 0);
    }
}


export const Importer = new ImporterService(store);