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

        const costObj = (await importer.readCosts("Cash History.csv"))
            .filter((cost: Cost) => cost.Type !== "Trade Paired")
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
                Amount: totalAmount,
                tradeFillRefs: 0 // used to get the adjusted cost for fills reference by date
            }
        });

        // Sort the summary by 'Timestamp'
        const sortedCostSummary = costSummary.sort((a: Cost, b: Cost) => a.Timestamp - b.Timestamp);

        const costsSummaryMap = groupBy(sortedCostSummary, "Timestamp")


        const trades = ((await importer.readTrades("Performance.csv")))

        trades.map((trade: Trade) => {
            const entryKey = `${trade.EntryTimestamp}`
            if (entryKey in costsSummaryMap) {
                costsSummaryMap[entryKey][0].tradeFillRefs++
            }
            const exitKey = `${trade.ExitTimestamp}`
            if (exitKey in costsSummaryMap) {
                costsSummaryMap[exitKey][0].tradeFillRefs++
            }
        })


        return trades
            .map((trade: Trade) => {
                try {
                    let adjustedAverageCosts = 0.00
                    const entryKey = `${trade.EntryTimestamp}`
                    if (entryKey in costsSummaryMap) {
                        const tc = costsSummaryMap[entryKey][0]
                        adjustedAverageCosts += tc.Amount / tc.tradeFillRefs
                    }
                    const exitKey = `${trade.ExitTimestamp}`
                    if (exitKey in costsSummaryMap) {
                        const tc = costsSummaryMap[exitKey][0]
                        adjustedAverageCosts += tc.Amount / tc.tradeFillRefs
                    }

                    //console.log(adjustedAverageCosts)
                    trade.AdjustedCost = adjustedAverageCosts

                    store.createTrade(trade)
                    return 1
                } catch (e) {
                    if (e.message.startsWith("UNIQUE constraint failed")) {
                        return 0
                    }
                    console.log("error:", e)
                    return 0
                }
            }).reduce(sum, 0);
    }
}


export const Importer = new ImporterService(store);