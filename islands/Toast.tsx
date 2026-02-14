import { useState, useEffect } from "preact/hooks";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

function ToastItem({ message, type, onClose }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        success: "bg-[#141622] border-emerald-500/30 text-emerald-400",
        error: "bg-[#141622] border-red-500/30 text-red-400",
        info: "bg-[#141622] border-blue-500/30 text-blue-400",
    };

    const icons = {
        success: (
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
        ),
        error: (
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        ),
        info: (
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
    };

    return (
        <div class={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-black/50 transition-all transform animate-in slide-in-from-bottom-5 fade-in duration-300 ${bgColors[type]}`}>
            <div class="flex-shrink-0">{icons[type]}</div>
            <div class="text-sm font-medium">{message}</div>
            <button onClick={onClose} class="ml-auto text-gray-500 hover:text-white transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export default function Toast({ initialMessage, initialType }: { initialMessage?: string; initialType?: ToastType }) {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
        initialMessage ? { message: initialMessage, type: initialType || "info" } : null
    );

    // Listen for custom events to trigger toasts from other islands
    useEffect(() => {
        const handleShowToast = (e: CustomEvent) => {
            setToast({ message: e.detail.message, type: e.detail.type });
        };
        window.addEventListener("show-toast", handleShowToast as EventListener);
        return () => window.removeEventListener("show-toast", handleShowToast as EventListener);
    }, []);

    if (!toast) return null;

    return (
        <div class="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
            <ToastItem
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
            />
        </div>
    );
}

// Helper to trigger toast from client-side code
export function showToast(message: string, type: ToastType = "info") {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: { message, type } }));
    }
}
