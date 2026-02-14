import { useState } from "preact/hooks";
import ImportProcessor from "./ImportProcessor.tsx";
import { showToast } from "./Toast.tsx";

export default function ImportForm() {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [importedIds, setImportedIds] = useState<string[] | null>(null);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const file = formData.get("file") as File;

        if (!file) return;

        setUploading(true);
        setUploadProgress(0);
        setImportedIds(null);

        // Use XHR for upload progress
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/import_trades", true);
        xhr.setRequestHeader("Accept", "application/json");

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                setUploadProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const data = JSON.parse(xhr.responseText);
                    if (data.error) throw new Error(data.error);

                    if (data.importedIds && data.importedIds.length > 0) {
                        setImportedIds(data.importedIds);
                        showToast(`Imported ${data.importedIds.length} trades. Processing...`, "success");
                    } else {
                        showToast("No trades found in file.", "info");
                    }
                } catch (err) {
                    showToast((err as Error).message, "error");
                }
            } else {
                showToast(xhr.responseText || "Upload failed", "error");
            }
            setUploading(false);
        };

        xhr.onerror = () => {
            showToast("Network error during upload", "error");
            setUploading(false);
        };

        xhr.send(formData);
    };

    if (importedIds) {
        return (
            <div class="space-y-6">
                <ImportProcessor importedIds={importedIds} />
                <div class="flex justify-center">
                    <button 
                        onClick={() => setImportedIds(null)}
                        class="text-sm text-gray-500 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4V4" />
                        </svg>
                        Import Another File
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-8">
            <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                    <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <div>
                    <h2 class="text-lg font-semibold text-white">Tradovate CSV Upload</h2>
                    <p class="text-sm text-gray-500">Select your 'Performance.csv' file exported from Tradovate</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} class="space-y-6">
                <label class="flex flex-col items-center justify-center w-full h-52 border-2 border-[#2d3348] border-dashed rounded-xl cursor-pointer bg-[#1a1d2e] hover:bg-[#1e2235] hover:border-emerald-500/30 transition-all group">
                    <div class="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                            <div class="flex flex-col items-center w-full px-10">
                                <svg class="w-10 h-10 mb-4 text-emerald-500 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                </svg>
                                <p class="text-sm text-emerald-400 font-medium mb-2">Uploading... {uploadProgress}%</p>
                                <div class="w-full bg-[#0f1117] rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        class="bg-emerald-500 h-1.5 rounded-full transition-all duration-100 ease-linear" 
                                        style={{ width: `${uploadProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <svg class="w-10 h-10 mb-4 text-gray-600 group-hover:text-gray-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p class="mb-2 text-sm text-gray-400">
                                    <span class="font-semibold text-emerald-400">Click to upload</span> or drag and drop
                                </p>
                                <p class="text-xs text-gray-600">CSV files only (Performance.csv)</p>
                            </>
                        )}
                    </div>
                    <input name="file" type="file" class="hidden" accept=".csv" required disabled={uploading} 
                        onChange={(e) => {
                            if ((e.target as HTMLInputElement).files?.length) {
                                // Optional: Auto-submit or show filename
                            }
                        }}
                    />
                </label>

                <div class="flex justify-end">
                    <button
                        type="submit"
                        disabled={uploading}
                        class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        {uploading ? "Processing..." : (
                            <>
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Import Trades
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
