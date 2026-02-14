import { Handlers, PageProps } from "$fresh/server.ts";
import { storage } from "../services/storage/StorageKV.ts";
import { Trade } from "../services/storage/entities/Trade.ts";
import SideMenu from "../islands/SideMenu.tsx";
import NetCumulativePnL from "../components/NetCumulativePnL.tsx";
import NetDailyPnL from "../components/NetDailyPnL.tsx";
import WinRatio from "../components/WinRatio.tsx";

interface DashboardData {
  trades: Trade[];
  totalPnL: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
}

export const handler: Handlers<DashboardData> = {
  async GET(_req, ctx) {
    const trades = await storage.getTrades();
    
    // Sort trades by ExitTimestamp
    trades.sort((a, b) => a.ExitTimestamp - b.ExitTimestamp);

    const totalPnL = trades.reduce((sum, t) => sum + (t.PnL || 0), 0);
    const wins = trades.filter(t => (t.PnL || 0) > 0);
    const losses = trades.filter(t => (t.PnL || 0) < 0);
    
    const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
    
    const grossProfit = wins.reduce((sum, t) => sum + (t.PnL || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.PnL || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

    return ctx.render({ trades, totalPnL, winRate, profitFactor, avgWin, avgLoss });
  },
};

export default function Home({ data }: PageProps<DashboardData>) {
  const { trades, totalPnL, winRate, profitFactor, avgWin, avgLoss } = data;
  
  return (
    <>
      <SideMenu active={"Dashboard"} />
      <div className="p-4 sm:ml-64 bg-gray-50 min-h-screen">
        <div className="p-4">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 mb-1">Total P&L</div>
                    <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${totalPnL.toFixed(2)}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 mb-1">Win Rate</div>
                    <div className="text-2xl font-bold text-gray-800">
                        {winRate.toFixed(1)}%
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 mb-1">Profit Factor</div>
                    <div className="text-2xl font-bold text-gray-800">
                        {profitFactor.toFixed(2)}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 mb-1">Avg Win / Loss</div>
                    <div className="text-2xl font-bold text-gray-800">
                        <span className="text-green-600">${avgWin.toFixed(0)}</span> / <span className="text-red-600">${avgLoss.toFixed(0)}</span>
                    </div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Equity Curve</h3>
                    <div className="h-64">
                        <NetCumulativePnL trades={trades} />
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Win/Loss Ratio</h3>
                    <div className="h-64 flex justify-center">
                        <WinRatio trades={trades} />
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily P&L</h3>
                <div className="h-64">
                    <NetDailyPnL trades={trades} />
                </div>
            </div>

        </div>
      </div>
    </>
  );
}
