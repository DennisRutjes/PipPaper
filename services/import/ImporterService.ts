import {TradovateImporter} from "./tradovate/TradovateImporter.ts";
import {storage, StorageKV} from "../storage/StorageKV.ts";
import {Trade} from "../storage/entities/Trade.ts";
import {groupBy} from "../utils/utils.ts";

export class ImporterService {
    store: StorageKV;

    constructor(store: StorageKV) {
        this.store = store;
    }

    async importTradovateTrades(content: string): Promise<number> {
        const importer = new TradovateImporter(""); // Path not needed for content import
        const trades = await importer.parseTrades(content);
        
        let count = 0;
        for (const trade of trades) {
            await this.store.saveTrade(trade);
            count++;
        }
        return count;
    }





}

export const Importer = new ImporterService(storage);