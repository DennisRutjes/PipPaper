import {Trade} from "../services/storage/entities/Trade.ts";

import ChartIsland from "../islands/chart.tsx";
import {transparentize} from "$fresh_charts/utils.ts";

function integrateArray(arr: number[]): number[] {
    return arr.reduce((acc, val, index) => {
        const sum = (acc[index - 1] || 0) + val;
        return [...acc, sum];
    }, [] as number[]);
}

interface NetCumulativePnLProps {
    trades: Trade[];
}

export default function NetCumulativePnL({trades}: NetCumulativePnLProps) {

    const cumulativeNetPnL = integrateArray(trades.map(t => t.PnL + t.AdjustedCost))
    const tradeTimes = trades.map(t => new Date(t.ExitTimestamp * 1000).toDateString())

    const totalPnL = trades.reduce((sum, trade) => sum + (trade.PnL + trade.AdjustedCost), 0);

    return (
        <>
            <ChartIsland
                type="line"
                options={{
                    plugins: {
                        title: {
                            display: true,
                            text: 'Net Cumulative P&L',
                        }
                    },
                    // scales: {
                    //     x: {
                    //         type: 'time',
                    //         time: {
                    //             unit: 'second'
                    //         }
                    //     }
                    // },
                    tension: 0.2,
                    interaction: {mode: "index", intersect: false}
                }}
                data={{
                    labels: tradeTimes,
                    datasets: [
                        {
                            labels: tradeTimes,
                            fill: {
                                target: {value: 0},
                                above: transparentize('rgb(0, 220, 0)', 0.5),   // Area will be red above the origin
                                below: transparentize('rgb(200, 0, 0)', 0.5)    // And blue below the origin
                            },
                            label: `$ ${totalPnL.toFixed((2))}`,
                            data: cumulativeNetPnL,
                            backgroundColor: totalPnL > 0 ? transparentize('rgb(0, 220, 0)', 0.5) : transparentize('rgb(200, 0, 0)', 0.5),
                            strokeColor: transparentize('rgb(100, 100, 100)', 0.5),
                        },

                    ],
                }}
            />
        </>
    );
}