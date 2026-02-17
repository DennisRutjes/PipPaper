import { useEffect, useState } from "preact/hooks";
import { showToast } from "./Toast.tsx";

interface Props {
    importedIds: string[];
}

export default function ImportProcessor({ importedIds }: Props) {
    const [progress, setProgress] = useState(0);
    const [processed, setProcessed] = useState(0);
    const [isProcessing, setIsProcessing] = useState(true);
    const [errors, setErrors] = useState<string[]>([]);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        if (!importedIds || importedIds.length === 0) return;

        const addLog = (msg: string) => {
            setLogs(prev => [msg, ...prev].slice(0, 5)); // Keep last 5 logs
        };

        const processTrades = async () => {
            let done = 0;
            const errs: string[] = [];
            addLog("Starting market data fetch...");

            // Process in batches of 3 to avoid rate limits
            const batchSize = 3;
            for (let i = 0; i < importedIds.length; i += batchSize) {
                const batch = importedIds.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (id) => {
                    try {
                        // Fetch kline data (only if missing, unless refresh forced)
                        // Removed refresh=1 to prevent re-fetching persisted data on every import
                        const res = await fetch(`/api/klines?tradeId=${id}`);
                        const data = await res.json();
                        
                        if (!res.ok) throw new Error(`Failed to fetch klines for ${id}`);
                        
                        if (data.symbol) {
                            addLog(`Fetched ${data.interval} data for ${data.symbol}`);
                        } else {
                            addLog(`Processed trade ${id.substring(0, 8)}...`);
                        }
                    } catch (e) {
                        const msg = `Error fetching trade ${id.substring(0, 8)}: ${(e as Error).message}`;
                        errs.push(msg);
                        addLog(msg);
                    } finally {
                        done++;
                        setProcessed(done);
                        setProgress(Math.round((done / importedIds.length) * 100));
                    }
                }));
                // Small delay between batches
                await new Promise(r => setTimeout(r, 500));
            }

            setIsProcessing(false);
            if (errs.length === 0) {
                showToast(`Successfully processed market data for ${importedIds.length} trades.`, "success");
                addLog("All processing complete.");
            } else {
                showToast(`Processed with ${errs.length} errors.`, "error");
                setErrors(errs);
            }
        };

        processTrades();
    }, [importedIds]);

    if (!isProcessing && processed === importedIds.length && errors.length === 0) {
        return (
            <div class="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 animate-in fade-in duration-500">
                <div class="font-medium flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Import & Data Processing Complete
                </div>
                <div class="text-sm mt-1 opacity-80">
                    Imported {importedIds.length} trades and fetched market data. <a href="/" class="underline hover:text-white transition-colors">View Dashboard</a>
                </div>
            </div>
        );
    }

    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div class="mb-6 bg-[#141622] rounded-xl border border-[#1e2235] p-6">
            <div class="flex items-center gap-6 mb-6">
                {/* Circular Progress */}
                <div class="relative w-20 h-20 flex-shrink-0">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            stroke="currentColor"
                            stroke-width="6"
                            fill="transparent"
                            class="text-[#1a1d2e]"
                        />
                        <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            stroke="currentColor"
                            stroke-width="6"
                            fill="transparent"
                            stroke-dasharray={circumference}
                            stroke-dashoffset={strokeDashoffset}
                            class="text-emerald-500 transition-all duration-300 ease-out"
                            stroke-linecap="round"
                        />
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {progress}%
                    </div>
                </div>

                <div class="flex-1">
                    <h3 class="text-sm font-semibold text-white mb-1">Processing Market Data...</h3>
                    <p class="text-xs text-gray-400">
                        Fetching historical prices for {processed} of {importedIds.length} trades
                    </p>
                </div>
            </div>

            <div class="flex justify-between items-end mb-2">
                <span class="text-[10px] text-gray-600 uppercase tracking-wider font-semibold">Activity Log</span>
            </div>

            {/* Live Activity Log */}
            <div class="bg-[#0f1117] rounded-lg border border-[#2d3348] p-3 h-32 overflow-hidden flex flex-col-reverse relative shadow-inner">
                <div class="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#0f1117]/80 via-transparent to-transparent opacity-50"></div>
                {logs.map((log, i) => (
                    <div key={i} class={`text-xs font-mono truncate py-0.5 border-l-2 pl-2 ${i === 0 ? "text-emerald-400 border-emerald-500 bg-emerald-500/5" : "text-gray-500 border-transparent"}`}>
                        {log}
                    </div>
                ))}
            </div>

            {errors.length > 0 && (
                <div class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs max-h-32 overflow-y-auto">
                    <div class="font-medium mb-1">Errors:</div>
                    {errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
            )}
        </div>
    );
}
