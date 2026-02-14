import { useRef, useEffect } from "preact/hooks";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

export default function Modal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }: ModalProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (isOpen) {
            dialogRef.current?.showModal();
        } else {
            dialogRef.current?.close();
        }
    }, [isOpen]);

    // Close on click outside
    const handleBackdropClick = (e: MouseEvent) => {
        if (e.target === dialogRef.current) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <dialog
            ref={dialogRef}
            class="bg-transparent p-0 backdrop:bg-black/80 backdrop:backdrop-blur-sm open:animate-in open:fade-in open:zoom-in-95 duration-200"
            onClick={handleBackdropClick}
        >
            <div class="bg-[#141622] border border-[#1e2235] rounded-xl shadow-2xl shadow-black/50 p-6 max-w-md w-full mx-4">
                <h3 class="text-lg font-semibold text-white mb-2">{title}</h3>
                <p class="text-gray-400 text-sm mb-6">{message}</p>
                
                <div class="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        class="px-4 py-2 bg-[#1a1d2e] hover:bg-[#2d3348] text-gray-300 text-sm font-medium rounded-lg transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        class={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                            isDanger 
                                ? "bg-red-600 hover:bg-red-700" 
                                : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </dialog>
    );
}
