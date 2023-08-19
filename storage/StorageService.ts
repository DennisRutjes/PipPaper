import { Storage } from "./ports/Storage.ts";
import { StorageSqlLite } from "./adapters/StorageSqlLite.ts";
import { Note } from "./entities/Note.ts";

import config from "../utils/config.ts";

class StorageService implements Storage {
  storagePort: Storage;

  constructor(database: string, scriptPath: string) {
    this.storagePort = new StorageSqlLite(database, scriptPath);
  }

  createNote(noteDate: number, note: string): object {
    return this.storagePort.createNote(noteDate, note);
  }

  listNotes(): Note[] {
    return this.storagePort.listNotes();
  }
}

export const Store = new StorageService(
  config.db.databasePath,
  "./storage/adapters/ScriptSqlLite.sql",
);

// Store.createNote(1, "test 1")
// Store.createNote(2, "test 2")
// Store.createNote(3, "test 3")
// console.log(Store.createNote(4, "test 4"))
