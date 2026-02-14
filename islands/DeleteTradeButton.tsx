import { useState, useRef } from "preact/hooks";
import Modal from "./Modal.tsx";

export default function DeleteTradeButton() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    const handleDeleteClick = (e: Event) => {
        e.preventDefault();
        setIsModalOpen(true);
    };

    const handleConfirm = () => {
        setIsModalOpen(false);
        formRef.current?.submit();
    };

    return (
        <>
            <form ref={formRef} method="POST" class="inline-block">
                <input type="hidden" name="action" value="delete_trade" />
                <button 
                    onClick={handleDeleteClick}
                    type="button" 
                    class="text-gray-500 hover:text-red-400 transition-colors p-1" 
                    title="Delete Trade"
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </form>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirm}
                title="Delete Trade"
                message="Are you sure you want to delete this trade? This action cannot be undone."
                confirmText="Delete"
                isDanger={true}
            />
        </>
    );
}
