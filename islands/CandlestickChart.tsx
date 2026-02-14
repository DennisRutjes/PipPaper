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

    useEffect(() => {
        fetchData();
    }, [tradeId]);

    useEffect(() => {
        if (data && canvasRef.current) {
            drawChart(data);
            window.addEventListener("resize", () => drawChart(data));
            return () => window.removeEventListener("resize", () => drawChart(data));
        }
    }, [data]);

    const fetchData = async () => {
        try {
            const res = await fetch(`/api/klines?tradeId=${tradeId}`);
            const json = await res.json();
            if (json.error) throw new Error(json.error);
            setData(json);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    };

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

        if (!d.candles.length) {
            ctx.fillStyle = "#6b7280";
            ctx.font = "14px sans-serif";
            ctx.fillText("No data available", w / 2 - 50, h / 2);
            return;
        }

        // Calculate scales
        let minPrice = Infinity, maxPrice = -Infinity;
        let maxVol = 0;

        d.candles.forEach(c => {
            if (c.l < minPrice) minPrice = c.l;
            if (c.h > maxPrice) maxPrice = c.h;
            if (c.v > maxVol) maxVol = c.v;
        });

        // Add padding to price range
        const priceRange = maxPrice - minPrice;
        minPrice -= priceRange * 0.1;
        maxPrice += priceRange * 0.1;

        const candleW = (w - padding.left - padding.right) / d.candles.length;
        const gap = Math.max(1, candleW * 0.2);
        const bodyW = candleW - gap;

        // Helper: Price to Y
        const getY = (p: number) => padding.top + (maxPrice - p) / (maxPrice - minPrice) * (h - padding.top - padding.bottom);
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
        const timeSteps = 5;
        const timeInterval = Math.floor(d.candles.length / timeSteps);
        
        for (let i = 0; i < d.candles.length; i += timeInterval) {
            const x = getX(i);
            const date = new Date(d.candles[i].t * 1000);
            
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

        d.candles.forEach((c, i) => {
            const x = getX(i);
            const isUp = c.c >= c.o;
            const color = isUp ? "#10b981" : "#ef4444"; // emerald / red

            // Volume bar
            const vH = (c.v / maxVol) * volHeight;
            ctx.fillStyle = isUp ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
            ctx.fillRect(x - bodyW / 2, volBaseY - vH, bodyW, vH);

            // Wick
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, getY(c.h));
            ctx.lineTo(x, getY(c.l));
            ctx.stroke();

            // Body
            ctx.fillStyle = color;
            const yO = getY(c.o);
            const yC = getY(c.c);
            const bH = Math.max(1, Math.abs(yC - yO));
            ctx.fillRect(x - bodyW / 2, Math.min(yO, yC), bodyW, bH);
        });

        // Draw Entry/Exit Lines
        const entryY = getY(d.entryPrice);
        const exitY = getY(d.exitPrice);

        // Entry Line (Blue dashed)
        ctx.strokeStyle = "#3b82f6";
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(padding.left, entryY);
        ctx.lineTo(w - padding.right, entryY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = "#3b82f6";
        ctx.font = "10px sans-serif";
        ctx.fillText(`ENTRY: ${d.entryPrice}`, w - padding.right + 5, entryY + 3);

        // Exit Line (Purple dashed)
        ctx.strokeStyle = "#8b5cf6";
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left, exitY);
        ctx.lineTo(w - padding.right, exitY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = "#8b5cf6";
        ctx.fillText(`EXIT: ${d.exitPrice}`, w - padding.right + 5, exitY + 3);

        // Draw Stop Loss if set
        if (d.stopLoss) {
            const slY = getY(d.stopLoss);
            ctx.strokeStyle = "#ef4444";
            ctx.setLineDash([2, 2]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, slY);
            ctx.lineTo(w - padding.right, slY);
            ctx.stroke();
            ctx.fillStyle = "#ef4444";
            ctx.fillText(`SL: ${d.stopLoss}`, w - padding.right + 5, slY + 3);
        }

        // Draw Profit Target if set
        if (d.profitTarget) {
            const ptY = getY(d.profitTarget);
            ctx.strokeStyle = "#10b981";
            ctx.setLineDash([2, 2]);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, ptY);
            ctx.lineTo(w - padding.right, ptY);
            ctx.stroke();
            ctx.fillStyle = "#10b981";
            ctx.fillText(`TP: ${d.profitTarget}`, w - padding.right + 5, ptY + 3);
        }

        // Find closest candle indices for Entry and Exit
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

        d.candles.forEach((c, i) => {
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

        // Determine validity
        const entryValid = closestEntryIndex !== -1 && minEntryDiff <= intervalSec * 1.5;
        const exitValid = closestExitIndex !== -1 && minExitDiff <= intervalSec * 1.5;

        // Check for overlap
        const isOverlap = entryValid && exitValid && closestEntryIndex === closestExitIndex;

        // Draw Entry Marker
        if (entryValid) {
            const x = getX(closestEntryIndex);
            
            // Draw Vertical Dashed Line
            ctx.beginPath();
            ctx.setLineDash([2, 4]); // Sparse dash
            ctx.strokeStyle = "rgba(59, 130, 246, 0.5)"; // Blue with opacity
            ctx.lineWidth = 1;
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, h - padding.bottom);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw small triangle marker at bottom axis
            // Shift left if overlapping
            const markerX = isOverlap ? x - 5 : x;

            ctx.fillStyle = "#3b82f6";
            ctx.beginPath();
            ctx.moveTo(markerX, h - padding.bottom);
            ctx.lineTo(markerX - 4, h - padding.bottom + 6);
            ctx.lineTo(markerX + 4, h - padding.bottom + 6);
            ctx.fill();
        }

        // Draw Exit Marker
        if (exitValid) {
            const x = getX(closestExitIndex);
            
            // Draw Vertical Dashed Line
            ctx.beginPath();
            ctx.setLineDash([2, 4]); // Sparse dash
            ctx.strokeStyle = "rgba(139, 92, 246, 0.5)"; // Purple with opacity
            ctx.lineWidth = 1;
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, h - padding.bottom);
            ctx.stroke();
            ctx.setLineDash([]);

            // Draw small triangle marker at bottom axis
            // Shift right if overlapping
            const markerX = isOverlap ? x + 5 : x;

            ctx.fillStyle = "#8b5cf6";
            ctx.beginPath();
            ctx.moveTo(markerX, h - padding.bottom);
            ctx.lineTo(markerX - 4, h - padding.bottom + 6);
            ctx.lineTo(markerX + 4, h - padding.bottom + 6);
            ctx.fill();
        }
    };

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
                        <button onClick={fetchData} class="mt-3 px-3 py-1 bg-[#1e2235] hover:bg-[#2d3348] rounded text-xs text-white transition-colors">
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

            <canvas ref={canvasRef} class="w-full h-full block" />
        </div>
    );
}
