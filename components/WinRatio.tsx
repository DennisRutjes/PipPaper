import { Trade } from "../services/storage/entities/Trade.ts";
import ChartIsland from "../islands/chart.tsx";

interface WinRatioProps {
    trades: Trade[];
}

export default function WinRatio({ trades }: WinRatioProps) {
    let wins = 0, losses = 0, evens = 0;
    for (const trade of trades) {
        const pnl = trade.PnL || 0;
        if (pnl > 0) wins++;
        else if (pnl < 0) losses++;
        else evens++;
    }

    const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(1) : "0.0";

    return (
        <ChartIsland
            type="doughnut"
            options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: "85%",
                plugins: {
                    legend: {
                        display: true,
                        position: "bottom",
                        labels: {
                            color: "#9ca3af",
                            font: { size: 10, family: "Inter" },
                            boxWidth: 8,
                            padding: 12,
                            usePointStyle: true,
                        },
                    },
                    title: {
                        display: true,
                        text: `${winRate}%`,
                        color: "#ffffff",
                        font: { size: 24, weight: "bold", family: "Inter" },
                        padding: { top: 10, bottom: 0 },
                        align: "center",
                    },
                    subtitle: {
                        display: true,
                        text: "Win Rate",
                        color: "#10b981",
                        font: { size: 10, weight: "600", family: "Inter" },
                        align: "center",
                        padding: { top: 40 }, // Push it down below the percentage
                    }
                },
                layout: {
                    padding: 10
                }
            }}
            data={{
                labels: [`Wins: ${wins}`, `Losses: ${losses}`, `Even: ${evens}`],
                datasets: [
                    {
                        data: [wins, losses, evens],
                        backgroundColor: [
                            "rgba(16, 185, 129, 0.8)",
                            "rgba(239, 68, 68, 0.8)",
                            "rgba(107, 114, 128, 0.4)",
                        ],
                        borderColor: [
                            "#10b981",
                            "#ef4444",
                            "#4b5563",
                        ],
                        borderWidth: 2,
                        hoverOffset: 6,
                    },
                ],
            }}
        />
    );
}
