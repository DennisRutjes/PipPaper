import { Handlers, PageProps } from "$fresh/server.ts";
import SideMenu from "../islands/SideMenu.tsx";
import { storage } from "../services/storage/StorageKV.ts";
import { Setup } from "../services/storage/entities/Setup.ts";

interface PlaybookData {
    setups: Setup[];
    performance: Record<number, { trades: number; wins: number; pnl: number }>;
    saved?: boolean;
    deleted?: boolean;
}

const PRESET_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export const handler: Handlers<PlaybookData> = {
    async GET(_req, ctx) {
        const setups = await storage.getSetups();
        const performance = await storage.getSetupPerformance();
        return ctx.render({ setups, performance });
    },
    async POST(req, ctx) {
        const form = await req.formData();
        const action = form.get("action")?.toString();

        if (action === "create") {
            const name = form.get("name")?.toString() || "";
            const description = form.get("description")?.toString() || "";
            const rules = form.get("rules")?.toString() || "";
            const color = form.get("color")?.toString() || "#10b981";

            if (name.trim()) {
                await storage.saveSetup({
                    Name: name.trim(),
                    Description: description,
                    Rules: rules,
                    Color: color,
                });
            }
        }

        if (action === "delete") {
            const id = parseInt(form.get("setupId")?.toString() || "0");
            if (id) await storage.deleteSetup(id);
        }

        const setups = await storage.getSetups();
        const performance = await storage.getSetupPerformance();
        return ctx.render({ setups, performance, saved: action === "create", deleted: action === "delete" });
    },
};

export default function PlaybookPage(props: PageProps<PlaybookData>) {
    const { setups, performance, saved, deleted } = props.data;

    return (
        <>
            <SideMenu active="Playbook" />
            <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
                <div class="max-w-5xl mx-auto">
                    <div class="mb-8">
                        <h1 class="text-2xl font-bold text-white">Playbook</h1>
                        <p class="text-sm text-gray-500 mt-1">Define your trading setups and track which strategies actually work</p>
                    </div>

                    {/* Create Setup Form */}
                    <form method="POST" class="mb-8">
                        <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Add New Setup</h3>

                            {saved && (
                                <div class="mb-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">Setup created!</div>
                            )}

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label class="block text-xs font-medium text-gray-500 mb-1.5">Setup Name *</label>
                                    <input name="name" type="text" required placeholder='e.g. "Morning Reversal", "VWAP Bounce"'
                                        class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-500 mb-1.5">Tag Color</label>
                                    <div class="flex items-center gap-2 flex-wrap">
                                        {PRESET_COLORS.map((c, i) => (
                                            <label key={c} class="cursor-pointer">
                                                <input type="radio" name="color" value={c} class="hidden peer" checked={i === 0} />
                                                <div class="w-7 h-7 rounded-full border-2 border-transparent peer-checked:border-white transition-all" style={`background: ${c}`} />
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
                                <textarea name="description" rows={2} placeholder="What is this setup? When do you look for it?"
                                    class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none resize-none" />
                            </div>

                            <div class="mb-4">
                                <label class="block text-xs font-medium text-gray-500 mb-1.5">Entry/Exit Rules</label>
                                <textarea name="rules" rows={3} placeholder="Entry criteria: ...&#10;Exit criteria: ...&#10;Risk management: ..."
                                    class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none resize-none" />
                            </div>

                            <div class="flex justify-end">
                                <button type="submit" name="action" value="create"
                                    class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Setup
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Existing Setups with Performance */}
                    {setups.length === 0 ? (
                        <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-12 text-center">
                            <svg class="w-12 h-12 mx-auto text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            <h3 class="text-lg font-medium text-gray-400 mb-1">No setups defined yet</h3>
                            <p class="text-sm text-gray-600">Create your first trading setup above to start building your playbook.</p>
                        </div>
                    ) : (
                        <div class="space-y-4">
                            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Your Setups ({setups.length})</h3>
                            {setups.map(setup => {
                                const perf = performance[setup.SetupID || 0];
                                const winRate = perf && perf.trades > 0 ? ((perf.wins / perf.trades) * 100).toFixed(0) : null;

                                return (
                                    <div key={setup.SetupID} class="bg-[#141622] rounded-xl border border-[#1e2235] p-6 hover:border-[#2d3348] transition-colors">
                                        <div class="flex items-start justify-between mb-3">
                                            <div class="flex items-center gap-3">
                                                <span class="text-sm px-3 py-1 rounded-full font-semibold"
                                                    style={`background: ${setup.Color}20; color: ${setup.Color}; border: 1px solid ${setup.Color}40;`}>
                                                    {setup.Name}
                                                </span>
                                                {perf && (
                                                    <span class="text-xs text-gray-500">{perf.trades} trade{perf.trades !== 1 ? "s" : ""}</span>
                                                )}
                                            </div>
                                            <form method="POST" class="inline">
                                                <input type="hidden" name="setupId" value={setup.SetupID} />
                                                <button type="submit" name="action" value="delete"
                                                    class="text-gray-600 hover:text-red-400 transition-colors" title="Delete setup">
                                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </form>
                                        </div>

                                        {setup.Description && (
                                            <p class="text-sm text-gray-400 mb-3">{setup.Description}</p>
                                        )}

                                        {setup.Rules && (
                                            <div class="bg-[#0f1117] rounded-lg p-4 mb-3">
                                                <div class="text-xs text-gray-500 uppercase tracking-wider mb-1">Rules</div>
                                                <p class="text-sm text-gray-300 whitespace-pre-wrap">{setup.Rules}</p>
                                            </div>
                                        )}

                                        {/* Performance Stats */}
                                        {perf && perf.trades > 0 && (
                                            <div class="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-[#1e2235]">
                                                <div>
                                                    <div class="text-xs text-gray-600">Win Rate</div>
                                                    <div class={`text-lg font-bold ${parseInt(winRate || "0") >= 50 ? "text-emerald-400" : "text-red-400"}`}>{winRate}%</div>
                                                </div>
                                                <div>
                                                    <div class="text-xs text-gray-600">Trades</div>
                                                    <div class="text-lg font-bold text-white">{perf.trades}</div>
                                                </div>
                                                <div>
                                                    <div class="text-xs text-gray-600">Net P&L</div>
                                                    <div class={`text-lg font-bold ${perf.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>${perf.pnl.toFixed(2)}</div>
                                                </div>
                                                <div>
                                                    <div class="text-xs text-gray-600">Avg P&L</div>
                                                    <div class={`text-lg font-bold ${perf.pnl / perf.trades >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                                        ${(perf.pnl / perf.trades).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
