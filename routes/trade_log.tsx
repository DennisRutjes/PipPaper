import { Handlers, PageProps } from "$fresh/server.ts";
import SideMenu from "../islands/SideMenu.tsx";
import { Trade } from "../services/storage/entities/Trade.ts";
import { Setup } from "../services/storage/entities/Setup.ts";
import { storage } from "../services/storage/StorageKV.ts";
import TradeLogTable from "../islands/TradeLogTable.tsx";
import AddTradeForm from "../islands/AddTradeForm.tsx";
import { useSignal } from "@preact/signals";

interface TradeLogData {
    trades: Trade[];
    setups: Setup[];
    averagePnL: number;
    totalPnL: number;
    winCount: number;
    lossCount: number;
    grossProfit: number;
    grossLoss: number;
}

export const handler: Handlers<TradeLogData> = {
    async GET(_req, ctx) {
        const trades: Trade[] = await storage.getTrades();
        trades.sort((a, b) => b.ExitTimestamp - a.ExitTimestamp);
        const setups = await storage.getSetups();

        const totalPnL = trades.reduce((t, tr) => t + (tr.PnL || 0) + (tr.AdjustedCost || 0), 0);
        const averagePnL = trades.length > 0 ? totalPnL / trades.length : 0;
        const wins = trades.filter(t => (t.PnL || 0) > 0);
        const losses = trades.filter(t => (t.PnL || 0) < 0);
        const grossProfit = wins.reduce((s, t) => s + (t.PnL || 0), 0);
        const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.PnL || 0), 0));

        return ctx.render({
            trades, setups, averagePnL, totalPnL,
            winCount: wins.length, lossCount: losses.length,
            grossProfit, grossLoss,
        });
    },
};

export default function TradeLogPage(props: PageProps<TradeLogData>) {
    const { trades, setups, averagePnL, totalPnL, winCount, lossCount, grossProfit, grossLoss } = props.data;
    const selectedTradeID = useSignal("");
    const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(1) : "0.0";

    return (
        <>
            <SideMenu active="Trade Log" />
            <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
                {/* Header */}
                <div class="flex flex-wrap items-center justify-between mb-6 gap-4">
                    <div>
                        <h1 class="text-2xl font-bold text-white">Trade Log</h1>
                        <p class="text-sm text-gray-500 mt-1">All your trades in one place</p>
                    </div>
                    <AddTradeForm />
                </div>

                {/* Summary Cards Row — like TradeZella */}
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Net Cumulative P&L */}
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Net Cumulative P&L</div>
                        <div class={`text-2xl font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${totalPnL.toFixed(2)}
                        </div>
                        <div class="text-xs text-gray-600 mt-1">Total trades: {trades.length}</div>
                    </div>

                    {/* Win Ratio */}
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Win Ratio</div>
                        <div class="text-2xl font-bold text-white">{winRate}%</div>
                        <div class="mt-2 flex items-center gap-2">
                            <div class="flex-1 h-2 bg-[#1a1d2e] rounded-full overflow-hidden flex">
                                <div class="bg-emerald-500 h-full" style={`width: ${trades.length > 0 ? (winCount / trades.length) * 100 : 0}%`} />
                                <div class="bg-red-500 h-full" style={`width: ${trades.length > 0 ? (lossCount / trades.length) * 100 : 0}%`} />
                            </div>
                        </div>
                        <div class="flex justify-between text-xs mt-1">
                            <span class="text-emerald-400">Winners: {winCount}</span>
                            <span class="text-red-400">Losers: {lossCount}</span>
                        </div>
                    </div>

                    {/* Net Daily P&L */}
                    <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-5">
                        <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Profit / Loss</div>
                        <div class="flex justify-between items-end">
                            <div>
                                <div class="text-xs text-gray-600">Profit</div>
                                <div class="text-lg font-bold text-emerald-400">${grossProfit.toFixed(2)}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-xs text-gray-600">Loss</div>
                                <div class="text-lg font-bold text-red-400">-${grossLoss.toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Trade Table */}
                <div class="bg-[#141622] rounded-xl border border-[#1e2235] overflow-hidden">
                    <TradeLogTable trades={trades} setups={setups} selectedTradeID={selectedTradeID} averagePnL={averagePnL} />
                </div>
            </div>
        </>
    );
}
