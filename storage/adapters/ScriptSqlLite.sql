
-- Create a table to store notes
create TABLE IF NOT EXISTS Note (
    NoteID INTEGER PRIMARY KEY AUTOINCREMENT,
    NoteDate INTEGER NOT NULL,
    Note TEXT NOT NULL
);

-- Create a table to store trade information
create TABLE IF NOT EXISTS Trade (
    TradeID INTEGER PRIMARY KEY AUTOINCREMENT,
    Symbol TEXT,
    Broker TEXT,
    Quantity INTEGER,
    PnL DECIMAL(10, 2),
    Currency TEXT,
    EntryPrice DECIMAL(10, 2),
    EntryTimestamp INTEGER,
    ExitPrice DECIMAL(10, 2),
    ExitTimestamp INTEGER
);

create TABLE IF NOT EXISTS TradeDetail (
    TradeID INTEGER PRIMARY KEY,
    EntryReason TEXT,
    ExitReason TEXT,
    Outcome TEXT,
    FOREIGN KEY (TradeID) REFERENCES Trade(TradeID)
);

-- Create a table to store trade tags or categories
create TABLE IF NOT EXISTS TradeTag (
    TradeID INTEGER,
    TagName TEXT,
    TagValue TEXT,
    PRIMARY KEY (TradeID, TagName),
    FOREIGN KEY (TradeID) REFERENCES Trade(TradeID)
);

-- Create a table to store additional trade details
create TABLE IF NOT EXISTS TradeDetail (
    TradeID INTEGER PRIMARY KEY,
    EntryTimestamp INTEGER,
    ExitTimestamp INTEGER,
    EntryReason TEXT,
    ExitReason TEXT,
    Outcome TEXT,
    FOREIGN KEY (TradeID) REFERENCES Trade(TradeID)
);



-- Create a table to store trade-related expenses
create TABLE IF NOT EXISTS TradeExpense (
    TradeID INTEGER,
    ExpenseType TEXT,
    Amount DECIMAL(10, 2),
    FOREIGN KEY (TradeID) REFERENCES Trade(TradeID)
);

-- Create a table to store trade-related documents
create TABLE IF NOT EXISTS TradeNote (
    TradeID INTEGER,
    NoteID Integer,
    FOREIGN KEY (NoteID) REFERENCES Note(TradeID),
    FOREIGN KEY (TradeID) REFERENCES Trade(TradeID)
);

-- Create a table to store trade-related documents
create TABLE IF NOT EXISTS TradeDocument (
    TradeID INTEGER,
    DocumentName TEXT,
    FilePath TEXT,
    FOREIGN KEY (TradeID) REFERENCES Trade(TradeID)
);
