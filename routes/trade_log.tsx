import {useSignal} from "@preact/signals";
import {HandlerContext, Handlers, PageProps} from "$fresh/server.ts";
import SideMenu, {menu_active} from "../islands/SideMenu.tsx";
import {Trade} from "../services/storage/entities/Trade.ts";
import {Note} from "../services/storage/entities/Note.ts";
import {store} from "../services/storage/StorageService.ts";
import * as dt from "https://deno.land/std@0.200.0/datetime/mod.ts";

interface TradeLog {
    trades: Trade[]
}
export const dateInterval = (date1: Date, date2: Date): string => {
    let delta = Math.abs(date1.getTime() - date2.getTime()) * 1000;
    //console.log(delta)
    const units = [
        {name: 'y', duration: 1000 * 60 * 60 * 24 * 365},
        {name: 'm', duration: 1000 * 60 * 60 * 24 * 30},
        {name: 'w', duration: 1000 * 60 * 60 * 24 * 7},
        {name: 'd', duration: 1000 * 60 * 60 * 24},
        {name: 'h', duration: 1000 * 60 * 60},
        {name: 'm', duration: 1000 * 60},
        {name: 's', duration: 1000},
    ];

    const results = [];

    for (const unit of units) {
        const quotient = Math.floor(delta / unit.duration);

        if (quotient != 0) {
            results.push(`${quotient}${unit.name}${quotient === 1 ? '' : ''}`);
        }
        delta = delta % unit.duration;
    }

    return results.join(' ');
};

export const handler: Handlers<Trades> = {
    async GET(_req, ctx) {
        const trades: Trade[] = store.listTrades();
        // if (!project) {
        //     return new Response("Project not found", { status: 404 });
        // }
        return ctx.render({trades: trades});

    },
};

export default function TradeLogPage(props: PageProps<TradeLog>) {
    const trades = props.data.trades;
    return (
        <>
            <SideMenu active={"Trade Log"}/>
            <div className="p-4 sm:ml-64">
                <div className="font-medium text-gray-700 text-2xl">YOUR TRADES REPORT</div>
                <div className="flex flex-col">
                    <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                    <tr className="" align="top">
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <div className="flex flex-col place-items-center ">
                                                <div>Symbol</div>

                                            </div>
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            <div className="flex flex-col place-items-center ">
                                                <div>Realized</div>
                                                <div>R</div>
                                            </div>

                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Open Date
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Net ROI
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Net P&L
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Setups
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Average Entry
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Average Exit
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Duration
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Adjusted Costs
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Side
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Gross P&L
                                        </th>
                                        <th scope="col"
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Volume
                                        </th>
                                    </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200 ">
                                    {trades.map((trade: Trade) => (
                                        <tr key={trade.TradeID}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center flex-shrink-0 ">
                                                    {trade.PnL < 0 ? (
                                                        <div
                                                            className="border-2 border-solid border-red-500 rounded-xl font-bold text-red-500 px-1 ">
                                                            <div className="w-20 px-5 py-1 flex items-center ">
                                                                <div>LOSS</div>
                                                            </div>
                                                        </div>) : (
                                                        <div
                                                            className="border-2 rounded-xl border-solid border-green-500 rounded-xl font-bold text-green-500 px-1 ">
                                                            <div className="w-20 px-6 py-1 flex items-center ">
                                                                <div>WIN</div>
                                                            </div>
                                                        </div>
                                                    )}

                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 font-bold">
                                                        {trade.Symbol}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        Realized R
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="">
                                                        {dt.format(new Date(trade.EntryTimestamp * 1000), 'yyyy/MM/dd')}
                                                        <div className="">
                                                            {dt.format(new Date(trade.EntryTimestamp * 1000), 'HH:mm:ss')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        net roi
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        net p&l
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        setup
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {trade.EntryPrice}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {trade.ExitPrice}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {dateInterval(new Date(trade.ExitTimestamp), new Date(trade.EntryTimestamp))}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {trade.Symbol}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {trade.Symbol}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {trade.PnL.toFixed(2)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        {trade.Quantity}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
}
