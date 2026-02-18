import { useState } from "preact/hooks";

interface GeneralAICoachProps {
    initialAdvice?: { advice: string; timestamp: number } | null;
}

export default function GeneralAICoach({ initialAdvice }: GeneralAICoachProps) {
    const [advice, setAdvice] = useState<string | null>(initialAdvice?.advice || null);
    const [timestamp, setTimestamp] = useState<number | null>(initialAdvice?.timestamp || null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const generateAdvice = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/ai-coach-general", { method: "POST" });
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.error || "Failed to generate advice");
            
            setAdvice(data.advice);
            setTimestamp(data.timestamp);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    // Simple markdown-ish rendering
    const renderContent = (text: string) => {
        let currentSection = "neutral";

        return text.split("\n").map((line, i) => {
            // Headers
            if (line.startsWith("## ")) {
                const title = line.replace("## ", "");

                if (title.includes("Strengths")) {
                    currentSection = "strengths";
                    return (
                        <div key={i} class="mt-8 mb-4">
                            <h3 class="text-lg font-bold flex items-center gap-2.5" style="color: #34d399;">
                                <svg class="w-5 h-5" style="color: #34d399;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {title}
                            </h3>
                        </div>
                    );
                } else if (title.includes("Weaknesses") || title.includes("Patterns")) {
                    currentSection = "weaknesses";
                    return (
                        <div key={i} class="mt-8 mb-4">
                            <h3 class="text-lg font-bold flex items-center gap-2.5" style="color: #fbbf24;">
                                <svg class="w-5 h-5" style="color: #fbbf24;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                {title}
                            </h3>
                        </div>
                    );
                } else if (title.includes("Insight")) {
                    currentSection = "insight";
                    return (
                        <div key={i} class="mt-8 mb-4">
                            <h3 class="text-lg font-bold text-blue-400 flex items-center gap-2.5">
                                <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                {title}
                            </h3>
                        </div>
                    );
                } else if (title.includes("Action Plan")) {
                    currentSection = "action";
                    return (
                        <div key={i} class="mt-8 mb-4">
                            <h3 class="text-lg font-bold text-purple-400 flex items-center gap-2.5">
                                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {title}
                            </h3>
                        </div>
                    );
                }

                // Default header
                return (
                    <div key={i} class="mt-8 mb-4">
                        <h3 class="text-lg font-bold text-white flex items-center gap-2.5">
                            {title}
                        </h3>
                    </div>
                );
            }
            if (line.startsWith("# ")) {
                return <h2 key={i} class="text-xl font-bold text-emerald-400 mt-8 mb-4">{line.replace("# ", "")}</h2>;
            }
            // Bullet points
            if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                let bulletStyle = "background-color: #4b5563;"; // gray-600
                if (currentSection === "strengths") bulletStyle = "background-color: #10b981;"; // emerald-500
                else if (currentSection === "weaknesses") bulletStyle = "background-color: #f59e0b;"; // amber-500
                else if (currentSection === "insight") bulletStyle = "background-color: #3b82f6;"; // blue-500
                else if (currentSection === "action") bulletStyle = "background-color: #8b5cf6;"; // purple-500

                return (
                    <div key={i} class="flex items-start gap-3 mb-3 pl-1">
                        <div class="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={bulletStyle} />
                        <span class="text-gray-300 leading-relaxed text-sm" dangerouslySetInnerHTML={{ 
                            __html: line.replace(/^[-*] /, "").replace(/\*\*(.*?)\*\*/g, "<span class='text-white font-bold'>$1</span>") 
                        }} />
                    </div>
                );
            }
            // Bold only lines or normal text
            return (
                <p key={i} class="text-gray-300 mb-4 leading-relaxed text-sm pl-1" dangerouslySetInnerHTML={{ 
                    __html: line.replace(/\*\*(.*?)\*\*/g, "<span class='text-white font-bold'>$1</span>") 
                }} />
            );
        });
    };

    return (
        <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6 relative overflow-hidden flex flex-col h-full">
            {/* Background decoration */}
            <div class="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <svg class="w-32 h-32 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
            </div>

            <div class="flex items-center justify-between mb-6 relative z-10">
                <div>
                    <h2 class="text-lg font-bold text-white flex items-center gap-2">
                        <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI Performance Coach
                    </h2>
                    <p class="text-sm text-gray-500 mt-1">
                        Meta-analysis of your last 20 evaluated trades.
                    </p>
                </div>
                
                <button 
                    onClick={generateAdvice} 
                    disabled={loading}
                    class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {advice ? "Refresh Analysis" : "Generate Report"}
                        </>
                    )}
                </button>
            </div>

            {error && (
                <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    {error}
                </div>
            )}

            {!advice && !loading && !error && (
                <div class="text-center py-12 border-2 border-dashed border-[#2d3348] rounded-xl">
                    <div class="text-gray-500 mb-2">No coaching report generated yet.</div>
                    <div class="text-xs text-gray-600">Click the button above to analyze your recent trades.</div>
                </div>
            )}

            {advice && (
                <div class="bg-[#1a1d2e] rounded-xl p-6 text-sm text-gray-300 relative flex-1 overflow-y-auto min-h-0">
                    {timestamp && (
                        <div class="absolute top-4 right-4 text-[10px] text-gray-600">
                            Generated: {new Date(timestamp * 1000).toLocaleString()}
                        </div>
                    )}
                    <div class="space-y-1">
                        {renderContent(advice)}
                    </div>
                </div>
            )}
        </div>
    );
}
