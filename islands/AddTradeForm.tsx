import { useState } from "preact/hooks";

export default function AddTradeForm() {
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const today = new Date().toISOString().split("T")[0];

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        setSuccess(false);

        const form = e.target as HTMLFormElement;
        const data = Object.fromEntries(new FormData(form));

        try {
            const res = await fetch("/api/trades", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setSuccess(true);
            form.reset();
            setTimeout(() => window.location.reload(), 800);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Trade
            </button>
        );
    }

    const inputClass = "w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none";
    const labelClass = "block text-xs font-medium text-gray-500 mb-1.5";

    return (
        <div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div class="bg-[#141622] rounded-xl border border-[#1e2235] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div class="flex items-center justify-between p-5 border-b border-[#1e2235]">
                    <h2 class="text-lg font-bold text-white">Add Manual Trade</h2>
                    <button onClick={() => setOpen(false)} class="text-gray-500 hover:text-gray-300">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} class="p-5 space-y-5">
                    {error && (
                        <div class="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">{error}</div>
                    )}
                    {success && (
                        <div class="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">Trade added! Refreshing...</div>
                    )}

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class={labelClass}>Symbol *</label>
                            <input name="symbol" type="text" required placeholder="e.g. AAPL, ES, NQ" class={inputClass} />
                        </div>
                        <div>
                            <label class={labelClass}>Side</label>
                            <select name="side" class={inputClass}>
                                <option value="LONG">LONG</option>
                                <option value="SHORT">SHORT</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class={labelClass}>Entry Price *</label>
                            <input name="entryPrice" type="number" step="any" required placeholder="0.00" class={inputClass} />
                        </div>
                        <div>
                            <label class={labelClass}>Exit Price *</label>
                            <input name="exitPrice" type="number" step="any" required placeholder="0.00" class={inputClass} />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-4">
                        <div>
                            <label class={labelClass}>Quantity *</label>
                            <input name="quantity" type="number" required placeholder="1" class={inputClass} />
                        </div>
                        <div>
                            <label class={labelClass}>P&L (auto-calc if empty)</label>
                            <input name="pnl" type="number" step="any" placeholder="Auto" class={inputClass} />
                        </div>
                        <div>
                            <label class={labelClass}>Commission</label>
                            <input name="commission" type="number" step="any" placeholder="0.00" class={inputClass} />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class={labelClass}>Entry Date *</label>
                            <input name="entryDate" type="date" required value={today} class={inputClass} />
                        </div>
                        <div>
                            <label class={labelClass}>Entry Time</label>
                            <input name="entryTime" type="time" value="09:30" class={inputClass} />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class={labelClass}>Exit Date</label>
                            <input name="exitDate" type="date" value={today} class={inputClass} />
                        </div>
                        <div>
                            <label class={labelClass}>Exit Time</label>
                            <input name="exitTime" type="time" value="16:00" class={inputClass} />
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class={labelClass}>Stop Loss</label>
                            <input name="stopLoss" type="number" step="any" placeholder="Optional" class={inputClass} />
                        </div>
                        <div>
                            <label class={labelClass}>Profit Target</label>
                            <input name="profitTarget" type="number" step="any" placeholder="Optional" class={inputClass} />
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setOpen(false)} class="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm font-medium">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                            {saving ? "Saving..." : "Add Trade"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
