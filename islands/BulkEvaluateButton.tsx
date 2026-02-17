import { useState } from "preact/hooks";
import { Trade } from "../services/storage/entities/Trade.ts";

interface BulkEvaluateButtonProps {
    trades: Trade[];
    onUpdate: () => void;
}

export default function BulkEvaluateButton({ trades, onUpdate }: BulkEvaluateButtonProps) {
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [total, setTotal] = useState(0);

    const handleBulkEvaluate = async () => {
        // Filter trades that don't have a rating/advice yet
        const unevaluated = trades.filter(t => !t.AIAdvice);
        
        if (unevaluated.length === 0) {
            alert("All trades have already been evaluated!");
            return;
        }

        if (!confirm(`This will analyze ${unevaluated.length} trades using the AI Coach. This may take a while and consume API credits. Continue?`)) {
            return;
        }

        setLoading(true);
        setTotal(unevaluated.length);
        setProgress(0);

        let completed = 0;

        // Process in batches of 3 to respect rate limits
        const batchSize = 3;
        for (let i = 0; i < unevaluated.length; i += batchSize) {
            const batch = unevaluated.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (trade) => {
                try {
                    // Note: In bulk mode from the log, we cannot send the chart image
                    // The AI will analyze based on numerical data only.
                    await fetch("/api/ai-coach", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ tradeId: trade.BrokerTradeID }),
                    });
                } catch (e) {
                    console.error(`Failed to evaluate trade ${trade.BrokerTradeID}`, e);
                } finally {
                    completed++;
                    setProgress(completed);
                }
            }));
        }

        setLoading(false);
        onUpdate(); // Refresh the parent to show new stars
        window.location.reload(); // Hard reload to ensure data is fresh
    };

    return (
        <button
            onClick={handleBulkEvaluate}
            disabled={loading || trades.filter(t => !t.AIAdvice).length === 0}
            class={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${loading 
                    ? "bg-violet-500/20 text-violet-300 cursor-wait" 
                    : "bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700"
                }`}
        >
            {loading ? (
                <>
                    <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Analyzing {progress}/{total}...</span>
                </>
            ) : (
                <>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Auto-Analyze Remaining ({trades.filter(t => !t.AIAdvice).length})</span>
                </>
            )}
        </button>
    );
}
