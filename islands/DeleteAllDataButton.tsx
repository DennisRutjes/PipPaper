import { useState, useRef } from "preact/hooks";
import Modal from "./Modal.tsx";

export default function DeleteAllDataButton() {
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
            <form ref={formRef} method="POST">
                <input type="hidden" name="action" value="clear_trades" />
                <input type="hidden" name="activeTab" value="general" />
                <button 
                    onClick={handleDeleteClick}
                    type="button" 
                    class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                    Clear Data
                </button>
            </form>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirm}
                title="Clear All Data"
                message="Are you sure you want to delete ALL trades? This action cannot be undone."
                confirmText="Clear All"
                isDanger={true}
            />
        </>
    );
}
