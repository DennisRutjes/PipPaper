import {Trade} from "../services/storage/entities/Trade.ts";
import ChartIsland from "../islands/chart.tsx";
import {transparentize} from "$fresh_charts/utils.ts";

function calculateDailyPnL(trades: Trade[]): number[] {
    let dailyPnL: { [key: string]: number } = {};

    for (const trade of trades) {
        // Convert epoch seconds to a readable Date
        const date = new Date(trade.ExitTimestamp * 1000);
        // Normalize to YYYY-MM-DD format
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        // Increment the PnL for current date
        dailyPnL[dateString] = (dailyPnL[dateString] || 0) + trade.PnL + trade.AdjustedCost;
    }

    // Sorted array of the daily PnLs
    return Object.keys(dailyPnL).sort().map(date => dailyPnL[date]);
}

interface NetDailyPnLProps {
    trades: Trade[];
}

export default function NetDailyPnL({trades}: NetDailyPnLProps) {

    const dailyPnL = [12,45,67,80,34-100,12,45,67,80,34-100,12,45,67,80,34-100,12,45,67,80,34-100,12,45,67,80,34-100, ...calculateDailyPnL(trades)]
    const colors = dailyPnL.map((value) => value < 0 ? transparentize('rgb(200, 0, 0)', 0.5) : transparentize('rgb(0, 220, 0)', 0.5));
    const borderColors = dailyPnL.map((value) => value < 0 ? transparentize('rgb(200, 0, 0)', 0.0) : transparentize('rgb(0, 220, 0)', 0.0));
    //console.log(dailyPnL)


    return (
        <>
            <ChartIsland
                type="bar"
                options={
                    {

                        scales: {
                            x: {
                                display: false // Hide X axis labels
                            },
                            y: {
                                beginAtZero: true
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: `Net Daily P&L`,
                            },
                            legend: {
                                display: false
                            },
                        },
                        interaction: {mode: "index", intersect: false}
                    }}
                data={{
                    labels: dailyPnL,
                    datasets: [
                        {
                            label: "Net Daily P&L",
                            data: dailyPnL,
                            backgroundColor: colors,
                            borderColor: borderColors,

                            borderWidth: 2
                        },
                    ],
                }}
            />
        </>
    );
}