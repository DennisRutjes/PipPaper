import { Handlers, PageProps } from "$fresh/server.ts";
import SideMenu from "../islands/SideMenu.tsx";
import { storage } from "../services/storage/StorageKV.ts";
import { Tag, TagCategory } from "../services/storage/entities/Tag.ts";

interface AIModel {
    name: string;
    displayName: string;
    description: string;
}

interface SettingsData {
    tags: Tag[];
    saved?: boolean;
    deleted?: boolean;
    activeTab?: string;
    importResult?: { trades: number; notes: number; setups: number; tags: number } | null;
    importError?: string;
    settings?: Record<string, string>;
    aiModels?: AIModel[];
}

const TAG_COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export const handler: Handlers<SettingsData> = {
    async GET(req, ctx) {
        const url = new URL(req.url);
        const activeTab = url.searchParams.get("tab") || "tags";
        const tags = await storage.getTags();
        const settings = await storage.getSettings();
        
        let aiModels: AIModel[] = [];
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        if (apiKey && apiKey !== "your_gemini_key_here") {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.models) {
                        aiModels = data.models
                            .filter((m: any) => {
                                const n = m.name.toLowerCase();
                                return (n.includes("gemini-1.5-pro") || n.includes("gemini-1.5-flash") || n.includes("gemini-1.0-pro") || n.includes("gemini-pro")) 
                                    && !n.includes("vision") // Exclude vision-only if any
                                    && m.supportedGenerationMethods?.includes("generateContent");
                            })
                            .map((m: any) => ({
                                name: m.name.replace("models/", ""),
                                displayName: m.displayName || m.name.replace("models/", ""),
                                description: m.description
                            }))
                            .sort((a: AIModel, b: AIModel) => b.name.localeCompare(a.name));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch AI models:", e);
            }
        }
        
        // Fallback if fetch fails
        if (aiModels.length === 0) {
            aiModels = [
                { name: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro", description: "Flagship model" },
                { name: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash", description: "Fast and cost-effective" },
                { name: "gemini-1.0-pro", displayName: "Gemini 1.0 Pro", description: "Standard model" }
            ];
        }

        return ctx.render({ tags, activeTab, settings, aiModels });
    },
    async POST(req, ctx) {
        const form = await req.formData();
        const action = form.get("action")?.toString();
        const activeTab = form.get("activeTab")?.toString() || "tags";

        let saved = false;
        let deleted = false;

        if (action === "save_general") {
            const aiModel = form.get("ai_model")?.toString();
            if (aiModel) {
                await storage.saveSetting("ai_model", aiModel);
                saved = true;
            }
        }

        if (action === "create_tag") {
            const name = form.get("name")?.toString() || "";
            const category = (form.get("category")?.toString() || "mistake") as TagCategory;
            const color = form.get("color")?.toString() || "#ef4444";

            if (name.trim()) {
                await storage.saveTag({
                    Name: name.trim(),
                    Category: category,
                    Color: color,
                });
                saved = true;
            }
        }

        if (action === "delete_tag") {
            const id = parseInt(form.get("tagId")?.toString() || "0");
            if (id) {
                await storage.deleteTag(id);
                deleted = true;
            }
        }

        // Re-fetch data for render
        const tags = await storage.getTags();
        const settings = await storage.getSettings();
        
        let aiModels: AIModel[] = [];
        const apiKey = Deno.env.get("GEMINI_API_KEY");
        if (apiKey && apiKey !== "your_gemini_key_here") {
            try {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.models) {
                        aiModels = data.models
                            .filter((m: any) => {
                                const n = m.name.toLowerCase();
                                return (n.includes("gemini-1.5-pro") || n.includes("gemini-1.5-flash") || n.includes("gemini-1.0-pro") || n.includes("gemini-pro")) 
                                    && !n.includes("vision") // Exclude vision-only if any
                                    && m.supportedGenerationMethods?.includes("generateContent");
                            })
                            .map((m: any) => ({
                                name: m.name.replace("models/", ""),
                                displayName: m.displayName || m.name.replace("models/", ""),
                                description: m.description
                            }))
                            .sort((a: AIModel, b: AIModel) => b.name.localeCompare(a.name));
                    }
                }
            } catch (e) {
                console.error("Failed to fetch AI models:", e);
            }
        }
        
        if (aiModels.length === 0) {
            aiModels = [
                { name: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro", description: "Flagship model" },
                { name: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash", description: "Fast and cost-effective" },
                { name: "gemini-1.0-pro", displayName: "Gemini 1.0 Pro", description: "Standard model" }
            ];
        }

        if (action === "import_backup") {
            const file = form.get("file") as File;
            if (file && file.size > 0) {
                try {
                    let jsonStr: string;
                    if (file.name.endsWith(".gz")) {
                        const buf = await file.arrayBuffer();
                        const ds = new DecompressionStream("gzip");
                        const writer = ds.writable.getWriter();
                        writer.write(new Uint8Array(buf));
                        writer.close();
                        const chunks: Uint8Array[] = [];
                        const reader = ds.readable.getReader();
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            chunks.push(value);
                        }
                        const totalLen = chunks.reduce((s, c) => s + c.length, 0);
                        const decompressed = new Uint8Array(totalLen);
                        let offset = 0;
                        for (const chunk of chunks) {
                            decompressed.set(chunk, offset);
                            offset += chunk.length;
                        }
                        jsonStr = new TextDecoder().decode(decompressed);
                    } else {
                        jsonStr = await file.text();
                    }

                    const exportData = JSON.parse(jsonStr);
                    if (!exportData.app || exportData.app !== "PipPaper") {
                        return ctx.render({ tags, activeTab: "general", importError: "Invalid PipPaper export file", settings, aiModels });
                    }

                    const { trades, notes, setups: importedSetups, tags: importedTags } = exportData.data;
                    const counts = { trades: 0, notes: 0, setups: 0, tags: 0 };
                    if (trades) for (const t of trades) { await storage.saveTrade(t); counts.trades++; }
                    if (notes) for (const n of notes) { await storage.saveNote(n); counts.notes++; }
                    if (importedSetups) for (const s of importedSetups) { await storage.saveSetup(s); counts.setups++; }
                    if (importedTags) for (const t of importedTags) { await storage.saveTag(t); counts.tags++; }

                    // Refresh tags after import
                    const newTags = await storage.getTags();
                    return ctx.render({ tags: newTags, activeTab: "general", importResult: counts, settings, aiModels });
                } catch (e) {
                    return ctx.render({ tags, activeTab: "general", importError: (e as Error).message, settings, aiModels });
                }
            }
        }

        return ctx.render({ tags, saved, deleted, activeTab, settings, aiModels });
    },
};

export default function SettingsPage(props: PageProps<SettingsData>) {
    const { tags, saved, deleted, activeTab, importResult, importError, settings, aiModels } = props.data;

    const mistakeTags = tags.filter(t => t.Category === "mistake");
    const setupTags = tags.filter(t => t.Category === "setup");
    const generalTags = tags.filter(t => t.Category === "general");

    const modelsList = aiModels || [
        { name: "gemini-1.5-pro", displayName: "Gemini 1.5 Pro", description: "Flagship model" },
        { name: "gemini-1.5-flash", displayName: "Gemini 1.5 Flash", description: "Fast and cost-effective" },
        { name: "gemini-1.0-pro", displayName: "Gemini 1.0 Pro", description: "Standard model" }
    ];

    const tabs = [
        { id: "tags", name: "Custom Tags" },
        { id: "general", name: "General" },
    ];

    return (
        <>
            <SideMenu active="Settings" />
            <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-8">
                        <h1 class="text-2xl font-bold text-white">Settings</h1>
                        <p class="text-sm text-gray-500 mt-1">Configure your trading journal preferences</p>
                    </div>

                    {/* Tabs */}
                    <div class="flex gap-1 mb-6 border-b border-[#1e2235]">
                        {tabs.map(tab => (
                            <a
                                key={tab.id}
                                href={`/settings?tab=${tab.id}`}
                                class={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
                                    activeTab === tab.id
                                        ? "text-emerald-400 border-emerald-400"
                                        : "text-gray-500 border-transparent hover:text-gray-300"
                                }`}
                            >
                                {tab.name}
                            </a>
                        ))}
                    </div>

                    {activeTab === "tags" && (
                        <div class="space-y-6">
                            {/* Create Tag Form */}
                            <form method="POST">
                                <input type="hidden" name="activeTab" value="tags" />
                                <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                    <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Add Custom Tag</h3>

                                    {saved && (
                                        <div class="mb-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
                                            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                            </svg>
                                            Tag created!
                                        </div>
                                    )}
                                    {deleted && (
                                        <div class="mb-4 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
                                            Tag deleted.
                                        </div>
                                    )}

                                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                                        <div>
                                            <label class="block text-xs font-medium text-gray-500 mb-1.5">Tag Name *</label>
                                            <input name="name" type="text" required placeholder='e.g. "FOMO", "Oversize"'
                                                class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none" />
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-gray-500 mb-1.5">Category</label>
                                            <select name="category"
                                                class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                                                <option value="mistake">Mistake</option>
                                                <option value="setup">Setup</option>
                                                <option value="general">General</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-xs font-medium text-gray-500 mb-1.5">Color</label>
                                            <div class="flex items-center gap-2 flex-wrap">
                                                {TAG_COLORS.map((c, i) => (
                                                    <label key={c} class="cursor-pointer">
                                                        <input type="radio" name="color" value={c} class="hidden peer" checked={i === 0} />
                                                        <div class="w-6 h-6 rounded-full border-2 border-transparent peer-checked:border-white transition-all" style={`background: ${c}`} />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex justify-end">
                                        <button type="submit" name="action" value="create_tag"
                                            class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add Tag
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {/* Tags by Category */}
                            {[
                                { title: "Mistake Tags", list: mistakeTags, description: "Tag trades with common mistakes for pattern analysis" },
                                { title: "Setup Tags", list: setupTags, description: "Custom setup labels (in addition to Playbook setups)" },
                                { title: "General Tags", list: generalTags, description: "General-purpose tags for organizing trades" },
                            ].map(section => (
                                <div key={section.title} class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                    <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">{section.title}</h3>
                                    <p class="text-xs text-gray-600 mb-4">{section.description}</p>

                                    {section.list.length === 0 ? (
                                        <p class="text-sm text-gray-600 italic">No tags in this category yet.</p>
                                    ) : (
                                        <div class="flex flex-wrap gap-2">
                                            {section.list.map(tag => (
                                                <div key={tag.TagID} class="group flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full font-medium border transition-colors"
                                                    style={`background: ${tag.Color}15; color: ${tag.Color}; border-color: ${tag.Color}40;`}>
                                                    {tag.Name}
                                                    <form method="POST" class="inline">
                                                        <input type="hidden" name="tagId" value={tag.TagID} />
                                                        <input type="hidden" name="activeTab" value="tags" />
                                                        <button type="submit" name="action" value="delete_tag"
                                                            class="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:text-red-400"
                                                            title="Delete tag">
                                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </form>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "general" && (
                        <div class="space-y-6">
                            {importResult && (
                                <div class="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center gap-3">
                                    <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                                    </svg>
                                    <div>
                                        <div class="font-medium">Backup Restored!</div>
                                        <div class="text-sm text-emerald-400/70">
                                            Imported {importResult.trades} trades, {importResult.notes} notes, {importResult.setups} setups, {importResult.tags} tags.
                                        </div>
                                    </div>
                                </div>
                            )}
                            {importError && (
                                <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-3">
                                    <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                                    </svg>
                                    <div>
                                        <div class="font-medium">Import Failed</div>
                                        <div class="text-sm text-red-400/70">{importError}</div>
                                    </div>
                                </div>
                            )}
                            {/* General Settings */}
                            <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Account Settings</h3>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-xs font-medium text-gray-500 mb-1.5">Account Currency</label>
                                        <select disabled class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm opacity-60">
                                            <option>USD ($)</option>
                                            <option>EUR</option>
                                            <option>GBP</option>
                                        </select>
                                        <p class="text-xs text-gray-600 mt-1">Currency settings coming soon.</p>
                                    </div>
                                    <div>
                                        <label class="block text-xs font-medium text-gray-500 mb-1.5">Timezone</label>
                                        <select disabled class="w-full bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm opacity-60">
                                            <option>Auto-detect (browser)</option>
                                        </select>
                                        <p class="text-xs text-gray-600 mt-1">Timezone settings coming soon.</p>
                                    </div>
                                </div>
                            </div>

                            {/* API Configuration Info */}
                            <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">AI Coach Configuration</h3>
                                
                                <form method="POST">
                                    <input type="hidden" name="action" value="save_general" />
                                    <input type="hidden" name="activeTab" value="general" />
                                    
                                    <div class="mb-4">
                                        <label class="block text-xs font-medium text-gray-500 mb-1.5">AI Model</label>
                                        <div class="flex gap-2">
                                            <select name="ai_model" class="flex-1 bg-[#1a1d2e] border border-[#2d3348] text-gray-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none">
                                                {modelsList.map(model => (
                                                    <option key={model.name} value={model.name} selected={settings?.ai_model === model.name || model.name === "gemini-1.5-pro"}>
                                                        {model.displayName}
                                                    </option>
                                                ))}
                                            </select>
                                            <button type="submit" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors">
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </form>

                                <p class="text-sm text-gray-400 mb-3">
                                    API keys are configured via the <code class="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded text-xs">.env</code> file in the project root.
                                </p>
                                <div class="bg-[#0f1117] rounded-lg p-4 font-mono text-xs text-gray-400">
                                    <div>LLM_PROVIDER=gemini</div>
                                    <div>GEMINI_API_KEY=your_api_key_here</div>
                                    <div># ANTHROPIC_API_KEY=your_api_key_here</div>
                                </div>
                            </div>

                            {/* Data Management — Export & Import */}
                            <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Data Management</h3>
                                <p class="text-sm text-gray-400 mb-4">
                                    Trade data is stored locally using Deno KV. Your data never leaves your machine.
                                </p>

                                <div class="flex items-center gap-3 mb-6">
                                    <span class="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                                        </svg>
                                        Local Storage Only
                                    </span>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Export */}
                                    <div class="bg-[#0f1117] rounded-lg p-5 border border-[#1e2235]">
                                        <div class="flex items-center gap-2 mb-3">
                                            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            <h4 class="text-sm font-semibold text-white">Export All Data</h4>
                                        </div>
                                        <p class="text-xs text-gray-500 mb-4">
                                            Download all trades, notes, setups, and tags as a compressed backup file (.json.gz).
                                        </p>
                                        <a href="/api/export"
                                            class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download Backup
                                        </a>
                                    </div>

                                    {/* Import */}
                                    <div class="bg-[#0f1117] rounded-lg p-5 border border-[#1e2235]">
                                        <div class="flex items-center gap-2 mb-3">
                                            <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                            <h4 class="text-sm font-semibold text-white">Restore from Backup</h4>
                                        </div>
                                        <p class="text-xs text-gray-500 mb-4">
                                            Upload a previously exported PipPaper backup file (.json.gz or .json) to restore data.
                                        </p>
                                        <form method="POST" action="/settings?tab=general&imported=1" encType="multipart/form-data" id="importBackupForm">
                                            <input type="hidden" name="action" value="import_backup" />
                                            <label class="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                Upload Backup
                                                <input type="file" name="file" accept=".json,.json.gz,.gz" class="hidden" />
                                            </label>
                                            <script dangerouslySetInnerHTML={{ __html: `
                                                document.querySelector('#importBackupForm input[type=file]').addEventListener('change', function() {
                                                    if (this.files.length) this.form.submit();
                                                });
                                            `}} />
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
