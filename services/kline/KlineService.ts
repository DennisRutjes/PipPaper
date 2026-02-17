import { storage } from "../storage/StorageKV.ts";

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
const DEFAULT_SYMBOL_MAP: Record<string, string> = {
    "ES": "ES=F",
    "NQ": "NQ=F",
    "MES": "ES=F",
    "MNQ": "NQ=F",
    "MESU3": "ES=F",
    "MNQU3": "NQ=F",
    "NQH6": "NQ=F", // Explicit mapping for NQH6
    "YM": "YM=F",
    "RTY": "RTY=F",
    "CL": "CL=F",
    "GC": "GC=F",
    "SI": "SI=F",
    "ZB": "ZB=F",
    "6E": "EURUSD=X",
    "6J": "JPYUSD=X",
};

async function mapSymbol(symbol: string): Promise<string> {
    // 1. Check custom user mappings first
    const userMappings = await storage.getSymbolMappings();
    if (userMappings[symbol]) return userMappings[symbol];

    // 2. Check default exact match
    if (DEFAULT_SYMBOL_MAP[symbol]) return DEFAULT_SYMBOL_MAP[symbol];

    // 3. Check regex/prefix logic for futures
    // Handle NQ contracts explicitly (e.g. NQH6, NQU3, NQZ24)
    if (/^NQ[FGHJKMNQUVXZ]\d{1,2}$/i.test(symbol)) return "NQ=F";
    if (/^ES[FGHJKMNQUVXZ]\d{1,2}$/i.test(symbol)) return "ES=F";
    if (/^MNQ[FGHJKMNQUVXZ]\d{1,2}$/i.test(symbol)) return "NQ=F";
    if (/^MES[FGHJKMNQUVXZ]\d{1,2}$/i.test(symbol)) return "ES=F";

    // Strip futures codes like H6, U3, Z24 for other symbols
    const base = symbol.replace(/[FGHJKMNQUVXZ]\d{1,2}$/i, "");
    if (userMappings[base]) return userMappings[base]; // Check custom mapping for base
    if (DEFAULT_SYMBOL_MAP[base]) return DEFAULT_SYMBOL_MAP[base];

    // 4. Default: use as-is
    return symbol;
}

export async function fetchKlines(
    symbol: string,
    entryTimestamp: number,
    exitTimestamp: number,
): Promise<KlineData> {
    const yahooSymbol = await mapSymbol(symbol);

    // Calculate range: show ~30 candles before entry and ~10 after exit
    const tradeDuration = Math.abs(exitTimestamp - entryTimestamp);
    const isIntraday = tradeDuration < 86400; // less than 1 day
    const now = Math.floor(Date.now() / 1000);

    // Dynamic Interval Selection Logic
    // Yahoo Finance Constraints:
    // - 1m data: Available for last 7 days
    // - 5m data: Available for last 60 days
    // - 15m/1h: Available for last 60 days (sometimes more, but 60 is safe limit)
    // - 1d: Unlimited history

    const ONE_HOUR = 3600;
    const ONE_DAY = 86400;
    
    // How long ago did the trade finish?
    const timeSinceExit = now - exitTimestamp;

    // Buffers to add context before/after the trade
    let bufferBefore = 0;
    let bufferAfter = 0;
    
    let interval: string;
    let period1: number;
    let period2: number;

    // Use broader ranges to prevent "No valid candles" error when market is closed/thin
    if (timeSinceExit < 7 * ONE_DAY) {
        // --- CASE 1: RECENT TRADES (< 7 days ago) ---
        if (tradeDuration < 12 * ONE_HOUR) {
            interval = "1m";
            bufferBefore = 4 * ONE_HOUR; // Increased context to ensure we hit trading hours
            bufferAfter = 4 * ONE_HOUR;
        } else {
            interval = "5m";
            bufferBefore = 12 * ONE_HOUR;
            bufferAfter = 4 * ONE_HOUR;
        }
    } else if (timeSinceExit < 60 * ONE_DAY) {
        // --- CASE 2: SEMI-RECENT TRADES (< 60 days ago) ---
        if (tradeDuration < 3 * ONE_DAY) {
            interval = "5m";
            bufferBefore = 24 * ONE_HOUR; // 1 full day context
            bufferAfter = 12 * ONE_HOUR;
        } else if (tradeDuration < 14 * ONE_DAY) {
            interval = "1h";
            bufferBefore = 3 * ONE_DAY;
            bufferAfter = 1 * ONE_DAY;
        } else {
            interval = "1d";
            bufferBefore = 10 * ONE_DAY;
            bufferAfter = 5 * ONE_DAY;
        }
    } else {
        // --- CASE 3: OLD TRADES (> 60 days ago) ---
        interval = "1d";
        bufferBefore = 14 * ONE_DAY;
        bufferAfter = 7 * ONE_DAY;
    }

    // Apply calculated buffers
    period1 = Math.floor((entryTimestamp - bufferBefore) / 60) * 60; // Round down to start of minute
    period2 = Math.ceil((exitTimestamp + bufferAfter) / 60) * 60;    // Round up to end of minute

    // Clamp period2 to now
    if (period2 > now) period2 = now;

    try {
        console.log(`[Kline] Fetching ${yahooSymbol} (${interval}) from ${new Date(period1*1000).toISOString()} to ${new Date(period2*1000).toISOString()}`);
        return await fetchYahoo(yahooSymbol, period1, period2, interval, now);
    } catch (e) {
        console.warn(`[KlineService] Fetch failed for ${symbol} (${interval}): ${(e as Error).message}`);
        
        // CASCADING FALLBACK STRATEGY
        
        // 1. Broaden 1m Search:
        // Sometimes the specific trade window is empty/gappy. Try fetching a large chunk (2 days) of 1m data.
        // We filter it down to the trade view later, but getting *some* data is better than none.
        if (interval === "1m") {
            console.log(`[KlineService] Retrying ${yahooSymbol} (1m) with broad 48h search...`);
            try {
                const p1 = Math.max(now - 7 * ONE_DAY, exitTimestamp - 2 * ONE_DAY); // Max 7 days back
                const p2 = Math.min(now, exitTimestamp + 4 * ONE_HOUR);
                return await fetchYahoo(yahooSymbol, p1, p2, "1m", now);
            } catch (e1m) {
                console.warn(`[KlineService] 1m broad retry failed: ${(e1m as Error).message}`);
            }
        }

        // 2. Fallback to 5m
        if (interval === "1m") {
            console.log(`[KlineService] Retrying ${yahooSymbol} with 5m...`);
            try {
                // Expand range SIGNIFICANTLY for 5m retry to catch any available data
                const p1 = entryTimestamp - 24 * ONE_HOUR; // 24 hours before
                const p2 = Math.min(now, exitTimestamp + 4 * ONE_HOUR);
                return await fetchYahoo(yahooSymbol, p1, p2, "5m", now);
            } catch (e2) {
                console.warn(`[KlineService] 5m retry failed: ${(e2 as Error).message}`);
            }
        }
        
        // 3. Fallback to 15m
        if (interval === "1m" || interval === "5m") {
            console.log(`[KlineService] Retrying ${yahooSymbol} with 15m...`);
            try {
                // Expand range even more for 15m
                const p1 = entryTimestamp - 48 * ONE_HOUR; // 2 days before
                const p2 = Math.min(now, exitTimestamp + 6 * ONE_HOUR);
                return await fetchYahoo(yahooSymbol, p1, p2, "15m", now);
            } catch (e3) {
                 console.warn(`[KlineService] 15m retry failed: ${(e3 as Error).message}`);
            }
        }
        
        // Final Fallback: Daily
        if (interval !== "1d") {
            console.log(`[KlineService] Retrying ${yahooSymbol} with 1d (Final Fallback)...`);
            interval = "1d";
            period1 = entryTimestamp - 30 * 86400; // 30 days before
            period2 = exitTimestamp + 15 * 86400;  // 15 days after
            if (period2 > now) period2 = now;
            
            return await fetchYahoo(yahooSymbol, period1, period2, interval, now);
        }
        throw e;
    }
}

async function fetchYahoo(symbol: string, period1: number, period2: number, interval: string, now: number): Promise<KlineData> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${Math.floor(period1)}&period2=${Math.floor(period2)}&interval=${interval}`;

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
        // Ensure strictly positive prices to avoid drawing artifacts
        // Check if ANY value is valid, sometimes Open is null but Close is valid
        if (quote.close[i] !== null && quote.close[i] !== undefined) {
            candles.push({
                t: timestamps[i],
                o: quote.open[i] ?? quote.close[i], // Use nullish coalescing to fallback to close
                h: quote.high[i] ?? quote.close[i],
                l: quote.low[i] ?? quote.close[i],
                c: quote.close[i],
                v: quote.volume[i] || 0,
            });
        }
    }

    // Sort candles by timestamp to ensure correct ordering (critical for charts)
    candles.sort((a, b) => a.t - b.t);

    if (candles.length === 0) {
        throw new Error("No valid candles found in range");
    }

    return {
        symbol,
        interval,
        candles,
        fetchedAt: now,
    };
}
