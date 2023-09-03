import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";
import SideMenu, {menu_active} from "../islands/SideMenu.tsx";
import {Trade} from "../services/storage/entities/Trade.ts";

import {store} from "../services/storage/StorageService.ts";
import * as dt from "https://deno.land/std@0.200.0/datetime/mod.ts";

import NetCumulativePnL from "../components/NetCumulativePnL.tsx";
import WinRatio from "../components/WinRatio.tsx";
import NetDailyPnL from "../components/NetDailyPnL.tsx";
import TradeLogTable from "../islands/TradeLogTable.tsx";
import TradeLogDashboard from "../components/TradeLogDashboard.tsx";
import Counter from "../islands/Counter.tsx";

interface TradeLog {
    trades: Trade[]
    averagePnL: number
}


export const handler: Handlers<Trades> = {
    async GET(_req, ctx) {
        const trades: Trade[] = store.listTrades();
        const averagePnL = trades.reduce((total: number, trade: Trade) => total + trade.PnL + trade.AdjustedCost, 0) / trades.length

        return ctx.render({
            averagePnL: averagePnL,
            trades: trades
        });

    },
};


export default function TradeLogPage(props: PageProps<TradeLog>) {
    const trades = props.data.trades;
    const selectedTradeID = useSignal("");
    return (
        <>
            <SideMenu active="Trade Log"/>
            <div className="mx-10 sm:ml-64">
                <div className="p-4">
                    <div className="font-medium text-gray-700 text-2xl">TRADE LOG</div>
                    <TradeLogDashboard trades={trades}/>
                </div>
                <div className="p-4">
                    <div className="font-medium text-gray-700 text-2xl">YOUR TRADES REPORT</div>

                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                            <div className="shadow overflow-hidden border-b border-gray-200 ">
                                <TradeLogTable trades={trades} selectedTradeID={selectedTradeID} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
}
