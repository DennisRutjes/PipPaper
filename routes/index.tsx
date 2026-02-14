import { Handlers, PageProps } from "$fresh/server.ts";
import { storage } from "../services/storage/StorageKV.ts";
import { Trade } from "../services/storage/entities/Trade.ts";
import SideMenu from "../islands/SideMenu.tsx";
import NetCumulativePnL from "../components/NetCumulativePnL.tsx";
import NetDailyPnL from "../components/NetDailyPnL.tsx";
import WinRatio from "../components/WinRatio.tsx";
import { calculateDailyPnLMap } from "../services/utils/utils.ts";

interface DashboardData {
  trades: Trade[];
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  bestTrade: number;
  worstTrade: number;
  calendarData: Record<string, { pnl: number; trades: number }>;
  winDays: number;
  lossDays: number;
  totalDays: number;
  winDayRate: number;
  expectancy: number;
  largestWinStreak: number;
  largestLossStreak: number;
}

export const handler: Handlers<DashboardData> = {
  async GET(req, ctx) {
    const url = new URL(req.url);
    // Date range filter support
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");

    let trades = await storage.getTrades();
    trades.sort((a, b) => a.ExitTimestamp - b.ExitTimestamp);

    if (from) {
      const fromTs = new Date(from + "T00:00:00").getTime() / 1000;
      trades = trades.filter(t => t.ExitTimestamp >= fromTs);
    }
    if (to) {
      const toTs = new Date(to + "T23:59:59").getTime() / 1000;
      trades = trades.filter(t => t.ExitTimestamp <= toTs);
    }

    const totalPnL = trades.reduce((sum, t) => sum + (t.PnL || 0) + (t.AdjustedCost || 0), 0);
    const wins = trades.filter(t => (t.PnL || 0) > 0);
    const losses = trades.filter(t => (t.PnL || 0) < 0);
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

    const grossProfit = wins.reduce((sum, t) => sum + (t.PnL || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.PnL || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

    const pnls = trades.map(t => t.PnL || 0);
    const bestTrade = pnls.length > 0 ? Math.max(...pnls) : 0;
    const worstTrade = pnls.length > 0 ? Math.min(...pnls) : 0;

    // Calendar data with trade count
    const calendarData: Record<string, { pnl: number; trades: number }> = {};
    const dailyPnLMap = calculateDailyPnLMap(trades);
    for (const trade of trades) {
      const d = new Date(trade.ExitTimestamp * 1000);
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!calendarData[ds]) calendarData[ds] = { pnl: 0, trades: 0 };
      calendarData[ds].pnl = dailyPnLMap[ds] || 0;
      calendarData[ds].trades++;
    }

    // Win days
    const dayPnls = Object.values(dailyPnLMap);
    const winDays = dayPnls.filter(v => v > 0).length;
    const lossDays = dayPnls.filter(v => v < 0).length;
    const totalDays = dayPnls.length;
    const winDayRate = totalDays > 0 ? (winDays / totalDays) * 100 : 0;

    // Expectancy
    const expectancy = trades.length > 0 ? totalPnL / trades.length : 0;

    // Win/Loss streaks
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
    for (const t of trades) {
      if ((t.PnL || 0) > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
      else if ((t.PnL || 0) < 0) { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
      else { curWin = 0; curLoss = 0; }
    }

    return ctx.render({
      trades, totalPnL, winRate, profitFactor, avgWin, avgLoss,
      totalTrades: trades.length, winCount: wins.length, lossCount: losses.length,
      bestTrade, worstTrade, calendarData, winDays, lossDays, totalDays, winDayRate,
      expectancy, largestWinStreak: maxWin, largestLossStreak: maxLoss,
    });
  },
};

function KpiCard({ label, value, subtext, color }: { label: string; value: string; subtext?: string; color?: string }) {
  return (
    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-4 hover:border-[#2d3348] transition-colors">
      <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div class={`text-xl font-bold ${color || "text-white"}`}>{value}</div>
      {subtext && <div class="text-[10px] text-gray-600 mt-0.5">{subtext}</div>}
    </div>
  );
}

function TradeZellaCalendar({ data }: { data: Record<string, { pnl: number; trades: number }> }) {
  const dates = Object.keys(data).sort();
  if (dates.length === 0) {
    return <div class="flex items-center justify-center h-40 text-gray-600 text-sm">No trading data yet.</div>;
  }

  // Determine the month to show (latest month with data)
  const lastDate = dates[dates.length - 1];
  const [yearStr, monthStr] = lastDate.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();

  return (
    <div>
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm font-semibold text-white">{monthNames[month - 1]} {year}</span>
      </div>
      <div class="grid grid-cols-7 gap-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} class="text-[10px] text-gray-600 text-center font-semibold pb-2">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`e-${i}`} class="aspect-square" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const entry = data[dateStr];
          const hasTrade = !!entry;

          let bgClass = "bg-[#1a1d2e]/50";
          let textColor = "text-gray-700";
          if (hasTrade) {
            if (entry.pnl > 0) { bgClass = "bg-emerald-500/20 border border-emerald-500/30"; textColor = "text-emerald-400"; }
            else if (entry.pnl < 0) { bgClass = "bg-red-500/20 border border-red-500/30"; textColor = "text-red-400"; }
            else { bgClass = "bg-gray-500/20 border border-gray-500/30"; textColor = "text-gray-400"; }
          }

          return (
            <div key={day} class={`aspect-square rounded-lg ${bgClass} flex flex-col items-center justify-center p-0.5 ${hasTrade ? "cursor-default" : ""}`}
              title={hasTrade ? `${dateStr}: $${entry.pnl.toFixed(2)} (${entry.trades} trade${entry.trades > 1 ? "s" : ""})` : dateStr}>
              <span class={`text-[10px] font-medium ${hasTrade ? textColor : "text-gray-600"}`}>{day}</span>
              {hasTrade && (
                <>
                  <span class={`text-[9px] font-bold ${textColor} leading-none`}>
                    ${Math.abs(entry.pnl) >= 1000 ? `${(entry.pnl / 1000).toFixed(1)}K` : entry.pnl.toFixed(0)}
                  </span>
                  <span class="text-[8px] text-gray-600 leading-none">{entry.trades}t</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Home({ data }: PageProps<DashboardData>) {
  const {
    trades, totalPnL, winRate, profitFactor, avgWin, avgLoss,
    totalTrades, winCount, lossCount, bestTrade, worstTrade,
    calendarData, winDays, lossDays, totalDays, winDayRate,
    expectancy, largestWinStreak, largestLossStreak,
  } = data;

  const pf = profitFactor === Infinity ? "∞" : profitFactor.toFixed(2);

  return (
    <>
      <SideMenu active={"Dashboard"} />
      <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
        <div class="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div>
            <h1 class="text-2xl font-bold text-white">Dashboard</h1>
            <p class="text-sm text-gray-500 mt-1">Your trading performance at a glance</p>
          </div>
          {/* Date Range Picker */}
          <form method="GET" class="flex items-center gap-2">
            <input type="date" name="from" class="bg-[#1a1d2e] border border-[#2d3348] text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:border-emerald-500 focus:outline-none" />
            <span class="text-gray-600 text-xs">to</span>
            <input type="date" name="to" class="bg-[#1a1d2e] border border-[#2d3348] text-gray-400 text-xs rounded-lg px-2 py-1.5 focus:border-emerald-500 focus:outline-none" />
            <button type="submit" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg">Filter</button>
            <a href="/" class="px-2 py-1.5 text-gray-500 hover:text-gray-300 text-xs">Reset</a>
          </form>
        </div>

        {/* KPI Cards Row 1 */}
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
          <KpiCard label="Total P&L" value={`$${totalPnL.toFixed(2)}`} subtext={`${totalTrades} trades`} color={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"} />
          <KpiCard label="Win Rate" value={`${winRate.toFixed(1)}%`} subtext={`${winCount}W / ${lossCount}L`} color={winRate >= 50 ? "text-emerald-400" : "text-amber-400"} />
          <KpiCard label="Profit Factor" value={pf} color={profitFactor >= 1 ? "text-emerald-400" : "text-red-400"} />
          <KpiCard label="Avg Win" value={`$${avgWin.toFixed(2)}`} color="text-emerald-400" />
          <KpiCard label="Avg Loss" value={`-$${avgLoss.toFixed(2)}`} color="text-red-400" />
          <KpiCard label="Expectancy" value={`$${expectancy.toFixed(2)}`} color={expectancy >= 0 ? "text-emerald-400" : "text-red-400"} />
          <KpiCard label="Best Trade" value={`$${bestTrade.toFixed(2)}`} color="text-emerald-400" />
          <KpiCard label="Worst Trade" value={`$${worstTrade.toFixed(2)}`} color={worstTrade < 0 ? "text-red-400" : "text-gray-400"} />
        </div>

        {/* Charts Row 1: Win % by Trades + Equity Curve */}
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Winning % By Trades</h3>
            <div class="h-52 flex justify-center">
              <WinRatio trades={trades} />
            </div>
          </div>
          <div class="lg:col-span-2 bg-[#141622] rounded-xl border border-[#1e2235] p-5">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Daily Net Cumulative P&L</h3>
            <div class="h-52">
              <NetCumulativePnL trades={trades} />
            </div>
          </div>
          <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Net Daily P&L</h3>
            <div class="h-52">
              <NetDailyPnL trades={trades} />
            </div>
          </div>
        </div>

        {/* Row 2: Win % by Days + Calendar */}
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Winning % By Days</h3>
            <div class="flex flex-col items-center justify-center h-52">
              <div class="relative w-36 h-36">
                <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e2235" stroke-width="3" />
                  {totalDays > 0 && (
                    <>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" stroke-width="3"
                        stroke-dasharray={`${winDayRate} ${100 - winDayRate}`} stroke-dashoffset="0" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" stroke-width="3"
                        stroke-dasharray={`${(lossDays / totalDays) * 100} ${100 - (lossDays / totalDays) * 100}`}
                        stroke-dashoffset={`-${winDayRate}`} />
                    </>
                  )}
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-2xl font-bold text-white">{winDayRate.toFixed(0)}<span class="text-sm">%</span></span>
                  <span class="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Winrate</span>
                </div>
              </div>
              <div class="flex gap-4 mt-3">
                <div class="flex items-center gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span class="text-xs text-gray-400"><span class="font-bold text-white">{winDays}</span> winners</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div class="w-2.5 h-2.5 rounded-sm bg-red-500" />
                  <span class="text-xs text-gray-400"><span class="font-bold text-white">{lossDays}</span> losers</span>
                </div>
              </div>
            </div>
          </div>

          <div class="lg:col-span-3 bg-[#141622] rounded-xl border border-[#1e2235] p-5">
            <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Performance Calendar</h3>
            <TradeZellaCalendar data={calendarData} />
          </div>
        </div>

        {/* Bottom Stats Row */}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Win/Loss Ratio" value={avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "∞"} />
          <KpiCard label="Win Streak" value={`${largestWinStreak}`} subtext="consecutive" color="text-emerald-400" />
          <KpiCard label="Loss Streak" value={`${largestLossStreak}`} subtext="consecutive" color="text-red-400" />
          <KpiCard label="Trading Days" value={`${totalDays}`} subtext={`${winDays} green / ${lossDays} red`} />
        </div>
      </div>
    </>
  );
}
