import { Handlers } from "$fresh/server.ts";
import { storage } from "../../services/storage/StorageKV.ts";

export const handler: Handlers = {
    async GET(_req) {
        try {
            const trades = await storage.getTrades();
            const notes = await storage.getNotes();
            const setups = await storage.getSetups();
            const tags = await storage.getTags();

            const exportData = {
                version: 1,
                exportedAt: new Date().toISOString(),
                app: "PipPaper",
                data: { trades, notes, setups, tags },
            };

            const jsonStr = JSON.stringify(exportData, null, 2);

            // Compress with gzip (Deno built-in)
            const encoder = new TextEncoder();
            const raw = encoder.encode(jsonStr);
            const cs = new CompressionStream("gzip");
            const writer = cs.writable.getWriter();
            writer.write(raw);
            writer.close();

            const chunks: Uint8Array[] = [];
            const reader = cs.readable.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }

            const totalLen = chunks.reduce((s, c) => s + c.length, 0);
            const compressed = new Uint8Array(totalLen);
            let offset = 0;
            for (const chunk of chunks) {
                compressed.set(chunk, offset);
                offset += chunk.length;
            }

            const date = new Date().toISOString().split("T")[0];
            const filename = `pippaper_export_${date}.json.gz`;

            return new Response(compressed, {
                headers: {
                    "Content-Type": "application/gzip",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        } catch (e) {
            console.error("Export error:", e);
            return new Response(JSON.stringify({ error: (e as Error).message }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    },
};
