import { Handlers, PageProps } from "$fresh/server.ts";
import SideMenu from "../islands/SideMenu.tsx";
import RichEditor from "../islands/RichEditor.tsx";
import { storage } from "../services/storage/StorageKV.ts";
import { Note } from "../services/storage/entities/Note.ts";

interface NotebookData {
    journalEntries: Note[];
    todayPlan: Note | null;
    todayDate: string;
    saved?: string; // "journal" | "plan"
}

export const handler: Handlers<NotebookData> = {
    async GET(_req, ctx) {
        const todayDate = new Date().toISOString().split("T")[0];
        const journalEntries = await storage.getJournalEntries();
        const todayPlan = await storage.getDailyPlan(todayDate);
        return ctx.render({ journalEntries, todayPlan, todayDate });
    },
    async POST(req, ctx) {
        const form = await req.formData();
        const action = form.get("action")?.toString();
        const todayDate = new Date().toISOString().split("T")[0];
        let saved: string | undefined;

        if (action === "save_plan") {
            const html = form.get("note")?.toString() || "";
            if (html.trim() && html.trim() !== "<p><br></p>") {
                await storage.saveDailyPlan(todayDate, html);
                saved = "plan";
            }
        }

        if (action === "save_journal") {
            const html = form.get("note")?.toString() || "";
            if (html.trim() && html.trim() !== "<p><br></p>") {
                await storage.saveJournalEntry(html);
                saved = "journal";
            }
        }

        const journalEntries = await storage.getJournalEntries();
        const todayPlan = await storage.getDailyPlan(todayDate);
        return ctx.render({ journalEntries, todayPlan, todayDate, saved });
    },
};

function formatNoteDate(epochSeconds?: number): string {
    if (!epochSeconds) return "Unknown date";
    const d = new Date(epochSeconds * 1000);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} at ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function NotebookPage(props: PageProps<NotebookData>) {
    const { journalEntries, todayPlan, todayDate, saved } = props.data;

    const formattedToday = new Date(todayDate + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    return (
        <>
            <SideMenu active={"Notebook"} />
            <div class="sm:ml-[240px] min-h-screen bg-[#0f1117] p-4 sm:p-6">
                <div class="max-w-4xl mx-auto">
                    <div class="mb-8">
                        <h1 class="text-2xl font-bold text-white">Notebook</h1>
                        <p class="text-sm text-gray-500 mt-1">Daily trade plan, observations, and lessons learned</p>
                    </div>

                    {/* Daily Trade Plan */}
                    <div class="mb-8">
                        <form method="POST">
                            <div class="bg-gradient-to-br from-[#1a1630] to-[#141622] rounded-xl border border-indigo-500/20 p-6">
                                <div class="flex items-center gap-3 mb-4">
                                    <div class="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                        <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 class="text-sm font-semibold text-indigo-300">Daily Trade Plan</h3>
                                        <p class="text-xs text-gray-500">{formattedToday}</p>
                                    </div>
                                </div>

                                {saved === "plan" && (
                                    <div class="mb-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">Plan saved!</div>
                                )}

                                <RichEditor
                                    initialContent={todayPlan?.NoteData || ""}
                                    placeholder="What setups am I looking for today? What's my max loss? Key levels to watch? Mental state check-in..."
                                />
                                <div class="mt-3 flex justify-end">
                                    <button type="submit" name="action" value="save_plan"
                                        class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                                        Save Plan
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* New Journal Entry */}
                    <div class="mb-8">
                        <form method="POST">
                            <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-6">
                                <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">New Journal Entry</h3>

                                {saved === "journal" && (
                                    <div class="mb-4 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs">Entry saved!</div>
                                )}

                                <RichEditor placeholder="What did you observe in the markets today? Any lessons learned? Notes for tomorrow..." />
                                <div class="mt-3 flex justify-end">
                                    <button type="submit" name="action" value="save_journal"
                                        class="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Save Entry
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Past Entries */}
                    <div class="space-y-4">
                        {journalEntries.length === 0 ? (
                            <div class="bg-[#141622] rounded-xl border border-[#1e2235] p-12 text-center">
                                <svg class="w-12 h-12 mx-auto text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <h3 class="text-lg font-medium text-gray-400 mb-1">No journal entries yet</h3>
                                <p class="text-sm text-gray-600">Start documenting your trading journey above.</p>
                            </div>
                        ) : (
                            <>
                                <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Past Entries ({journalEntries.length})</h3>
                                {journalEntries.map((note) => (
                                    <div key={note.NoteID} class="bg-[#141622] rounded-xl border border-[#1e2235] p-6 hover:border-[#2d3348] transition-colors">
                                        <div class="flex items-center justify-between mb-3">
                                            <span class="text-xs text-gray-500">{formatNoteDate(note.createdAt)}</span>
                                        </div>
                                        <div class="text-sm text-gray-300 leading-relaxed prose prose-invert prose-sm max-w-none"
                                            dangerouslySetInnerHTML={{ __html: note.NoteData }} />
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
