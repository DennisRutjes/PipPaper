export interface Candle {
    t: number;   // timestamp (seconds)
    o: number;   // open
    h: number;   // high
    l: number;   // low
    c: number;   // close
    v: number;   // volume
}

export interface KlineData {
    symbol: string;
    interval: string;
    candles: Candle[];
    fetchedAt: number;
}

// Simple symbol mapping for futures → Yahoo Finance ticker
const SYMBOL_MAP: Record<string, string> = {
    "ES": "ES=F",
    "NQ": "NQ=F",
    "MES": "ES=F",
    "MNQ": "NQ=F",
    "MESU3": "ES=F",
    "MNQU3": "NQ=F",
    "YM": "YM=F",
    "RTY": "RTY=F",
    "CL": "CL=F",
    "GC": "GC=F",
    "SI": "SI=F",
    "ZB": "ZB=F",
    "6E": "EURUSD=X",
    "6J": "JPYUSD=X",
};

function mapSymbol(symbol: string): string {
    // Check exact match first
    if (SYMBOL_MAP[symbol]) return SYMBOL_MAP[symbol];
    // Check prefix match for futures with month codes (e.g. MESU3 → ES=F)
    const base = symbol.replace(/[FGHJKMNQUVXZ]\d{1,2}$/i, "");
    if (SYMBOL_MAP[base]) return SYMBOL_MAP[base];
    // Default: use as-is (works for stocks like AAPL, TSLA)
    return symbol;
}

export async function fetchKlines(
    symbol: string,
    entryTimestamp: number,
    exitTimestamp: number,
): Promise<KlineData> {
    const yahooSymbol = mapSymbol(symbol);

    // Calculate range: show ~30 candles before entry and ~10 after exit
    const tradeDuration = Math.abs(exitTimestamp - entryTimestamp);
    const isIntraday = tradeDuration < 86400; // less than 1 day
    const now = Math.floor(Date.now() / 1000);

    // Check 7-day limit for 1m data (Yahoo Finance constraint)
    const sevenDaysAgo = now - (7 * 86400);
    const sixtyDaysAgo = now - (60 * 86400);
    const isRecent = entryTimestamp > sevenDaysAgo;
    const isSemiRecent = entryTimestamp > sixtyDaysAgo;

    let interval: string;
    let period1: number;
    let period2: number;

    if (isIntraday) {
        if (tradeDuration < 7200 && isRecent) {
            // Very short trade (< 2 hours) AND recent (< 7 days): use 1-minute candles
            interval = "1m";
            period1 = entryTimestamp - 1800; // 30 mins before
            period2 = exitTimestamp + 1800;  // 30 mins after
        } else if (isSemiRecent) {
            // Standard intraday or older short trades (< 60 days): use 5-minute candles
            interval = "5m";
            period1 = entryTimestamp - 7200; // 2 hours before
            period2 = exitTimestamp + 7200;  // 2 hours after
        } else {
            // Older than 60 days: must use daily candles (Yahoo limitation)
            interval = "1d";
            period1 = entryTimestamp - 30 * 86400; // 30 days before
            period2 = exitTimestamp + 15 * 86400;  // 15 days after
        }
    } else {
        // For multi-day, use daily candles, show ±30 days around trade
        interval = "1d";
        period1 = entryTimestamp - 30 * 86400;
        period2 = exitTimestamp + 15 * 86400;
    }

    // Clamp period2 to now
    if (period2 > now) period2 = now;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?period1=${Math.floor(period1)}&period2=${Math.floor(period2)}&interval=${interval}`;

    const res = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0",
        },
    });

    if (!res.ok) {
        throw new Error(`Yahoo Finance API error: ${res.status}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error("No chart data returned");

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        if (quote.open[i] != null && quote.close[i] != null) {
            candles.push({
                t: timestamps[i],
                o: quote.open[i],
                h: quote.high[i],
                l: quote.low[i],
                c: quote.close[i],
                v: quote.volume[i] || 0,
            });
        }
    }

    return {
        symbol: yahooSymbol,
        interval,
        candles,
        fetchedAt: now,
    };
}
