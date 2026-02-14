import {TradovateImporter} from "./tradovate/TradovateImporter.ts";
import {storage, StorageKV} from "../storage/StorageKV.ts";
import {Trade} from "../storage/entities/Trade.ts";
import {groupBy} from "../utils/utils.ts";

export class ImporterService {
    store: StorageKV;

    constructor(store: StorageKV) {
        this.store = store;
    }

    async importTradovateTrades(content: string): Promise<string[]> {
        const importer = new TradovateImporter(""); // Path not needed for content import
        const trades = await importer.parseTrades(content);
        
        const importedIds: string[] = [];
        for (const trade of trades) {
            // Check if trade already exists to prevent overwriting manual data (notes, tags, etc.)
            const existing = await this.store.getTrade(trade.BrokerTradeID);
            if (!existing) {
                await this.store.saveTrade(trade);
                importedIds.push(trade.BrokerTradeID);
            }
        }
        return importedIds;
    }





}

export const Importer = new ImporterService(storage);