import {TradovateImporter} from "./tradovate/TradovateImporter.ts";
import {StorageService, store,} from "../storage/StorageService.ts";
import {Trade} from "../storage/entities/Trade.ts";
import {SqliteError} from "https://deno.land/x/sqlite@v3.8/src/error.ts";


export class ImporterService {
    store: StorageService;

    constructor(store: StorageService) {
        this.store = store;
    }


    async importTradovate(path: string): Promise<number> {
        const sum = (total: number, value: number) => total + value;
        const importer: TradovateImporter = new TradovateImporter(path);

        return ((await importer.readTrades("Performance.csv"))
            .map((trade: Trade) => {
                try {
                    store.createTrade(trade)
                    return 1
                } catch (e) {
                    if (e.message.startsWith("UNIQUE constraint failed")) {
                        return 0
                    }
                    console.log("error:",e)
                    return 0
                }
            })).reduce(sum, 0);
    }
}


export const Importer = new ImporterService(store);