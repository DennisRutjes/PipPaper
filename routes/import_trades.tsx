import { Handlers, PageProps } from "$fresh/server.ts";
import { Importer } from "../services/import/ImporterService.ts";
import SideMenu from "../islands/SideMenu.tsx";
import Toast from "../islands/Toast.tsx";
import ImportForm from "../islands/ImportForm.tsx";

interface ImportData {
    count?: number;
    importedIds?: string[];
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
                if (req.headers.get("Accept") === "application/json") {
                    return new Response(JSON.stringify({ error: "No file uploaded" }), {
                        headers: { "Content-Type": "application/json" },
                        status: 400
                    });
                }
                return ctx.render({ error: "No file uploaded" });
            }

            const content = await file.text();
            const importedIds = await Importer.importTradovateTrades(content);

            if (req.headers.get("Accept") === "application/json") {
                return new Response(JSON.stringify({ count: importedIds.length, importedIds }), {
                    headers: { "Content-Type": "application/json" }
                });
            }

            return ctx.render({ count: importedIds.length, importedIds });
        } catch (e) {
            if (req.headers.get("Accept") === "application/json") {
                return new Response(JSON.stringify({ error: (e as Error).message }), {
                    headers: { "Content-Type": "application/json" },
                    status: 500
                });
            }
            return ctx.render({ error: (e as Error).message });
        }
    },
};

export default function ImportPage(props: PageProps<ImportData>) {
    const { count, importedIds, error } = props.data;

    return (
        <>
            <SideMenu active={"Import Trades"} />
            <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
                <Toast 
                    initialMessage={count !== undefined ? `Imported ${count} trades. Starting processing...` : error} 
                    initialType={count !== undefined ? "info" : error ? "error" : undefined} 
                />
                
                <div class="max-w-3xl mx-auto">
                    {/* Header */}
                    <div class="mb-8">
                        <h1 class="text-2xl font-bold text-white">Import Trades</h1>
                        <p class="text-sm text-gray-500 mt-1">Upload your broker exports to start tracking</p>
                    </div>

                    {/* AJAX Import Form (Handles Upload & Progress) */}
                    <ImportForm />

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
