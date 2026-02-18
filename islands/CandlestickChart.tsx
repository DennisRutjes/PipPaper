import { useEffect, useRef, useState } from "preact/hooks";

interface Candle {
    t: number; o: number; h: number; l: number; c: number; v: number;
}

interface ChartData {
    symbol: string;
    interval: string;
    candles: Candle[];
    entryTimestamp: number;
    exitTimestamp: number;
    entryPrice: number;
    exitPrice: number;
    side: string;
    stopLoss?: number;
    profitTarget?: number;
}

export default function CandlestickChart({ tradeId }: { tradeId: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [data, setData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchData = async (force: boolean = false) => {
        setLoading(true);
        setError("");
        try {
            const url = `/api/klines?tradeId=${tradeId}${force === true ? "&refresh=1" : ""}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [tradeId]);

    const drawChart = (d: ChartData) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Resize canvas to match display size (high DPI)
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const padding = { top: 20, right: 60, bottom: 30, left: 10 };

        // Clear
        ctx.fillStyle = "#141622";
        ctx.fillRect(0, 0, w, h);

        if (!d.candles || !d.candles.length) {
            ctx.fillStyle = "#6b7280";
            ctx.font = "14px sans-serif";
            ctx.fillText("No data available", w / 2 - 50, h / 2);
            return;
        }

        try {
            // Filter candles to relevant range
            // If the dataset is huge (fallback fetch), zoom in to the trade
            const duration = d.exitTimestamp - d.entryTimestamp;
            // Determine buffer based on duration
            // For short trades (< 1h), show +/- 30 mins or 2x duration
            // For long trades, show +/- 20%
            let buffer = Math.max(1800, duration * 2); // Min 30 mins context
            if (duration > 86400) buffer = duration * 0.2; // 20% for multi-day

            let viewStart = d.entryTimestamp - buffer;
            let viewEnd = d.exitTimestamp + buffer;

            // Helper to filter candles
            const getVisibleCandles = (start: number, end: number) => 
                d.candles
                    .filter(c => c.t >= start && c.t <= end)
                    .sort((a, b) => a.t - b.t);

            let visibleCandles = getVisibleCandles(viewStart, viewEnd);

            // If strict filtering result in no/few candles, progressively expand range
            // This handles cases where market was closed or data is sparse/gappy around the trade time
            if (visibleCandles.length < 2) {
                // Try 4 hours
                visibleCandles = getVisibleCandles(d.entryTimestamp - 14400, d.exitTimestamp + 14400);
            }
            if (visibleCandles.length < 2) {
                // Try 24 hours
                visibleCandles = getVisibleCandles(d.entryTimestamp - 86400, d.exitTimestamp + 86400);
            }

            // If filtering resulted in no candles (e.g. data is way off), fallback to showing everything
            const candlesToRender = visibleCandles.length > 0 ? visibleCandles : d.candles;

            const timeStepsVal = 5;
            const timeIntervalVal = Math.floor(candlesToRender.length / timeStepsVal);
            
            // Calculate scales with strict type coercion
            let minPrice = Infinity, maxPrice = -Infinity;
            let maxVol = 1;

            candlesToRender.forEach(c => {
                // Ensure values are numbers
                const l = Number(c.l);
                const h = Number(c.h);
                const v = Number(c.v);
                
                if (!isNaN(l) && l < minPrice) minPrice = l;
                if (!isNaN(h) && h > maxPrice) maxPrice = h;
                if (!isNaN(v) && v > maxVol) maxVol = v;
            });

            // Add a safety buffer for entry/exit/stop/profit if they are outside candle range
            // Only include markers if they are "reasonably" close to the current price action
            // to avoid compressing the chart too much if there's a bad tick
            const markers = [d.entryPrice, d.exitPrice, d.stopLoss, d.profitTarget].filter(v => v != null && !isNaN(v)) as number[];
            markers.forEach(m => {
                // Only expand range if marker is within 20% of the price range (prevent outliers flattening chart)
                // or if it's the entry/exit price (always relevant)
                if (m === d.entryPrice || m === d.exitPrice || 
                   (m > minPrice * 0.8 && m < maxPrice * 1.2)) {
                    if (m < minPrice) minPrice = m;
                    if (m > maxPrice) maxPrice = m;
                }
            });

            // Safety check if min/max are still invalid
            if (minPrice === Infinity || maxPrice === -Infinity || minPrice >= maxPrice) {
                 // Fallback to avoid infinite/NaN calculations if range is zero
                 if (minPrice === Infinity && maxPrice === -Infinity) {
                     minPrice = 0; maxPrice = 100;
                 } else if (minPrice >= maxPrice) {
                     minPrice -= 1; maxPrice += 1;
                 }
            }

            // Add padding to price range
            let priceRange = maxPrice - minPrice;
            
            // Handle flat or zero range to prevent division by zero
            if (priceRange <= 0) {
                priceRange = maxPrice > 0 ? maxPrice * 0.01 : 1; 
                minPrice -= priceRange;
                maxPrice += priceRange;
            } else {
                minPrice -= priceRange * 0.1;
                maxPrice += priceRange * 0.1;
            }

            const candleW = (w - padding.left - padding.right) / candlesToRender.length;
            // Ensure body has positive width, minimum 1px if plenty of space, otherwise just line
            const gap = Math.max(0, candleW * 0.2); 
            let bodyW = candleW - gap;
            if (bodyW < 0.5) bodyW = 0.5; // hairline

            // Helper: Price to Y
            const getY = (p: number) => {
                if (isNaN(p) || p === null) return -100;
                return padding.top + (maxPrice - p) / (maxPrice - minPrice) * (h - padding.top - padding.bottom);
            };
            // Helper: Time to X
            const getX = (i: number) => padding.left + i * candleW + candleW / 2;

            // Draw Grid & Price Axis (Y)
            ctx.strokeStyle = "#1f2937";
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
            ctx.fillStyle = "#9ca3af"; // text-gray-400
            ctx.textAlign = "left";
            ctx.font = "11px sans-serif";

            const gridSteps = 6;
            for (let i = 0; i <= gridSteps; i++) {
                const y = padding.top + (i / gridSteps) * (h - padding.top - padding.bottom);
                
                // Grid line
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(w - padding.right, y);
                ctx.stroke();
                
                // Price Label
                const price = maxPrice - (i / gridSteps) * (maxPrice - minPrice);
                ctx.fillText(price.toFixed(2), w - padding.right + 8, y + 4);
            }

            // Draw Time Axis (X)
            ctx.textAlign = "center";
            
            // Prevent infinite loop if candles < timeStepsVal
            const tickInterval = Math.max(1, timeIntervalVal);
            
            for (let i = 0; i < candlesToRender.length; i += tickInterval) {
                const x = getX(i);
                const date = new Date(candlesToRender[i].t * 1000);
                
                // Format time based on interval
                let timeStr = "";
                if (d.interval === "1d") {
                    timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                } else {
                    timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                }

                // Tick mark
                ctx.beginPath();
                ctx.moveTo(x, h - padding.bottom);
                ctx.lineTo(x, h - padding.bottom + 5);
                ctx.stroke();

                // Label
                ctx.fillText(timeStr, x, h - padding.bottom + 18);
            }

            // Draw Volume
            const volHeight = (h - padding.top - padding.bottom) * 0.2;
            const volBaseY = h - padding.bottom;

            candlesToRender.forEach((c, i) => {
                const x = getX(i);
                const isUp = c.c >= c.o;
                const color = isUp ? "#10b981" : "#ef4444"; // emerald / red

                // Volume bar
                const vH = (Number(c.v) / maxVol) * volHeight;
                ctx.fillStyle = isUp ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
                ctx.fillRect(x - bodyW / 2, volBaseY - vH, bodyW, vH);

                // Wick
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, getY(Number(c.h)));
                ctx.lineTo(x, getY(Number(c.l)));
                ctx.stroke();

                // Body
                ctx.fillStyle = color;
                const yO = getY(Number(c.o));
                const yC = getY(Number(c.c));
                const bH = Math.max(1, Math.abs(yC - yO));
                ctx.fillRect(x - bodyW / 2, Math.min(yO, yC), bodyW, bH);
            });

            // --- Draw Markers with Smart Label Positioning ---
            const labelPositions: {y: number, height: number}[] = [];
            
            const drawMarkerLine = (price: number, color: string, label: string, isDashed = true) => {
                const y = getY(price);
                
                // Avoid drawing if excessively out of bounds
                if (y < -20 || y > h + 20) return;

                ctx.strokeStyle = color;
                if (isDashed) ctx.setLineDash([5, 5]);
                else ctx.setLineDash([]);
                
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(w - padding.right, y);
                ctx.stroke();
                ctx.setLineDash([]);

                // Smart Label Positioning to avoid overlap
                let labelY = y;
                const labelH = 14;
                
                // Simple collision detection/adjustment
                // If this label is too close to a previous one, move it up
                // (This assumes we draw bottom-up or top-down sorted, but even simple shift helps)
                // Let's try to find a clear spot
                let clash = true;
                let attempts = 0;
                while (clash && attempts < 5) {
                    clash = false;
                    for (const p of labelPositions) {
                        if (Math.abs(p.y - labelY) < labelH) {
                            labelY -= labelH; // Stack upwards
                            clash = true;
                            break;
                        }
                    }
                    attempts++;
                }
                labelPositions.push({ y: labelY, height: labelH });

                ctx.fillStyle = color;
                ctx.font = "10px sans-serif";
                ctx.fillText(`${label}: ${price}`, w - padding.right + 5, labelY + 4);
            };

            // Order markers by price (ascending) so they stack nicely naturally
            // We'll collect them first
            const markerDefs = [
                { p: d.entryPrice, c: "#3b82f6", l: "ENTRY", dashed: true },
                { p: d.exitPrice, c: "#8b5cf6", l: "EXIT", dashed: true },
                { p: d.stopLoss, c: "#ef4444", l: "SL", dashed: true },
                { p: d.profitTarget, c: "#10b981", l: "TP", dashed: true }
            ].filter(m => m.p != null && !isNaN(m.p))
             .sort((a, b) => b.p! - a.p!); // Sort descending (top to bottom) for Y-axis check

            markerDefs.forEach(m => drawMarkerLine(m.p!, m.c, m.l, m.dashed));

            // Find closest candle indices for Entry and Exit (in the filtered view)
            let closestEntryIndex = -1;
            let minEntryDiff = Infinity;
            let closestExitIndex = -1;
            let minExitDiff = Infinity;
            
            // Approximate interval in seconds
            let intervalSec = 60; // 1m
            if (d.interval === "5m") intervalSec = 300;
            if (d.interval === "15m") intervalSec = 900;
            if (d.interval === "1h") intervalSec = 3600;
            if (d.interval === "1d") intervalSec = 86400;

            candlesToRender.forEach((c, i) => {
                const entryDiff = Math.abs(c.t - d.entryTimestamp);
                if (entryDiff < minEntryDiff) {
                    minEntryDiff = entryDiff;
                    closestEntryIndex = i;
                }
                const exitDiff = Math.abs(c.t - d.exitTimestamp);
                if (exitDiff < minExitDiff) {
                    minExitDiff = exitDiff;
                    closestExitIndex = i;
                }
            });

            // Determine validity - relax strictness since we are zooming
            const entryValid = closestEntryIndex !== -1 && minEntryDiff <= Math.max(intervalSec * 2, 3600); 
            const exitValid = closestExitIndex !== -1 && minExitDiff <= Math.max(intervalSec * 2, 3600);

            // Check for overlap
            const isOverlap = entryValid && exitValid && closestEntryIndex === closestExitIndex;

            // Draw Entry Marker (Triangle at bottom)
            if (entryValid) {
                const x = getX(closestEntryIndex);
                
                // Vertical Line
                ctx.beginPath();
                ctx.setLineDash([2, 4]); 
                ctx.strokeStyle = "rgba(59, 130, 246, 0.5)"; 
                ctx.lineWidth = 1;
                ctx.moveTo(x, padding.top);
                ctx.lineTo(x, h - padding.bottom);
                ctx.stroke();
                ctx.setLineDash([]);

                // Marker
                const markerX = isOverlap ? x - 5 : x;
                ctx.fillStyle = "#3b82f6";
                ctx.beginPath();
                ctx.moveTo(markerX, h - padding.bottom);
                ctx.lineTo(markerX - 4, h - padding.bottom + 6);
                ctx.lineTo(markerX + 4, h - padding.bottom + 6);
                ctx.fill();
            }

            // Draw Exit Marker (Triangle at bottom)
            if (exitValid) {
                const x = getX(closestExitIndex);
                
                // Vertical Line
                ctx.beginPath();
                ctx.setLineDash([2, 4]); 
                ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
                ctx.lineWidth = 1;
                ctx.moveTo(x, padding.top);
                ctx.lineTo(x, h - padding.bottom);
                ctx.stroke();
                ctx.setLineDash([]);

                // Marker
                const markerX = isOverlap ? x + 5 : x;
                ctx.fillStyle = "#8b5cf6";
                ctx.beginPath();
                ctx.moveTo(markerX, h - padding.bottom);
                ctx.lineTo(markerX - 4, h - padding.bottom + 6);
                ctx.lineTo(markerX + 4, h - padding.bottom + 6);
                ctx.fill();
            }
        } catch (e) {
            console.error("Chart drawing error:", e);
            ctx.fillStyle = "#ef4444";
            ctx.fillText("Chart Error", w / 2 - 30, h / 2);
        }

    };

    useEffect(() => {
        if (data) {
            drawChart(data);
        }
    }, [data]);

    return (
        <div class="bg-[#141622] rounded-xl border border-[#1e2235] overflow-hidden relative" style={{ height: "450px" }}>
            {loading && (
                <div class="absolute inset-0 flex items-center justify-center bg-[#141622] z-10">
                    <svg class="w-8 h-8 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                </div>
            )}
            
            {error && (
                <div class="absolute inset-0 flex items-center justify-center bg-[#141622] z-10 p-4 text-center">
                    <div class="text-red-400">
                        <p class="font-medium mb-1">Chart Error</p>
                        <p class="text-sm opacity-80">{error}</p>
                        <button onClick={() => fetchData(true)} class="mt-3 px-3 py-1 bg-[#1e2235] hover:bg-[#2d3348] rounded text-xs text-white transition-colors">
                            Retry
                        </button>
                    </div>
                </div>
            )}

            <div class="absolute top-3 left-4 z-10 flex items-center gap-3">
                <span class="text-white font-bold text-lg">{data?.symbol}</span>
                <span class="text-gray-500 text-xs bg-[#1e2235] px-2 py-0.5 rounded border border-[#2d3348]">
                    {data?.interval} • {data?.side}
                </span>
            </div>

            <div class="absolute top-3 right-4 z-10">
                <button
                    onClick={() => fetchData(true)}
                    class="p-1.5 bg-[#1e2235] hover:bg-[#2d3348] border border-[#2d3348] rounded text-gray-400 hover:text-white transition-colors"
                    title="Force refresh chart data"
                >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>
            
            <canvas id="trade-chart-canvas" ref={canvasRef} class="w-full h-full block" />
        </div>
    );
}
