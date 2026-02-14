import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";
import SideMenu from "../islands/SideMenu.tsx";
import {Trade} from "../services/storage/entities/Trade.ts";
import {storage} from "../services/storage/StorageKV.ts";
import TradeLogTable from "../islands/TradeLogTable.tsx";

interface TradeLogData {
    trades: Trade[];
    averagePnL: number;
}

export const handler: Handlers<TradeLogData> = {
    async GET(_req, ctx) {
        const trades: Trade[] = await storage.getTrades();
        // Sort by ExitTimestamp descending
        trades.sort((a, b) => b.ExitTimestamp - a.ExitTimestamp);
        
        const totalPnL = trades.reduce((total: number, trade: Trade) => total + (trade.PnL || 0) + (trade.AdjustedCost || 0), 0);
        const averagePnL = trades.length > 0 ? totalPnL / trades.length : 0;

        return ctx.render({
            averagePnL: averagePnL,
            trades: trades
        });
    },
};

export default function TradeLogPage(props: PageProps<TradeLogData>) {
    const { trades, averagePnL } = props.data;
    const selectedTradeID = useSignal("");
    
    return (
        <>
            <SideMenu active="Trade Log"/>
            <div className="p-4 sm:ml-64 bg-gray-50 min-h-screen">
                <div className="p-4">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Trade Log</h1>
                        <div className="text-sm text-gray-500">
                            Total Trades: <span className="font-semibold text-gray-800">{trades.length}</span>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <TradeLogTable trades={trades} selectedTradeID={selectedTradeID} averagePnL={averagePnL} />
                    </div>
                </div>
            </div>
        </>
    );
}