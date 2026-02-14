import { useState } from "preact/hooks";

interface Props {
    tradeId: string;
    existingAdvice?: string | null;
    aiRating?: number | null;
    aiProvider?: string | null;
    aiTimestamp?: number | null;
}

function formatTimestamp(ts: number): string {
    const d = new Date(ts * 1000);
    return d.toLocaleString();
}

function StarRating({ rating }: { rating: number }) {
    return (
        <div class="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    class={`w-4 h-4 ${star <= rating ? "text-yellow-400" : "text-gray-600"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
}

export default function AICoachButton({ tradeId, existingAdvice, aiRating, aiProvider, aiTimestamp }: Props) {
    const [loading, setLoading] = useState(false);
    const [advice, setAdvice] = useState(existingAdvice || "");
    const [rating, setRating] = useState(aiRating || 0);
    const [provider, setProvider] = useState(aiProvider || "");
    const [timestamp, setTimestamp] = useState(aiTimestamp || 0);
    const [error, setError] = useState("");

    const handleEvaluate = async () => {
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/ai-coach", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tradeId }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to evaluate");

            setAdvice(data.advice);
            setRating(data.rating || 0);
            setProvider(`${data.provider}/${data.model}`);
            setTimestamp(Date.now() / 1000);
        } catch (err: unknown) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div class="bg-gradient-to-br from-[#1a1630] to-[#141622] rounded-xl border border-violet-500/20 p-6">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                        <svg class="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 class="text-sm font-semibold text-violet-300">AI Trade Coach</h3>
                            {rating > 0 && <StarRating rating={rating} />}
                        </div>
                        {provider && timestamp > 0 && (
                            <p class="text-xs text-gray-600">{provider} &bull; {formatTimestamp(timestamp)}</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleEvaluate}
                    disabled={loading}
                    class="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Evaluating...
                        </>
                    ) : advice ? (
                        <>
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Re-evaluate
                        </>
                    ) : (
                        <>
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Evaluate Trade
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-4">
                    {error}
                </div>
            )}

            {advice && (
                <div class="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(advice) }}
                />
            )}

            {!advice && !loading && !error && (
                <p class="text-xs text-gray-600">
                    Click "Evaluate Trade" to get AI-powered feedback on your execution, risk management, and areas for improvement.
                </p>
            )}
        </div>
    );
}

// Simple markdown to HTML converter for AI output
function renderMarkdown(md: string): string {
    return md
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h4 class="text-violet-300 font-semibold mt-3 mb-1 text-sm">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="text-violet-300 font-semibold mt-3 mb-1 text-sm">$1</h3>')
        .replace(/^# (.+)$/gm, '<h3 class="text-violet-200 font-bold mt-3 mb-2 text-sm">$1</h3>')
        .replace(/^\d+\. (.+)$/gm, '<div class="mb-2"><span class="font-bold text-violet-400 mr-2">•</span>$1</div>')
        .replace(/^- (.+)$/gm, '<div class="mb-1 ml-2 text-gray-400">- $1</div>')
        .replace(/\n/g, '<br/>');
}
