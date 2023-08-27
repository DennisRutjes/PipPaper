import { Note } from "../entities/Note.ts";
import {Trade} from "../entities/Trade.ts";

export interface Storage {
listTrades(): Trade[];
  createNote(note:Note): Note;

  listNotes(): Note[];

  createTrade(trade: Trade): Trade;
}
