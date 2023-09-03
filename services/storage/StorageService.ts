import {Storage} from "./ports/Storage.ts";
import {StorageSqlite} from "./adapters/sqlite/StorageSqlite.ts";
import {Note} from "./entities/Note.ts";

import config from "../../utils/config.ts";
import {Trade} from "./entities/Trade.ts";

export class StorageService implements Storage {
    storagePort: Storage;

    constructor(database: string, scriptPath: string) {
        this.storagePort = new StorageSqlite(database, scriptPath);
    }

    createNote(note: Note): Note {
        return this.storagePort.createNote(note);
    }

    listNotes(): Note[] {
        return this.storagePort.listNotes();
    }

    createTrade(trade: Trade): Trade {
        return this.storagePort.createTrade(trade);
    }

    listTrades(): Trade[] {
        return this.storagePort.listTrades();
    }

    getTrade(tradeID: number): Trade {
        return this.storagePort.getTrade(tradeID)
    }
}

export const store = new StorageService(
    config.db.databaseURL,
    "services/storage/adapters/sqlite/scriptSqlite.sql",
);

// Store.createNote({NoteData: "data 1"})
// Store.createNote({NoteData: "data 3"})
// Store.createNote({NoteData: "data 3"})
// Store.createNote({NoteData: "data 4"})
// console.log(Store.createNote({NoteData: "test 4"}))
