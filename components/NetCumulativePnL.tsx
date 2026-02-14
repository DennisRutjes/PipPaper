import { Trade } from "../services/storage/entities/Trade.ts";
import ChartIsland from "../islands/chart.tsx";

function integrateArray(arr: number[]): number[] {
    return arr.reduce((acc, val, index) => {
        const sum = (acc[index - 1] || 0) + val;
        return [...acc, sum];
    }, [] as number[]);
}

interface NetCumulativePnLProps {
    trades: Trade[];
}

export default function NetCumulativePnL({ trades }: NetCumulativePnLProps) {
    const cumulativeNetPnL = integrateArray(trades.map(t => (t.PnL || 0) + (t.AdjustedCost || 0)));
    const tradeTimes = trades.map(t => {
        const d = new Date(t.ExitTimestamp * 1000);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });
    const totalPnL = trades.reduce((sum, trade) => sum + ((trade.PnL || 0) + (trade.AdjustedCost || 0)), 0);

    return (
        <ChartIsland
            type="line"
            options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: "#9ca3af", font: { size: 11 }, boxWidth: 12 },
                    },
                    title: { display: false },
                },
                scales: {
                    x: {
                        display: true,
                        ticks: { color: "#4b5563", font: { size: 10 }, maxTicksLimit: 8 },
                        grid: { color: "rgba(30, 34, 53, 0.8)" },
                    },
                    y: {
                        ticks: { color: "#4b5563", font: { size: 10 }, callback: (v: string | number) => `$${v}` },
                        grid: { color: "rgba(30, 34, 53, 0.8)" },
                    },
                },
                elements: {
                    line: { tension: 0.3, borderWidth: 2 },
                    point: { radius: 3, hoverRadius: 5, backgroundColor: totalPnL >= 0 ? "#10b981" : "#ef4444" },
                },
                interaction: { mode: "index", intersect: false },
            }}
            data={{
                labels: tradeTimes,
                datasets: [
                    {
                        fill: {
                            target: { value: 0 },
                            above: "rgba(16, 185, 129, 0.15)",
                            below: "rgba(239, 68, 68, 0.15)",
                        },
                        label: `Net P&L: $${totalPnL.toFixed(2)}`,
                        data: cumulativeNetPnL,
                        backgroundColor: totalPnL >= 0 ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)",
                        borderColor: totalPnL >= 0 ? "#10b981" : "#ef4444",
                    },
                ],
            }}
        />
    );
}
