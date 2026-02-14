export type NoteType = "journal" | "trade" | "daily_plan";

export interface Note {
    NoteID?: number;
    NoteData: string;        // Rich HTML content from Quill
    NoteType: NoteType;      // "journal" | "trade" | "daily_plan"
    TradeID?: string;        // Linked trade (for trade notes)
    PlanDate?: string;       // Date string YYYY-MM-DD (for daily plans)
    createdAt?: number;
    updatedAt?: number;
}
