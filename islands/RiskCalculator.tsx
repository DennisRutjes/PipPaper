import { useState, useEffect } from "preact/hooks";

interface RiskCalculatorProps {
    initialStopLoss: number | null;
    initialProfitTarget: number | null;
    entryPrice: number;
    multiplier: number;
    side: string; // "LONG" or "SHORT"
    tickSize: number;
}

type InputMode = "price" | "ticks" | "pnl";

export default function RiskCalculator({
    initialStopLoss,
    initialProfitTarget,
    entryPrice,
    multiplier,
    side,
    tickSize,
}: RiskCalculatorProps) {
    const [mode, setMode] = useState<InputMode>("pnl"); // Default to Net PnL per user request
    
    // Internal state stores the current input values as strings to allow empty/decimal typing
    const [slInput, setSlInput] = useState<string>("");
    const [tpInput, setTpInput] = useState<string>("");

    // Calculated absolute prices to send in the form
    const [finalStopLoss, setFinalStopLoss] = useState<number | null>(initialStopLoss);
    const [finalProfitTarget, setFinalProfitTarget] = useState<number | null>(initialProfitTarget);

    // Initialize inputs based on default mode (PnL)
    useEffect(() => {
        updateInputsFromPrice(initialStopLoss, initialProfitTarget, "pnl");
    }, []);

    // Helper: Convert Absolute Price -> Value in Current Mode
    const priceToModeValue = (price: number | null, m: InputMode): string => {
        if (price === null || isNaN(price)) return "";
        
        const dist = Math.abs(price - entryPrice);
        
        if (m === "price") return price.toString();
        if (m === "ticks") return (dist / tickSize).toFixed(0); // Ticks are usually integers
        if (m === "pnl") return (dist * multiplier).toFixed(2);
        
        return "";
    };

    // Helper: Convert Value in Current Mode -> Absolute Price
    const modeValueToPrice = (val: string, m: InputMode, isStop: boolean): number | null => {
        const v = parseFloat(val);
        if (isNaN(v)) return null;

        if (m === "price") return v;

        let dist = 0;
        if (m === "ticks") dist = v * tickSize;
        if (m === "pnl") dist = v / multiplier;

        // Calculate direction
        // For LONG: Stop is below, Target is above
        // For SHORT: Stop is above, Target is below
        const isLong = side.toUpperCase() === "LONG";
        
        if (isStop) {
            return isLong ? entryPrice - dist : entryPrice + dist;
        } else {
            return isLong ? entryPrice + dist : entryPrice - dist;
        }
    };

    // Update inputs when mode changes
    const handleModeChange = (newMode: InputMode) => {
        // Convert current underlying prices to new mode display strings
        const newSl = priceToModeValue(finalStopLoss, newMode);
        const newTp = priceToModeValue(finalProfitTarget, newMode);
        
        setSlInput(newSl);
        setTpInput(newTp);
        setMode(newMode);
    };

    const updateInputsFromPrice = (sl: number | null, tp: number | null, m: InputMode) => {
        setSlInput(priceToModeValue(sl, m));
        setTpInput(priceToModeValue(tp, m));
    };

    // Handlers for user typing
    const handleSlChange = (val: string) => {
        setSlInput(val);
        const price = modeValueToPrice(val, mode, true);
        setFinalStopLoss(price);
    };

    const handleTpChange = (val: string) => {
        setTpInput(val);
        const price = modeValueToPrice(val, mode, false);
        setFinalProfitTarget(price);
    };

    return (
        <div class="space-y-4">
            {/* Mode Selector */}
            <div class="flex items-center gap-4 mb-2">
                <span class="text-xs font-medium text-gray-500">Input Unit:</span>
                <div class="flex bg-[#1a1d2e] rounded-lg p-0.5 border border-[#2d3348]">
                    <button
                        type="button"
                        onClick={() => handleModeChange("price")}
                        class={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === "price" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-gray-200"}`}
                    >
                        Price
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange("ticks")}
                        class={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === "ticks" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-gray-200"}`}
                    >
                        Ticks
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeChange("pnl")}
                        class={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === "pnl" ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-gray-200"}`}
                    >
                        PnL / Contract ($)
                    </button>
                </div>
            </div>

            {/* Inputs */}
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-2">
                        Stop Loss ({mode === "price" ? "@" : mode === "ticks" ? "ticks" : "$"})
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={slInput}
                        onInput={(e) => handleSlChange(e.currentTarget.value)}
                        placeholder={mode === "price" ? "Price Level" : mode === "ticks" ? "Ticks" : "Dollar Amount"}
                        class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    {/* Hidden input for form submission */}
                    <input type="hidden" name="stopLoss" value={finalStopLoss || ""} />
                </div>
                <div>
                    <label class="block text-xs font-medium text-gray-500 mb-2">
                        Profit Target ({mode === "price" ? "@" : mode === "ticks" ? "ticks" : "$"})
                    </label>
                    <input
                        type="number"
                        step="any"
                        value={tpInput}
                        onInput={(e) => handleTpChange(e.currentTarget.value)}
                        placeholder={mode === "price" ? "Price Level" : mode === "ticks" ? "Ticks" : "Dollar Amount"}
                        class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    />
                    {/* Hidden input for form submission */}
                    <input type="hidden" name="profitTarget" value={finalProfitTarget || ""} />
                </div>
            </div>
            
            {/* Info display (optional, shows the 'other' values for reference) */}
            <div class="text-xs text-gray-600 flex justify-between px-1">
                <span>
                    {finalStopLoss ? `Level: ${finalStopLoss.toFixed(2)}` : ""}
                </span>
                <span>
                    {finalProfitTarget ? `Level: ${finalProfitTarget.toFixed(2)}` : ""}
                </span>
            </div>
        </div>
    );
}
