import {Handlers, PageProps} from "$fresh/server.ts";
import SideMenu from "../../islands/SideMenu.tsx";
import {storage} from "../../services/storage/StorageKV.ts";
import {Trade} from "../../services/storage/entities/Trade.ts";
import {dateInterval} from "../../islands/TradeLogTable.tsx";
import {AICoachService} from "../../services/ai/AICoachService.ts";
import {useSignal} from "@preact/signals";

interface TradeDetailData {
    trade: Trade | null;
    aiAnalysis?: string;
}

export const handler: Handlers<TradeDetailData> = {
    async GET(_req, ctx) {
        const tradeID = ctx.params.tradeID;
        const trade = await storage.getTrade(tradeID);
        
        if (!trade) {
            return ctx.renderNotFound();
        }

        return ctx.render({ trade });
    },
    async POST(req, ctx) {
        const tradeID = ctx.params.tradeID;
        const trade = await storage.getTrade(tradeID);
        
        if (!trade) {
            return ctx.renderNotFound();
        }

        const form = await req.formData();
        const action = form.get("action");

        if (action === "evaluate") {
            const apiKey = Deno.env.get("GEMINI_API_KEY");
            if (!apiKey) {
                return ctx.render({ trade, aiAnalysis: "Error: GEMINI_API_KEY not configured in .env" });
            }

            const coach = new AICoachService(apiKey);
            const notes = form.get("notes")?.toString();
            const analysis = await coach.evaluateTrade(trade, notes);
            
            return ctx.render({ trade, aiAnalysis: analysis });
        }

        return ctx.render({ trade });
    }
};

export default function TradeDetail(props: PageProps<TradeDetailData>) {
    const { trade, aiAnalysis } = props.data;

    if (!trade) return <div>Trade not found</div>;

    const isWin = (trade.PnL || 0) > 0;
    const pnlColor = isWin ? "text-green-600" : "text-red-600";
    const pnlBg = isWin ? "bg-green-50" : "bg-red-50";
    const pnlBorder = isWin ? "border-green-200" : "border-red-200";

    return (
        <>
            <SideMenu active="Trade Log"/>
            <div className="p-4 sm:ml-64 bg-gray-50 min-h-screen">
                <div className="max-w-6xl mx-auto mt-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-3xl font-bold text-gray-900">{trade.Symbol}</h1>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${pnlColor} ${pnlBg} ${pnlBorder}`}>
                                    {isWin ? "WIN" : "LOSS"}
                                </span>
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200">
                                    {(trade.EntryPrice || 0) > (trade.ExitPrice || 0) && (trade.PnL || 0) > 0 ? "SHORT" : "LONG"}
                                </span>
                            </div>
                            <div className="text-gray-500 text-sm">
                                ID: {trade.BrokerTradeID} • {new Date(trade.EntryTimestamp * 1000).toLocaleString()}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className={`text-4xl font-bold ${pnlColor}`}>
                                ${(trade.PnL || 0).toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-sm mt-1">
                                Net P&L
                            </div>
                        </div>
                    </div>

                    <form method="POST">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column: Stats & Details */}
                            <div className="space-y-6">
                                {/* Key Stats */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Execution Details</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between border-b border-gray-100 pb-2">
                                            <span className="text-gray-500">Entry Price</span>
                                            <span className="font-medium">{trade.EntryPrice}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-100 pb-2">
                                            <span className="text-gray-500">Exit Price</span>
                                            <span className="font-medium">{trade.ExitPrice}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-100 pb-2">
                                            <span className="text-gray-500">Quantity</span>
                                            <span className="font-medium">{trade.Quantity}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-gray-100 pb-2">
                                            <span className="text-gray-500">Commissions</span>
                                            <span className="font-medium text-red-500">-${(trade.AdjustedCost || 0).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between pt-2">
                                            <span className="text-gray-500">Duration</span>
                                            <span className="font-medium">
                                                {dateInterval(new Date(trade.ExitTimestamp * 1000), new Date(trade.EntryTimestamp * 1000))}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tags & Setup (Placeholder for now) */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Analysis</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Setup</label>
                                            <select className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                                <option>Select Setup...</option>
                                                <option>Breakout</option>
                                                <option>Reversal</option>
                                                <option>Trend Following</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Mistakes</label>
                                            <select className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                                <option>None</option>
                                                <option>FOMO</option>
                                                <option>Revenge Trading</option>
                                                <option>Poor Risk Management</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Notes & AI Coach */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Notes */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Journal Notes</h3>
                                    <textarea 
                                        name="notes"
                                        className="w-full h-32 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        placeholder="What was your thought process?"
                                    ></textarea>
                                    <div className="mt-4 flex justify-end">
                                        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                                            Save Notes
                                        </button>
                                    </div>
                                </div>

                                {/* AI Coach Section */}
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl shadow-sm border border-indigo-100 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">🤖</span>
                                        <h3 className="text-lg font-semibold text-indigo-900">AI Trade Coach</h3>
                                    </div>
                                    <p className="text-indigo-700 mb-4 text-sm">
                                        Get an instant analysis of this trade based on your execution and market conditions.
                                    </p>
                                    
                                    {aiAnalysis ? (
                                        <div className="bg-white rounded-lg p-6 border border-indigo-100 mb-4 prose prose-sm max-w-none">
                                            <div dangerouslySetInnerHTML={{ __html: aiAnalysis.replace(/\n/g, '<br/>') }} />
                                        </div>
                                    ) : (
                                        <div className="bg-white/80 rounded-lg p-4 border border-indigo-100 min-h-[100px] mb-4 text-gray-600 text-sm italic">
                                            AI analysis will appear here...
                                        </div>
                                    )}
                                    
                                    <button 
                                        type="submit" 
                                        name="action" 
                                        value="evaluate"
                                        className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span>✨</span> Evaluate Trade
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}