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

    useEffect(() => {
        if (!importedIds || importedIds.length === 0) return;

        const processTrades = async () => {
            let done = 0;
            const errs: string[] = [];

            // Process in batches of 3 to avoid rate limits
            const batchSize = 3;
            for (let i = 0; i < importedIds.length; i += batchSize) {
                const batch = importedIds.slice(i, i + batchSize);
                await Promise.all(batch.map(async (id) => {
                    try {
                        // Force refresh kline data
                        const res = await fetch(`/api/klines?tradeId=${id}&refresh=1`);
                        if (!res.ok) throw new Error(`Failed to fetch klines for ${id}`);
                    } catch (e) {
                        errs.push(`Trade ${id}: ${(e as Error).message}`);
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
            } else {
                showToast(`Processed with ${errs.length} errors.`, "error");
                setErrors(errs);
            }
        };

        processTrades();
    }, [importedIds]);

    if (!isProcessing && processed === importedIds.length && errors.length === 0) {
        return (
            <div class="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <div class="font-medium flex items-center gap-2">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Import & Data Processing Complete
                </div>
                <div class="text-sm mt-1 opacity-80">
                    Imported {importedIds.length} trades and fetched market data. <a href="/" class="underline">View Dashboard</a>
                </div>
            </div>
        );
    }

    return (
        <div class="mb-6 bg-[#141622] rounded-xl border border-[#1e2235] p-6">
            <h3 class="text-sm font-semibold text-white mb-3 flex items-center justify-between">
                <span>Processing Market Data...</span>
                <span class="text-emerald-400">{progress}%</span>
            </h3>
            
            <div class="w-full bg-[#1a1d2e] rounded-full h-2.5 mb-4 overflow-hidden">
                <div 
                    class="bg-emerald-500 h-2.5 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            
            <p class="text-xs text-gray-500">
                Fetching historical price data for {processed} of {importedIds.length} trades...
            </p>

            {errors.length > 0 && (
                <div class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs max-h-32 overflow-y-auto">
                    <div class="font-medium mb-1">Errors:</div>
                    {errors.map((e, i) => <div key={i}>{e}</div>)}
                </div>
            )}
        </div>
    );
}
