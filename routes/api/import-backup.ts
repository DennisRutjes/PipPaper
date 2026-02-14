import { Handlers } from "$fresh/server.ts";
import { storage } from "../../services/storage/StorageKV.ts";

export const handler: Handlers = {
    async POST(req) {
        try {
            const form = await req.formData();
            const file = form.get("file") as File;

            if (!file) {
                return new Response(JSON.stringify({ error: "No file uploaded" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            let jsonStr: string;

            // Check if gzipped
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
                return new Response(JSON.stringify({ error: "Invalid PipPaper export file" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                });
            }

            const { trades, notes, setups, tags } = exportData.data;
            let counts = { trades: 0, notes: 0, setups: 0, tags: 0 };

            // Import trades
            if (trades && Array.isArray(trades)) {
                for (const trade of trades) {
                    await storage.saveTrade(trade);
                    counts.trades++;
                }
            }

            // Import notes
            if (notes && Array.isArray(notes)) {
                for (const note of notes) {
                    await storage.saveNote(note);
                    counts.notes++;
                }
            }

            // Import setups
            if (setups && Array.isArray(setups)) {
                for (const setup of setups) {
                    await storage.saveSetup(setup);
                    counts.setups++;
                }
            }

            // Import tags
            if (tags && Array.isArray(tags)) {
                for (const tag of tags) {
                    await storage.saveTag(tag);
                    counts.tags++;
                }
            }

            return new Response(JSON.stringify({
                success: true,
                imported: counts,
                exportedAt: exportData.exportedAt,
            }), {
                headers: { "Content-Type": "application/json" },
            });
        } catch (e) {
            console.error("Import error:", e);
            return new Response(JSON.stringify({ error: (e as Error).message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },
};
