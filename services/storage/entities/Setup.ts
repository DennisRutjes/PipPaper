export interface Setup {
    SetupID?: number;
    Name: string;              // e.g. "Morning Reversal", "Breakout", "VWAP Bounce"
    Description?: string;      // Rich HTML description of the strategy
    Rules?: string;            // Rich HTML with entry/exit rules
    Color: string;             // Hex color for the tag pill (e.g. "#10b981")
    createdAt?: number;
    updatedAt?: number;
}
