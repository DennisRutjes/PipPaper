import { Handlers, PageProps } from "$fresh/server.ts";
import SideMenu from "../../islands/SideMenu.tsx";
import RichEditor from "../../islands/RichEditor.tsx";
import AICoachButton from "../../islands/AICoachButton.tsx";
import CandlestickChart from "../../islands/CandlestickChart.tsx";
import DeleteTradeButton from "../../islands/DeleteTradeButton.tsx";
import { storage } from "../../services/storage/StorageKV.ts";
import { Trade } from "../../services/storage/entities/Trade.ts";
import { Setup } from "../../services/storage/entities/Setup.ts";
import { Note } from "../../services/storage/entities/Note.ts";
import { Tag } from "../../services/storage/entities/Tag.ts";
import { dateInterval, getTradeSide, formatDate } from "../../services/utils/utils.ts";

interface TradeDetailData {
    trade: Trade | null;
    setups: Setup[];
    tags: Tag[];
    tradeNote: Note | null;
    notesSaved?: boolean;
    setupsSaved?: boolean;
}

export const handler: Handlers<TradeDetailData> = {
    async GET(_req, ctx) {
        const tradeID = ctx.params.tradeID;
        const trade = await storage.getTrade(tradeID);
        if (!trade) return ctx.renderNotFound();

        const setups = await storage.getSetups();
        const tags = await storage.getTags();
        const tradeNote = await storage.getTradeNote(tradeID);

        return ctx.render({ trade, setups, tags, tradeNote });
    },
    async POST(req, ctx) {
        const tradeID = ctx.params.tradeID;
        const form = await req.formData();
        const action = form.get("action")?.toString();

        if (action === "delete_trade") {
            await storage.deleteTrade(tradeID);
            return new Response("", {
                status: 303,
                headers: { Location: "/trade_log" },
            });
        }

        const trade = await storage.getTrade(tradeID);
        if (!trade) return ctx.renderNotFound();

        let notesSaved = false;
        let setupsSaved = false;

        if (action === "save_note") {
            const noteHtml = form.get("note")?.toString() || "";
            await storage.saveTradeNote(tradeID, noteHtml);
            notesSaved = true;
        }

        if (action === "save_setups") {
            const setupIds = form.getAll("setupIds").map(s => parseInt(s.toString())).filter(n => !isNaN(n));
            const mistakeTagValues = form.getAll("mistakeTags").map(s => s.toString());
            const freeFormMistakes = form.get("mistakes")?.toString().split(",").map(s => s.trim()).filter(Boolean) || [];
            const mistakes = [...new Set([...mistakeTagValues, ...freeFormMistakes])];
            const stopLoss = form.get("stopLoss")?.toString();
            const profitTarget = form.get("profitTarget")?.toString();
            const entryReason = form.get("entryReason")?.toString() || null;
            const exitReason = form.get("exitReason")?.toString() || null;
            const entryNotes = form.get("entryNotes")?.toString() || null;
            const exitNotes = form.get("exitNotes")?.toString() || null;

            await storage.updateTrade(tradeID, {
                SetupIDs: setupIds,
                Mistakes: mistakes,
                StopLoss: stopLoss ? parseFloat(stopLoss) : null,
                ProfitTarget: profitTarget ? parseFloat(profitTarget) : null,
                EntryReason: entryReason as any,
                ExitReason: exitReason as any,
                EntryNotes: entryNotes,
                ExitNotes: exitNotes,
            });
            setupsSaved = true;
        }

        const setups = await storage.getSetups();
        const tags = await storage.getTags();
        const tradeNote = await storage.getTradeNote(tradeID);
        const updatedTrade = await storage.getTrade(tradeID);

        return ctx.render({ trade: updatedTrade, setups, tags, tradeNote, notesSaved, setupsSaved });
    },
};

export default function TradeDetail(props: PageProps<TradeDetailData>) {
    const { trade, setups, tags, tradeNote, notesSaved, setupsSaved } = props.data;
    const mistakeTags = tags.filter(t => t.Category === "mistake");
    if (!trade) return <div class="text-white p-8">Trade not found</div>;

    const pnl = trade.PnL || 0;
    const netPnl = pnl + (trade.AdjustedCost || 0);
    const isWin = pnl > 0;
    const isLoss = pnl < 0;
    const side = trade.Side || getTradeSide(trade);
    const duration = dateInterval(new Date(trade.ExitTimestamp * 1000), new Date(trade.EntryTimestamp * 1000));

    // R-Multiple calculation
    const riskPerShare = trade.StopLoss
        ? Math.abs((trade.EntryPrice || 0) - trade.StopLoss)
        : null;
    const rMultiple = riskPerShare && riskPerShare > 0
        ? (netPnl / (riskPerShare * (trade.Quantity || 1))).toFixed(2)
        : null;

    return (
        <>
            <SideMenu active="Trade Log" />
            <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
                <div class="max-w-7xl mx-auto">
                    {/* Back link */}
                    <a href="/trade_log" class="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 mb-4 transition-colors">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Trade Log
                    </a>

                    {/* Header — like TradeZella "Tracking" */}
                    <div class="flex flex-wrap justify-between items-start mb-6 gap-4">
                        <div>
                            <h1 class="text-3xl font-bold text-white">{trade.Symbol}</h1>
                            <div class="text-gray-500 text-sm mt-1">
                                {formatDate(trade.EntryTimestamp)} &bull; Duration: {duration}
                                {trade.IsManual && <span class="ml-2 text-xs bg-amber-500/15 text-amber-400 px-2 py-0.5 rounded">Manual</span>}
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <DeleteTradeButton />
                            <span class={`px-3 py-1 rounded-lg text-xs font-bold ${
                                isWin ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                                isLoss ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                                "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                            }`}>{isWin ? "WIN" : isLoss ? "LOSS" : "EVEN"}</span>
                            <span class={`px-3 py-1 rounded-lg text-xs font-bold ${
                                side === "LONG" ? "bg-blue-500/15 text-blue-400" : "bg-orange-500/15 text-orange-400"
                            }`}>{side}</span>
                        </div>
                    </div>

                    {/* Main two-column layout like TradeZella */}
                    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Left Column — Trade Details */}
                        <div class="lg:col-span-2 space-y-6">
                            {/* NET P&L Card */}
                            <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                <div class="text-xs text-gray-500 uppercase tracking-wider mb-2">Net P&L</div>
                                <div class={`text-4xl font-bold ${isWin ? "text-emerald-400" : isLoss ? "text-red-400" : "text-gray-400"}`}>
                                    ${netPnl.toFixed(2)}
                                </div>
                            </div>

                            {/* Execution Details */}
                            <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                <div class="space-y-3">
                                    {[
                                        { label: "Quantity", value: trade.Quantity?.toString() || "-" },
                                        { label: "Commissions & Fees", value: `$${Math.abs(trade.AdjustedCost || 0).toFixed(2)}` },
                                        { label: "Gross P&L", value: `$${pnl.toFixed(2)}`, color: isWin ? "text-emerald-400" : isLoss ? "text-red-400" : "" },
                                        { label: "Entry Price", value: `$${trade.EntryPrice}` },
                                        { label: "Exit Price", value: `$${trade.ExitPrice}` },
                                    ].map(item => (
                                        <div key={item.label} class="flex justify-between items-center py-2 border-b border-[#1e2235] last:border-0">
                                            <span class="text-sm text-gray-500">{item.label}</span>
                                            <span class={`text-sm font-medium ${item.color || "text-white"}`}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Setup Tags & Risk */}
                            <form method="POST">
                                <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                    <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Trade Analysis</h3>

                                    {setupsSaved && (
                                        <div class="mb-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">Saved!</div>
                                    )}

                                    <div class="space-y-4">
                                        <div>
                                            <label class="block text-xs font-medium text-gray-500 mb-2">Stop Loss</label>
                                            <input name="stopLoss" type="number" step="any" value={trade.StopLoss || ""} placeholder="e.g. 4440"
                                                class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-gray-500 mb-2">Profit Target</label>
                                            <input name="profitTarget" type="number" step="any" value={trade.ProfitTarget || ""} placeholder="e.g. 4470"
                                                class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                                        </div>

                                        {rMultiple && (
                                            <div class="flex justify-between items-center py-2 border-t border-[#1e2235]">
                                                <span class="text-sm text-gray-500">R-Multiple</span>
                                                <span class={`text-sm font-bold ${parseFloat(rMultiple) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{rMultiple}R</span>
                                            </div>
                                        )}

                                        {/* Entry/Exit Reasons */}
                                        <div class="border-t border-[#1e2235] pt-4">
                                            <div class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Entry / Exit Reasons</div>
                                            <div class="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-500 mb-1.5">Entry Type</label>
                                                    <select name="entryReason"
                                                        class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                                                        <option value="" selected={!trade.EntryReason}>Select...</option>
                                                        <option value="market" selected={trade.EntryReason === "market"}>Market Order</option>
                                                        <option value="limit" selected={trade.EntryReason === "limit"}>Limit Order</option>
                                                        <option value="stop" selected={trade.EntryReason === "stop"}>Stop Order</option>
                                                        <option value="other" selected={trade.EntryReason === "other"}>Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label class="block text-xs font-medium text-gray-500 mb-1.5">Exit Type</label>
                                                    <select name="exitReason"
                                                        class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                                                        <option value="" selected={!trade.ExitReason}>Select...</option>
                                                        <option value="take_profit" selected={trade.ExitReason === "take_profit"}>Take Profit</option>
                                                        <option value="stop_loss" selected={trade.ExitReason === "stop_loss"}>Stop Loss</option>
                                                        <option value="trailing_stop" selected={trade.ExitReason === "trailing_stop"}>Trailing Stop</option>
                                                        <option value="market" selected={trade.ExitReason === "market"}>Market Exit</option>
                                                        <option value="time_exit" selected={trade.ExitReason === "time_exit"}>Time-Based Exit</option>
                                                        <option value="other" selected={trade.ExitReason === "other"}>Other</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div class="mt-3">
                                                <label class="block text-xs font-medium text-gray-500 mb-1.5">Entry Notes</label>
                                                <input name="entryNotes" type="text" value={trade.EntryNotes || ""} placeholder="Why did you enter this trade?"
                                                    class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                                            </div>
                                            <div class="mt-3">
                                                <label class="block text-xs font-medium text-gray-500 mb-1.5">Exit Notes</label>
                                                <input name="exitNotes" type="text" value={trade.ExitNotes || ""} placeholder="Why did you exit this trade?"
                                                    class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                                            </div>
                                        </div>

                                        <div>
                                            <label class="block text-xs font-medium text-gray-500 mb-2">Setups (from Playbook)</label>
                                            {setups.length > 0 ? (
                                                <div class="flex flex-wrap gap-2">
                                                    {setups.map(s => (
                                                        <label key={s.SetupID} class="flex items-center gap-2 cursor-pointer">
                                                            <input type="checkbox" name="setupIds" value={s.SetupID}
                                                                checked={trade.SetupIDs?.includes(s.SetupID || 0)}
                                                                class="rounded border-[#2d3348] bg-[#1a1d2e] text-emerald-500" />
                                                            <span class="text-xs px-2 py-1 rounded-full font-medium" style={`background: ${s.Color}20; color: ${s.Color}; border: 1px solid ${s.Color}40;`}>
                                                                {s.Name}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div class="text-xs text-gray-600">
                                                    <a href="/playbook" class="text-emerald-400 hover:underline">Create setups in your Playbook</a> to tag trades.
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label class="block text-xs font-medium text-gray-500 mb-2">Mistakes</label>
                                            {mistakeTags.length > 0 && (
                                                <div class="flex flex-wrap gap-2 mb-2">
                                                    {mistakeTags.map(tag => {
                                                        const isSelected = trade.Mistakes?.includes(tag.Name);
                                                        return (
                                                            <label key={tag.TagID} class="cursor-pointer">
                                                                <input type="checkbox" name="mistakeTags" value={tag.Name}
                                                                    checked={isSelected}
                                                                    class="hidden peer" />
                                                                <span class={`text-xs px-2.5 py-1 rounded-full font-medium border transition-all peer-checked:ring-1 peer-checked:ring-offset-1 peer-checked:ring-offset-[#141622]`}
                                                                    style={`background: ${isSelected ? tag.Color + '30' : tag.Color + '10'}; color: ${tag.Color}; border-color: ${tag.Color}40; ${isSelected ? `ring-color: ${tag.Color}` : ''}`}>
                                                                    {tag.Name}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            <input name="mistakes" type="text" value={trade.Mistakes?.filter(m => !mistakeTags.some(t => t.Name === m)).join(", ") || ""} placeholder="Additional mistakes (comma-separated)"
                                                class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                                            {mistakeTags.length === 0 && (
                                                <p class="text-xs text-gray-600 mt-1">
                                                    <a href="/settings?tab=tags" class="text-emerald-400 hover:underline">Add mistake tags in Settings</a> for quick tagging.
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div class="mt-4 flex justify-end">
                                        <button type="submit" name="action" value="save_setups"
                                            class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors">
                                            Save Analysis
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Right Column — Chart + Journal */}
                        <div class="lg:col-span-3 space-y-6">
                            {/* Chart (Canvas-based) */}
                            <CandlestickChart tradeId={trade.BrokerTradeID} />

                            {/* AI Trade Coach */}
                            <AICoachButton
                                tradeId={trade.BrokerTradeID}
                                existingAdvice={trade.AIAdvice}
                                aiRating={trade.AIRating}
                                aiProvider={trade.AIProvider}
                                aiTimestamp={trade.AITimestamp}
                            />

                            {/* Per-trade Journal with Rich Editor */}
                            <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Trade Journal</h3>
                                <p class="text-xs text-gray-600 mb-4">Document your thought process, screenshots, lessons learned.</p>

                                {notesSaved && (
                                    <div class="mb-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
                                        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                        </svg>
                                        Journal saved!
                                    </div>
                                )}

                                <form method="POST">
                                    <RichEditor
                                        initialContent={tradeNote?.NoteData || ""}
                                        placeholder="Why did you take this trade? What was the setup? What would you do differently?"
                                    />
                                    <div class="mt-3 flex justify-end">
                                        <button type="submit" name="action" value="save_note"
                                            class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                                            Save Journal
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
