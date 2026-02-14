import { z } from "../deps.ts";

export const ConfigSchema = z.object({
    db: z.object({
        databaseURL: z.string().optional(),
    }),
});

export type Config = z.infer<typeof ConfigSchema>;