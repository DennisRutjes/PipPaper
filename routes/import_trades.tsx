import { Handlers, PageProps } from "$fresh/server.ts";
import { Importer } from "../services/import/ImporterService.ts";
import SideMenu from "../islands/SideMenu.tsx";

interface ImportData {
    count?: number;
    error?: string;
}

export const handler: Handlers<ImportData> = {
    async GET(_req, ctx) {
        return ctx.render({});
    },
    async POST(req, ctx) {
        try {
            const form = await req.formData();
            const file = form.get("file") as File;

            if (!file) {
                return ctx.render({ error: "No file uploaded" });
            }

            const content = await file.text();
            const count = await Importer.importTradovateTrades(content);

            return ctx.render({ count });
        } catch (e) {
            return ctx.render({ error: (e as Error).message });
        }
    },
};

export default function ImportPage(props: PageProps<ImportData>) {
    const { count, error } = props.data;

    return (
        <>
            <SideMenu active={"Import Trades"} />
            <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
                <div class="max-w-3xl mx-auto">
                    {/* Header */}
                    <div class="mb-8">
                        <h1 class="text-2xl font-bold text-white">Import Trades</h1>
                        <p class="text-sm text-gray-500 mt-1">Upload your broker exports to start tracking</p>
                    </div>

                    {/* Success Message */}
                    {count !== undefined && (
                        <div class="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-3">
                            <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                            </svg>
                            <div>
                                <div class="font-medium">Import Successful!</div>
                                <div class="text-sm text-emerald-400/70">Successfully imported {count} trades. <a href="/" class="underline hover:text-emerald-300">View Dashboard</a></div>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div class="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                            <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                            </svg>
                            <div>
                                <div class="font-medium">Import Failed</div>
                                <div class="text-sm text-red-400/70">{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Upload Card */}
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

                        <form method="POST" encType="multipart/form-data" class="space-y-6">
                            <label htmlFor="dropzone-file" class="flex flex-col items-center justify-center w-full h-52 border-2 border-[#2d3348] border-dashed rounded-xl cursor-pointer bg-[#1a1d2e] hover:bg-[#1e2235] hover:border-emerald-500/30 transition-all">
                                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                                    <svg class="w-10 h-10 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p class="mb-2 text-sm text-gray-400">
                                        <span class="font-semibold text-emerald-400">Click to upload</span> or drag and drop
                                    </p>
                                    <p class="text-xs text-gray-600">CSV files only (Performance.csv)</p>
                                </div>
                                <input id="dropzone-file" name="file" type="file" class="hidden" accept=".csv" required />
                            </label>

                            <div class="flex justify-end">
                                <button
                                    type="submit"
                                    class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Import Trades
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Supported Brokers */}
                    <div class="mt-8 bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                        <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Supported Brokers</h3>
                        <div class="flex flex-wrap gap-3">
                            <span class="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium">
                                Tradovate
                            </span>
                            <span class="px-3 py-1.5 bg-[#1a1d2e] text-gray-600 border border-[#2d3348] rounded-lg text-sm">
                                NinjaTrader (Coming Soon)
                            </span>
                            <span class="px-3 py-1.5 bg-[#1a1d2e] text-gray-600 border border-[#2d3348] rounded-lg text-sm">
                                MetaTrader (Coming Soon)
                            </span>
                            <span class="px-3 py-1.5 bg-[#1a1d2e] text-gray-600 border border-[#2d3348] rounded-lg text-sm">
                                Interactive Brokers (Coming Soon)
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
