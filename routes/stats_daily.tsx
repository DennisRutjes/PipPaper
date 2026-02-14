import { Handlers, PageProps } from "$fresh/server.ts";
import SideMenu from "../islands/SideMenu.tsx";
import { storage } from "../services/storage/StorageKV.ts";
import { Trade } from "../services/storage/entities/Trade.ts";
import { calculateDailyPnLMap, getTradeSide } from "../services/utils/utils.ts";

interface DailyStatsData {
    trades: Trade[];
    dailyPnL: Record<string, number>;
    bestDay: { date: string; pnl: number };
    worstDay: { date: string; pnl: number };
    avgDailyPnL: number;
    profitDays: number;
    lossDays: number;
    totalDays: number;
    symbolStats: Record<string, { trades: number; pnl: number; wins: number }>;
    hourlyStats: Record<number, { trades: number; pnl: number; wins: number }>;
}

export const handler: Handlers<DailyStatsData> = {
    async GET(_req, ctx) {
        const trades = await storage.getTrades();
        trades.sort((a, b) => a.ExitTimestamp - b.ExitTimestamp);

        const dailyPnL = calculateDailyPnLMap(trades);
        const dailyValues = Object.values(dailyPnL);
        const dailyEntries = Object.entries(dailyPnL);

        const profitDays = dailyValues.filter(v => v > 0).length;
        const lossDays = dailyValues.filter(v => v < 0).length;
        const totalDays = dailyValues.length;
        const avgDailyPnL = totalDays > 0 ? dailyValues.reduce((a, b) => a + b, 0) / totalDays : 0;

        let bestDay = { date: "-", pnl: 0 };
        let worstDay = { date: "-", pnl: 0 };
        for (const [date, pnl] of dailyEntries) {
            if (pnl > bestDay.pnl) bestDay = { date, pnl };
            if (pnl < worstDay.pnl) worstDay = { date, pnl };
        }

        // Symbol breakdown
        const symbolStats: Record<string, { trades: number; pnl: number; wins: number }> = {};
        for (const trade of trades) {
            const sym = trade.Symbol || "Unknown";
            if (!symbolStats[sym]) symbolStats[sym] = { trades: 0, pnl: 0, wins: 0 };
            symbolStats[sym].trades++;
            symbolStats[sym].pnl += (trade.PnL || 0);
            if ((trade.PnL || 0) > 0) symbolStats[sym].wins++;
        }

        // Hourly breakdown
        const hourlyStats: Record<number, { trades: number; pnl: number; wins: number }> = {};
        for (const trade of trades) {
            const hour = new Date(trade.EntryTimestamp * 1000).getHours();
            if (!hourlyStats[hour]) hourlyStats[hour] = { trades: 0, pnl: 0, wins: 0 };
            hourlyStats[hour].trades++;
            hourlyStats[hour].pnl += (trade.PnL || 0);
            if ((trade.PnL || 0) > 0) hourlyStats[hour].wins++;
        }

        return ctx.render({
            trades, dailyPnL, bestDay, worstDay, avgDailyPnL,
            profitDays, lossDays, totalDays, symbolStats, hourlyStats,
        });
    },
};

export default function DailyStatsPage(props: PageProps<DailyStatsData>) {
    const { bestDay, worstDay, avgDailyPnL, profitDays, lossDays, totalDays, symbolStats, hourlyStats, trades } = props.data;

    return (
        <>
            <SideMenu active={"Daily Stats"} />
            <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
                {/* Header */}
                <div class="mb-8">
                    <h1 class="text-2xl font-bold text-white">Daily Stats</h1>
                    <p class="text-sm text-gray-500 mt-1">Performance breakdown by day, symbol, and time</p>
                </div>

                {/* Overview KPIs */}
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Trading Days</div>
                        <div class="text-2xl font-bold text-white">{totalDays}</div>
                    </div>
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Profit Days</div>
                        <div class="text-2xl font-bold text-emerald-400">{profitDays}</div>
                    </div>
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Loss Days</div>
                        <div class="text-2xl font-bold text-red-400">{lossDays}</div>
                    </div>
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Avg Daily P&L</div>
                        <div class={`text-2xl font-bold ${avgDailyPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${avgDailyPnL.toFixed(2)}
                        </div>
                    </div>
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Best Day</div>
                        <div class="text-2xl font-bold text-emerald-400">${bestDay.pnl.toFixed(2)}</div>
                        <div class="text-xs text-gray-600 mt-1">{bestDay.date}</div>
                    </div>
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Worst Day</div>
                        <div class="text-2xl font-bold text-red-400">${worstDay.pnl.toFixed(2)}</div>
                        <div class="text-xs text-gray-600 mt-1">{worstDay.date}</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Symbol Breakdown */}
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                        <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Performance by Symbol</h3>
                        {Object.keys(symbolStats).length === 0 ? (
                            <div class="text-gray-600 text-sm py-8 text-center">No data yet</div>
                        ) : (
                            <div class="space-y-3">
                                {Object.entries(symbolStats).sort((a, b) => b[1].pnl - a[1].pnl).map(([symbol, stats]) => (
                                    <div key={symbol} class="flex items-center justify-between py-3 border-b border-[#1e2235] last:border-0">
                                        <div class="flex items-center gap-3">
                                            <span class="font-semibold text-white text-sm">{symbol}</span>
                                            <span class="text-xs text-gray-500">{stats.trades} trades</span>
                                        </div>
                                        <div class="flex items-center gap-4">
                                            <span class="text-xs text-gray-500">
                                                {stats.trades > 0 ? ((stats.wins / stats.trades) * 100).toFixed(0) : 0}% WR
                                            </span>
                                            <span class={`text-sm font-semibold ${stats.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                ${stats.pnl.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Hourly Breakdown */}
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                        <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Performance by Hour</h3>
                        {Object.keys(hourlyStats).length === 0 ? (
                            <div class="text-gray-600 text-sm py-8 text-center">No data yet</div>
                        ) : (
                            <div class="space-y-2">
                                {Object.entries(hourlyStats).sort((a, b) => Number(a[0]) - Number(b[0])).map(([hour, stats]) => {
                                    const maxPnl = Math.max(...Object.values(hourlyStats).map(s => Math.abs(s.pnl)));
                                    const barWidth = maxPnl > 0 ? (Math.abs(stats.pnl) / maxPnl) * 100 : 0;
                                    return (
                                        <div key={hour} class="flex items-center gap-3">
                                            <span class="text-xs text-gray-500 w-12 text-right font-mono">
                                                {String(hour).padStart(2, "0")}:00
                                            </span>
                                            <div class="flex-1 h-6 bg-[#1a1d2e] rounded overflow-hidden relative">
                                                <div
                                                    class={`h-full rounded ${stats.pnl >= 0 ? "bg-emerald-500/30" : "bg-red-500/30"}`}
                                                    style={`width: ${barWidth}%`}
                                                />
                                                <span class="absolute inset-0 flex items-center px-2 text-xs text-gray-400">
                                                    {stats.trades}t &bull; ${stats.pnl.toFixed(0)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Day-by-day Breakdown */}
                <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                    <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">Day-by-Day Performance</h3>
                    {trades.length === 0 ? (
                        <div class="text-gray-600 text-sm py-8 text-center">Import trades to see your daily performance breakdown.</div>
                    ) : (
                        <div class="overflow-x-auto">
                            <table class="min-w-full">
                                <thead>
                                    <tr class="border-b border-[#1e2235]">
                                        {["Date", "Trades", "P&L", "Day Type"].map(h => (
                                            <th key={h} class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(props.data.dailyPnL).sort((a, b) => b[0].localeCompare(a[0])).map(([date, pnl]) => {
                                        const dayTrades = trades.filter(t => {
                                            const d = new Date(t.ExitTimestamp * 1000);
                                            const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                                            return ds === date;
                                        });
                                        return (
                                            <tr key={date} class="border-b border-[#1e2235]/50 hover:bg-[#1a1d2e]">
                                                <td class="px-4 py-3 text-sm text-gray-300">{date}</td>
                                                <td class="px-4 py-3 text-sm text-gray-400">{dayTrades.length}</td>
                                                <td class={`px-4 py-3 text-sm font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                    ${pnl.toFixed(2)}
                                                </td>
                                                <td class="px-4 py-3">
                                                    <span class={`text-xs px-2 py-1 rounded ${
                                                        pnl > 0 ? "bg-emerald-500/15 text-emerald-400" :
                                                        pnl < 0 ? "bg-red-500/15 text-red-400" :
                                                        "bg-gray-500/15 text-gray-400"
                                                    }`}>
                                                        {pnl > 0 ? "Green Day" : pnl < 0 ? "Red Day" : "Breakeven"}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
