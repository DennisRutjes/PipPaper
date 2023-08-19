import { Note } from "../entities/Note.ts";

export interface Storage {
  createNote(noteDate: number, note: string): object;

  listNotes(): Note[];
}
