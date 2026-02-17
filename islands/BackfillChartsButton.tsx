import { useState } from "preact/hooks";
import { Trade } from "../services/storage/entities/Trade.ts";
import { showToast } from "./Toast.tsx";

export default function BackfillChartsButton() {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 5));

    const handleBackfill = async () => {
        // Removed confirm dialog to provide instant feedback via UI state
        setLoading(true);
        setLogs(["Starting backfill..."]);
        
        try {
            // 1. Fetch all trades to check status
            const res = await fetch("/api/trades");
            const trades: Trade[] = await res.json();
            
            setTotal(trades.length);
            let processed = 0;
            const batchSize = 3; // Small batch to avoid rate limits

            for (let i = 0; i < trades.length; i += batchSize) {
                const batch = trades.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (trade) => {
                    try {
                        // Call the klines API with refresh=1 to force retry/update
                        const klineRes = await fetch(`/api/klines?tradeId=${trade.BrokerTradeID}&refresh=1`);
                        const data = await klineRes.json();
                        
                        if (data.symbol) {
                            addLog(`Fetched ${data.symbol} (${data.interval})`);
                        }
                    } catch (e) {
                        // console.error(e);
                        // Don't spam logs with errors, just progress
                    } finally {
                        processed++;
                        setProgress(processed);
                    }
                }));
                
                // Rate limit pause
                await new Promise(r => setTimeout(r, 500));
            }
            
            addLog("Backfill complete!");
            showToast("Chart data backfill complete.", "success");
            
        } catch (e) {
            addLog(`Error: ${(e as Error).message}`);
            showToast("Backfill failed: " + (e as Error).message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class="bg-[#0f1117] rounded-lg p-5 border border-[#1e2235]">
            <div class="flex items-center gap-2 mb-3">
                <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <h4 class="text-sm font-semibold text-white">Backfill Chart Data</h4>
            </div>
            <p class="text-xs text-gray-500 mb-4">
                Redownload missing candlestick data for all past trades. Use this if charts are blank.
            </p>
            
            {loading ? (
                <div class="space-y-3">
                    <div class="w-full bg-[#1a1d2e] rounded-full h-2 overflow-hidden">
                        <div class="bg-emerald-500 h-full transition-all duration-300 ease-out" style={`width: ${(progress / total) * 100}%`}></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-400 font-medium">
                        <span>{progress}/{total} trades</span>
                        <span>{Math.round((progress / total) * 100)}%</span>
                    </div>
                    
                    {/* Detailed Log Window */}
                    <div class="bg-[#0a0c10] rounded border border-[#1e2235] p-2 h-24 overflow-hidden flex flex-col-reverse relative">
                        <div class="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0a0c10]/50 to-transparent"></div>
                        {logs.map((log, i) => (
                            <div key={i} class="text-[10px] font-mono text-gray-500 truncate leading-tight">
                                <span class="text-emerald-500/50 mr-2">&gt;</span>{log}
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <button 
                    onClick={handleBackfill}
                    class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                    Start Backfill
                </button>
            )}
        </div>
    );
}
