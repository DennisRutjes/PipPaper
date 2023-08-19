import * as sqlite from "https://deno.land/x/sqlite@v3.7.3/mod.ts";
import {Storage} from "../ports/Storage.ts";
import {Note} from "../entities/Note.ts";
import readTextFileSync = Deno.readTextFileSync;



export class StorageSqlLite implements Storage {
    db: sqlite.DB;

    initScript(path: string): void {
        console.log("initializing database :" + path);
        const sql = readTextFileSync(path);
        this.db.execute(sql);
    }

    constructor(databasePath: string, scriptPath: string) {
        this.db = new sqlite.DB(databasePath);
        this.initScript(scriptPath);
    }

    createNote(noteDate: number, note: string): object {
        this.db.query(
            "INSERT INTO Note (NoteDate, Note) VALUES (:NoteDate, :Note)",
            {
                NoteDate: noteDate,
                Note: note,
            },
        );

        // array destructerizing
        const [first] = this.db.query(
            "SELECT NoteID, NoteDate, Note FROM Note ORDER BY NoteID DESC LIMIT 1",
        )
            .map(([NoteID, NoteDate, Note]) => {
                return <Note>{
                    NoteID: NoteID,
                    NoteDate: NoteDate,
                    Note: Note,
                };
            });
        return first;
    }

    listNotes(): Note[] {
        return this.db.query(
            "SELECT NoteID, NoteDate, Note FROM Note ORDER BY NoteID DESC",
        )
            .map(([NoteID, NoteDate, Note]) => {
                return <Note>{
                    NoteID: NoteID,
                    NoteDate: NoteDate,
                    Note: Note,
                };
            });
    }
}
