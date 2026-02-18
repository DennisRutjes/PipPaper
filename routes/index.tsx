import { Handlers, PageProps } from "$fresh/server.ts";
import { storage } from "../services/storage/StorageKV.ts";
import { Trade } from "../services/storage/entities/Trade.ts";
import SideMenu from "../islands/SideMenu.tsx";
import NetCumulativePnL from "../components/NetCumulativePnL.tsx";
import NetDailyPnL from "../components/NetDailyPnL.tsx";
import WinRatio from "../components/WinRatio.tsx";
import GeneralAICoach from "../islands/GeneralAICoach.tsx";
import { calculateDailyPnLMap } from "../services/utils/utils.ts";

interface DashboardData {
  trades: Trade[];
  generalAdvice: { advice: string; timestamp: number } | null;
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
    const generalAdvice = await storage.getGeneralAdvice();

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
      trades, generalAdvice, totalPnL, winRate, profitFactor, avgWin, avgLoss,
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
  // If no data, default to current month
  const lastDate = dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().split('T')[0];
  const [yearStr, monthStr] = lastDate.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  
  // Calculate Monthly Stats
  const monthlyPnl = Object.values(data).reduce((acc, curr) => acc + curr.pnl, 0);
  const monthlyDays = Object.values(data).reduce((acc, curr) => acc + (curr.trades > 0 ? 1 : 0), 0);

  // Build Grid Items (Days + Weekly Stats)
  const gridItems = [];
  let dayCounter = 1;
  let weekPnl = 0;
  let weekDays = 0;
  
  const totalDaysToRender = firstDayOfWeek + daysInMonth;
  const totalWeeks = Math.ceil(totalDaysToRender / 7);

  for (let w = 0; w < totalWeeks; w++) {
    // Render 7 days for this week
    for (let d = 0; d < 7; d++) {
        const slotIndex = w * 7 + d;
        
        // Check if slot is within the valid days of the month
        if (slotIndex < firstDayOfWeek || dayCounter > daysInMonth) {
            gridItems.push(<div key={`empty-${slotIndex}`} class="bg-transparent" />);
        } else {
            const day = dayCounter;
            const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const entry = data[dateStr];
            const hasTrade = !!entry;

            if (hasTrade) {
                weekPnl += entry.pnl;
                weekDays += 1;
            }

            // Styling matches TradeZella dark aesthetic
            let containerClass = "flex flex-col items-center justify-between p-1.5 min-h-[5rem] rounded-lg border relative group transition-all duration-200";
            let dayClass = "text-xs font-semibold text-gray-500 absolute top-1.5 right-2";
            
            if (hasTrade) {
                // Green or Red background with low opacity
                if (entry.pnl > 0) {
                     containerClass += " bg-[#0c2e27] border-[#134e40] hover:border-[#22c55e]/50";
                } else if (entry.pnl < 0) {
                     containerClass += " bg-[#2d1517] border-[#4a1d21] hover:border-[#ef4444]/50";
                } else {
                     containerClass += " bg-[#1a1d2e] border-[#2d3348]";
                }
                dayClass = "text-xs font-bold text-gray-400 absolute top-1.5 right-2";
            } else {
                 containerClass += " bg-[#0f1117] border-[#1e2235]/50";
            }

            gridItems.push(
                <div key={day} class={containerClass} title={hasTrade ? `${dateStr}: $${entry.pnl.toFixed(2)}` : dateStr}>
                    <span class={dayClass}>{day}</span>
                    
                    {hasTrade ? (
                        <div class="flex flex-col items-center justify-center h-full w-full pt-4">
                            <span class={`text-sm font-bold tracking-tight ${entry.pnl > 0 ? "text-emerald-400" : entry.pnl < 0 ? "text-red-400" : "text-gray-300"}`}>
                                ${Math.abs(entry.pnl) >= 1000 ? `${(entry.pnl / 1000).toFixed(1)}k` : Math.abs(entry.pnl).toFixed(0)}
                            </span>
                            <span class="text-[9px] text-gray-500 font-medium mt-0.5">{entry.trades} trades</span>
                        </div>
                    ) : (
                         <div class="h-full w-full" />
                    )}
                </div>
            );
            dayCounter++;
        }
    }

    // After 7 days, append the Weekly Stat Panel
    gridItems.push(
        <div key={`week-${w}`} class="hidden lg:flex flex-col justify-center px-3 py-2 bg-[#0f1117] border border-[#1e2235] rounded-lg ml-2 h-full min-h-[5rem]">
             <span class="text-[9px] text-gray-600 uppercase font-bold tracking-wider mb-1">Week {w + 1}</span>
             <div class="flex flex-col">
                <span class={`text-sm font-bold ${weekPnl > 0 ? "text-emerald-400" : weekPnl < 0 ? "text-red-400" : "text-gray-400"}`}>
                    {weekPnl === 0 ? "$0" : `$${Math.abs(weekPnl) >= 1000 ? (weekPnl/1000).toFixed(1) + 'k' : weekPnl.toFixed(0)}`}
                </span>
                <span class="text-[9px] text-gray-600 mt-0.5">{weekDays} active days</span>
             </div>
        </div>
    );
    // Also append a placeholder for smaller screens if we want to maintain grid structure, 
    // but on small screens we might just hide the stats column using grid-cols-7?
    // For now, the layout uses grid-cols-8 only on large screens, or we force it.
    
    weekPnl = 0;
    weekDays = 0;
  }

  return (
    <div class="h-full flex flex-col font-sans">
      <div class="flex items-center justify-between mb-4 px-1">
        <span class="text-xl font-bold text-white tracking-tight">{monthNames[month - 1]} {year}</span>
        
        {/* Monthly Stats Pill */}
        <div class="flex items-center gap-4 bg-[#0f1117] px-4 py-2 rounded-lg border border-[#1e2235] shadow-sm">
             <div class="flex flex-col items-end sm:flex-row sm:items-center sm:gap-2">
                 <span class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Monthly P&L</span>
                 <span class={`text-sm font-bold ${monthlyPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${monthlyPnl.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                 </span>
             </div>
             <div class="w-px h-6 bg-[#1e2235] hidden sm:block"></div>
             <div class="flex flex-col items-end sm:flex-row sm:items-center sm:gap-2">
                 <span class="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Traded</span>
                 <span class="text-sm font-bold text-white">{monthlyDays} <span class="text-xs text-gray-600 font-medium">days</span></span>
             </div>
        </div>
      </div>
      
      {/* Grid Headers */}
      <div class="grid grid-cols-7 lg:grid-cols-8 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} class="text-[10px] text-gray-500 uppercase tracking-widest text-center font-bold py-1">{d}</div>
        ))}
        <div class="hidden lg:block text-[10px] text-gray-500 uppercase tracking-widest text-left font-bold py-1 pl-2">Weekly Stats</div>
      </div>
      
      {/* Calendar Grid */}
      <div class="flex-1 grid grid-cols-7 lg:grid-cols-8 gap-2 auto-rows-fr">
        {gridItems}
      </div>
    </div>
  );
}
    
    export default function Home({ data }: PageProps<DashboardData>) {
  const {
    trades, generalAdvice, totalPnL, winRate, profitFactor, avgWin, avgLoss,
    totalTrades, winCount, lossCount, bestTrade, worstTrade,
    calendarData, winDays, lossDays, totalDays, winDayRate,
    expectancy, largestWinStreak, largestLossStreak,
  } = data;

  const pf = profitFactor === Infinity ? "∞" : profitFactor.toFixed(2);

  return (
    <>
      <SideMenu active={"Dashboard"} />
      <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6 flex flex-col">
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

        {/* KPI Cards Section - 2 Rows of 6 on large screens */}
        <div class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-4">
          {/* Row 1: Primary Stats */}
          <KpiCard label="Total P&L" value={`$${totalPnL.toFixed(2)}`} subtext={`${totalTrades} trades`} color={totalPnL >= 0 ? "text-emerald-400" : "text-red-400"} />
          
          {/* Win Rate with Donut */}
          <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-4 flex items-center justify-between relative overflow-hidden hover:border-[#2d3348] transition-colors">
              <div class="z-10">
                  <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Win Rate</div>
                  <div class="text-xl font-bold text-white">{winRate.toFixed(1)}%</div>
                  <div class="text-[10px] text-gray-600 mt-0.5">{winCount}W / {lossCount}L</div>
              </div>
              <div class="w-12 h-12 relative opacity-80">
                    <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e2235" stroke-width="4" />
                    {totalTrades > 0 && (
                        <>
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" stroke-width="4"
                                stroke-dasharray={`${winRate} ${100 - winRate}`} stroke-dashoffset="0" />
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" stroke-width="4"
                                stroke-dasharray={`${(lossCount / totalTrades) * 100} ${100 - (lossCount / totalTrades) * 100}`}
                                stroke-dashoffset={`-${winRate}`} />
                        </>
                    )}
                </svg>
              </div>
          </div>

          {/* Day Win Rate with Donut */}
          <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-4 flex items-center justify-between relative overflow-hidden hover:border-[#2d3348] transition-colors">
              <div class="z-10">
                  <div class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Day Win Rate</div>
                  <div class="text-xl font-bold text-white">{winDayRate.toFixed(0)}%</div>
                  <div class="text-[10px] text-gray-600 mt-0.5">{winDays} Green / {lossDays} Red</div>
              </div>
              <div class="w-12 h-12 relative opacity-80">
                  <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e2235" stroke-width="4" />
                      {totalDays > 0 && (
                          <>
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" stroke-width="4"
                                  stroke-dasharray={`${winDayRate} ${100 - winDayRate}`} stroke-dashoffset="0" />
                              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" stroke-width="4"
                                  stroke-dasharray={`${(lossDays / totalDays) * 100} ${100 - (lossDays / totalDays) * 100}`}
                                  stroke-dashoffset={`-${winDayRate}`} />
                          </>
                      )}
                  </svg>
              </div>
          </div>

          <KpiCard label="Profit Factor" value={pf} color={profitFactor >= 1 ? "text-emerald-400" : "text-red-400"} />
          <KpiCard label="Avg Win" value={`$${avgWin.toFixed(2)}`} color="text-emerald-400" />
          <KpiCard label="Avg Loss" value={`-$${avgLoss.toFixed(2)}`} color="text-red-400" />
          
          {/* Row 2: Secondary Stats & Streaks */}
          <KpiCard label="Win/Loss Ratio" value={avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : "∞"} />
          <KpiCard label="Expectancy" value={`$${expectancy.toFixed(2)}`} color={expectancy >= 0 ? "text-emerald-400" : "text-red-400"} />
          <KpiCard label="Best Trade" value={`$${bestTrade.toFixed(2)}`} color="text-emerald-400" />
          <KpiCard label="Worst Trade" value={`$${worstTrade.toFixed(2)}`} color={worstTrade < 0 ? "text-red-400" : "text-gray-400"} />
          <KpiCard label="Win Streak" value={`${largestWinStreak}`} subtext="consecutive" color="text-emerald-400" />
          <KpiCard label="Loss Streak" value={`${largestLossStreak}`} subtext="consecutive" color="text-red-400" />
        </div>

        {/* Main Dashboard Layout */}
        <div class="grid grid-cols-1 lg:grid-cols-10 gap-4 mb-4 flex-1 min-h-0">
          
          {/* Column 1: AI Coach Sidebar (3/10 width ~ 30%) */}
          <div class="lg:col-span-3 h-full min-h-[400px]">
              <GeneralAICoach initialAdvice={generalAdvice} />
          </div>

          {/* Columns 2: Main Content (7/10 width ~ 70%) */}
          <div class="lg:col-span-7 flex flex-col gap-4 h-full">
            {/* Top Row: Charts */}
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-[260px]">
                <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5 h-full flex flex-col md:col-span-2 xl:col-span-2">
                    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Daily Net Cumulative P&L</h3>
                    <div class="flex-1 flex items-center h-full min-h-0">
                    <NetCumulativePnL trades={trades} />
                    </div>
                </div>
                <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5 h-full flex flex-col xl:col-span-1">
                    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Net Daily P&L</h3>
                    <div class="flex-1 flex items-center h-full min-h-0">
                    <NetDailyPnL trades={trades} />
                    </div>
                </div>
            </div>

            {/* Bottom Row: Calendar */}
            <div class="grid grid-cols-1 gap-4 flex-1 min-h-[280px]">
                <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5 h-full flex flex-col">
                    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Performance Calendar</h3>
                    <div class="flex-1 flex flex-col justify-center">
                        <TradeZellaCalendar data={calendarData} />
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
