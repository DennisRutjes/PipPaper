import { Trade } from "../services/storage/entities/Trade.ts";
import ChartIsland from "../islands/chart.tsx";

function calculateDailyPnL(trades: Trade[]): { labels: string[]; values: number[] } {
    const dailyPnL: Record<string, number> = {};
    for (const trade of trades) {
        const date = new Date(trade.ExitTimestamp * 1000);
        const dateString = `${date.getMonth() + 1}/${date.getDate()}`;
        dailyPnL[dateString] = (dailyPnL[dateString] || 0) + (trade.PnL || 0) + (trade.AdjustedCost || 0);
    }
    const sorted = Object.entries(dailyPnL).sort((a, b) => a[0].localeCompare(b[0]));
    return { labels: sorted.map(e => e[0]), values: sorted.map(e => e[1]) };
}

interface NetDailyPnLProps {
    trades: Trade[];
}

export default function NetDailyPnL({ trades }: NetDailyPnLProps) {
    const { labels, values } = calculateDailyPnL(trades);
    const colors = values.map(v => v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");
    const borderColors = values.map(v => v >= 0 ? "#10b981" : "#ef4444");

    return (
        <ChartIsland
            type="bar"
            options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: { display: false },
                },
                scales: {
                    x: {
                        ticks: { color: "#4b5563", font: { size: 10 } },
                        grid: { color: "rgba(30, 34, 53, 0.8)" },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: { color: "#4b5563", font: { size: 10 }, callback: (v: string | number) => `$${v}` },
                        grid: { color: "rgba(30, 34, 53, 0.8)" },
                    },
                },
                interaction: { mode: "index", intersect: false },
            }}
            data={{
                labels,
                datasets: [
                    {
                        label: "Daily P&L",
                        data: values,
                        backgroundColor: colors,
                        borderColor: borderColors,
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                ],
            }}
        />
    );
}
