import { Trade } from "../services/storage/entities/Trade.ts";
import { Setup } from "../services/storage/entities/Setup.ts";
import { StarRating } from "../components/StarRating.tsx";
import type { Signal } from "@preact/signals";
import { useState, useMemo } from "preact/hooks";

interface TradeLogTableProps {
    trades: Trade[];
    setups: Setup[];
    selectedTradeID: Signal<string>;
    averagePnL: number;
    pageSize?: number;
}

function formatTradeDate(epochSeconds: number): string {
    const d = new Date(epochSeconds * 1000);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

function toDateInputValue(epochSeconds: number): string {
    const d = new Date(epochSeconds * 1000);
    return d.toISOString().split("T")[0];
}

function calcDuration(entry: number, exit: number): string {
    let delta = Math.abs(exit - entry) * 1000; // seconds to ms
    const units = [
        { name: "d", duration: 1000 * 60 * 60 * 24 },
        { name: "h", duration: 1000 * 60 * 60 },
        { name: "m", duration: 1000 * 60 },
    ];
    const results: string[] = [];
    for (const unit of units) {
        const quotient = Math.floor(delta / unit.duration);
        if (quotient !== 0) results.push(`${quotient}${unit.name}`);
        delta = delta % unit.duration;
    }
    return results.slice(0, 3).join(" ") || "<1m";
}

function getTradeSide(trade: Trade): "LONG" | "SHORT" {
    if (trade.Side) return trade.Side;
    if ((trade.EntryPrice || 0) > (trade.ExitPrice || 0) && (trade.PnL || 0) > 0) return "SHORT";
    if ((trade.EntryPrice || 0) < (trade.ExitPrice || 0) && (trade.PnL || 0) < 0) return "SHORT";
    return "LONG";
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function TradeLogTable(props: TradeLogTableProps) {
    const { trades, setups, averagePnL } = props;
    const defaultPageSize = props.pageSize || 25;

    // Filter state
    const [filterSymbol, setFilterSymbol] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [filterSetup, setFilterSetup] = useState("");
    const [filterBroker, setFilterBroker] = useState("");

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(defaultPageSize);

    // Derived data
    const symbols = useMemo(() => [...new Set(trades.map(t => t.Symbol || ""))].filter(Boolean).sort(), [trades]);
    const brokers = useMemo(() => [...new Set(trades.map(t => t.Broker || ""))].filter(Boolean).sort(), [trades]);

    const filteredTrades = useMemo(() => {
        return trades.filter(trade => {
            // Symbol filter
            if (filterSymbol && trade.Symbol !== filterSymbol) return false;

            // Status filter
            if (filterStatus === "win" && (trade.PnL || 0) <= 0) return false;
            if (filterStatus === "loss" && (trade.PnL || 0) >= 0) return false;
            if (filterStatus === "even" && (trade.PnL || 0) !== 0) return false;

            // Date range filter
            if (filterDateFrom) {
                const from = new Date(filterDateFrom).getTime() / 1000;
                const tradeDate = Math.min(trade.EntryTimestamp, trade.ExitTimestamp);
                if (tradeDate < from) return false;
            }
            if (filterDateTo) {
                const to = new Date(filterDateTo + "T23:59:59").getTime() / 1000;
                const tradeDate = Math.max(trade.EntryTimestamp, trade.ExitTimestamp);
                if (tradeDate > to) return false;
            }

            // Setup filter
            if (filterSetup) {
                const setupId = parseInt(filterSetup);
                if (!trade.SetupIDs || !trade.SetupIDs.includes(setupId)) return false;
            }

            // Broker filter
            if (filterBroker && trade.Broker !== filterBroker) return false;

            return true;
        });
    }, [trades, filterSymbol, filterStatus, filterDateFrom, filterDateTo, filterSetup, filterBroker]);

    // Pagination logic
    const totalPages = Math.max(1, Math.ceil(filteredTrades.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIdx = (safeCurrentPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filteredTrades.length);
    const paginatedTrades = filteredTrades.slice(startIdx, endIdx);

    // Reset to page 1 when filters change
    const resetAndFilter = (setter: (v: string) => void) => (value: string) => {
        setter(value);
        setCurrentPage(1);
    };

    const handleClick = (tradeId: string) => {
        props.selectedTradeID.value = tradeId;
        window.location.href = `/trade/${tradeId}`;
    };

    const clearFilters = () => {
        setFilterSymbol("");
        setFilterStatus("all");
        setFilterDateFrom("");
        setFilterDateTo("");
        setFilterSetup("");
        setFilterBroker("");
        setCurrentPage(1);
    };

    const hasActiveFilters = filterSymbol || filterStatus !== "all" || filterDateFrom || filterDateTo || filterSetup || filterBroker;

    return (
        <div>
            {/* Filters */}
            <div class="p-4 border-b border-[#1e2235]">
                <div class="flex flex-wrap gap-3 items-center">
                    {/* Symbol Filter */}
                    <select
                        value={filterSymbol}
                        onChange={(e) => resetAndFilter(setFilterSymbol)((e.target as HTMLSelectElement).value)}
                        class="bg-[#1a1d2e] border border-[#2d3348] text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none"
                    >
                        <option value="">All Symbols</option>
                        {symbols.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>

                    {/* Status Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => resetAndFilter(setFilterStatus)((e.target as HTMLSelectElement).value)}
                        class="bg-[#1a1d2e] border border-[#2d3348] text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="win">Winners</option>
                        <option value="loss">Losers</option>
                        <option value="even">Breakeven</option>
                    </select>

                    {/* Broker Filter */}
                    {brokers.length > 0 && (
                        <select
                            value={filterBroker}
                            onChange={(e) => resetAndFilter(setFilterBroker)((e.target as HTMLSelectElement).value)}
                            class="bg-[#1a1d2e] border border-[#2d3348] text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="">All Brokers</option>
                            {brokers.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    )}

                    {/* Setup Filter */}
                    {setups.length > 0 && (
                        <select
                            value={filterSetup}
                            onChange={(e) => resetAndFilter(setFilterSetup)((e.target as HTMLSelectElement).value)}
                            class="bg-[#1a1d2e] border border-[#2d3348] text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none"
                        >
                            <option value="">All Setups</option>
                            {setups.map(s => <option key={s.SetupID} value={s.SetupID?.toString()}>{s.Name}</option>)}
                        </select>
                    )}

                    {/* Date From */}
                    <div class="flex items-center gap-1">
                        <span class="text-xs text-gray-500">From:</span>
                        <input
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => resetAndFilter(setFilterDateFrom)((e.target as HTMLInputElement).value)}
                            class="bg-[#1a1d2e] border border-[#2d3348] text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Date To */}
                    <div class="flex items-center gap-1">
                        <span class="text-xs text-gray-500">To:</span>
                        <input
                            type="date"
                            value={filterDateTo}
                            onChange={(e) => resetAndFilter(setFilterDateTo)((e.target as HTMLInputElement).value)}
                            class="bg-[#1a1d2e] border border-[#2d3348] text-gray-300 text-sm rounded-lg px-3 py-2 focus:border-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Clear Filters */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            class="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Clear
                        </button>
                    )}

                    <div class="ml-auto text-sm text-gray-500 flex items-center">
                        Showing {startIdx + 1}–{endIdx} of {filteredTrades.length} trades
                    </div>
                </div>
            </div>

            {/* Table */}
            <div class="overflow-x-auto">
                <table class="min-w-full">
                    <thead>
                        <tr class="border-b border-[#1e2235]">
                            {["Status", "AI", "Symbol", "Broker", "Side", "Open Date", "Net P&L", "Gross P&L", "Entry", "Exit", "Duration", "Qty"].map(header => (
                                <th key={header} class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedTrades.map((trade: Trade) => {
                            const pnl = trade.PnL || 0;
                            const netPnl = pnl + (trade.AdjustedCost || 0);
                            const isWin = pnl > 0;
                            const isLoss = pnl < 0;
                            const side = getTradeSide(trade);
                            const startTs = trade.EntryTimestamp < trade.ExitTimestamp ? trade.EntryTimestamp : trade.ExitTimestamp;

                            return (
                                <tr
                                    key={trade.BrokerTradeID}
                                    onClick={() => handleClick(trade.BrokerTradeID)}
                                    class="border-b border-[#1e2235]/50 cursor-pointer hover:bg-[#1a1d2e] transition-colors group"
                                >
                                    <td class="px-4 py-3.5">
                                        <span class={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                                            isWin ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                                            isLoss ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                                            "bg-gray-500/15 text-gray-400 border border-gray-500/30"
                                        }`}>
                                            {isWin ? "WIN" : isLoss ? "LOSS" : "EVEN"}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3.5">
                                        {trade.AIRating ? (
                                            <StarRating rating={trade.AIRating} size="xs" />
                                        ) : (
                                            <span class="text-xs text-gray-600">-</span>
                                        )}
                                    </td>
                                    <td class="px-4 py-3.5">
                                        <span class="font-semibold text-white text-sm">{trade.Symbol}</span>
                                    </td>
                                    <td class="px-4 py-3.5">
                                        <span class="text-xs text-gray-500">{trade.Broker || "—"}</span>
                                    </td>
                                    <td class="px-4 py-3.5">
                                        <span class={`text-xs font-medium px-2 py-0.5 rounded ${
                                            side === "LONG" ? "bg-blue-500/15 text-blue-400" : "bg-orange-500/15 text-orange-400"
                                        }`}>
                                            {side}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3.5 text-sm text-gray-400 whitespace-nowrap">
                                        {formatTradeDate(startTs)}
                                    </td>
                                    <td class={`px-4 py-3.5 text-sm font-semibold whitespace-nowrap ${isWin ? "text-emerald-400" : isLoss ? "text-red-400" : "text-gray-400"}`}>
                                        ${netPnl.toFixed(2)}
                                    </td>
                                    <td class={`px-4 py-3.5 text-sm whitespace-nowrap ${isWin ? "text-emerald-400/70" : isLoss ? "text-red-400/70" : "text-gray-500"}`}>
                                        ${pnl.toFixed(2)}
                                    </td>
                                    <td class="px-4 py-3.5 text-sm text-gray-400 font-mono">
                                        {trade.EntryPrice}
                                    </td>
                                    <td class="px-4 py-3.5 text-sm text-gray-400 font-mono">
                                        {trade.ExitPrice}
                                    </td>
                                    <td class="px-4 py-3.5 text-sm text-gray-500 whitespace-nowrap">
                                        {calcDuration(trade.EntryTimestamp, trade.ExitTimestamp)}
                                    </td>
                                    <td class="px-4 py-3.5 text-sm text-gray-400">
                                        {trade.Quantity}
                                    </td>
                                </tr>
                            );
                        })}
                        {paginatedTrades.length === 0 && (
                            <tr>
                                <td colSpan={11} class="px-4 py-12 text-center text-gray-500">
                                    No trades match your filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {filteredTrades.length > 0 && (
                <div class="flex flex-wrap items-center justify-between px-4 py-3 border-t border-[#1e2235] gap-4">
                    {/* Page size selector */}
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500">Rows per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(parseInt((e.target as HTMLSelectElement).value));
                                setCurrentPage(1);
                            }}
                            class="bg-[#1a1d2e] border border-[#2d3348] text-gray-300 text-xs rounded px-2 py-1 focus:border-emerald-500 focus:outline-none"
                        >
                            {PAGE_SIZE_OPTIONS.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>

                    {/* Page navigation */}
                    <div class="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentPage(1)}
                            disabled={safeCurrentPage <= 1}
                            class="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white/5 transition-colors"
                            title="First page"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                            disabled={safeCurrentPage <= 1}
                            class="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white/5 transition-colors"
                            title="Previous page"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <span class="px-3 py-1 text-xs text-gray-400">
                            Page <span class="text-white font-medium">{safeCurrentPage}</span> of <span class="text-white font-medium">{totalPages}</span>
                        </span>

                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                            disabled={safeCurrentPage >= totalPages}
                            class="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white/5 transition-colors"
                            title="Next page"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={safeCurrentPage >= totalPages}
                            class="px-2 py-1 text-xs text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-white/5 transition-colors"
                            title="Last page"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
