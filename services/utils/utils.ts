import { Trade } from "../storage/entities/Trade.ts";

/**
 * Calculate the human-readable interval between two dates.
 */
export const dateInterval = (date1: Date, date2: Date): string => {
    let delta = Math.abs(date1.getTime() - date2.getTime());
    const units = [
        { name: "y", duration: 1000 * 60 * 60 * 24 * 365 },
        { name: "mo", duration: 1000 * 60 * 60 * 24 * 30 },
        { name: "w", duration: 1000 * 60 * 60 * 24 * 7 },
        { name: "d", duration: 1000 * 60 * 60 * 24 },
        { name: "h", duration: 1000 * 60 * 60 },
        { name: "m", duration: 1000 * 60 },
        { name: "s", duration: 1000 },
    ];

    const results = [];
    for (const unit of units) {
        const quotient = Math.floor(delta / unit.duration);
        if (quotient !== 0) {
            results.push(`${quotient}${unit.name}`);
        }
        delta = delta % unit.duration;
    }

    return results.slice(0, 3).join(" ") || "0s";
};

/**
 * Get the start date of a trade (earliest of entry/exit timestamp).
 */
export const getTradeStartDate = (trade: Trade): number => {
    if (trade.EntryTimestamp < trade.ExitTimestamp) {
        return trade.EntryTimestamp;
    }
    return trade.ExitTimestamp;
};

/**
 * Get the end date of a trade.
 */
export const getTradeEndDate = (trade: Trade): number => {
    return trade.EntryTimestamp > trade.ExitTimestamp ? trade.EntryTimestamp : trade.ExitTimestamp;
};

/**
 * Group an array by a key function.
 */
export function groupBy<T>(arr: T[], keyFn: (item: T) => string): Record<string, T[]> {
    return arr.reduce((acc, item) => {
        const key = keyFn(item);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, T[]>);
}

/**
 * Format a date from epoch seconds.
 */
export function formatDate(epochSeconds: number, format: "date" | "datetime" | "time" = "datetime"): string {
    const d = new Date(epochSeconds * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    if (format === "date") return `${year}/${month}/${day}`;
    if (format === "time") return `${hours}:${minutes}`;
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

/**
 * Determine if a trade is LONG or SHORT.
 */
export function getTradeSide(trade: Trade): "LONG" | "SHORT" {
    if ((trade.EntryPrice || 0) > (trade.ExitPrice || 0) && (trade.PnL || 0) > 0) return "SHORT";
    if ((trade.EntryPrice || 0) < (trade.ExitPrice || 0) && (trade.PnL || 0) < 0) return "SHORT";
    return "LONG";
}

/**
 * Calculate daily P&L map from trades.
 */
export function calculateDailyPnLMap(trades: Trade[]): Record<string, number> {
    const dailyPnL: Record<string, number> = {};
    for (const trade of trades) {
        const date = new Date(trade.ExitTimestamp * 1000);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        dailyPnL[dateString] = (dailyPnL[dateString] || 0) + (trade.PnL || 0) + (trade.AdjustedCost || 0);
    }
    return dailyPnL;
}
