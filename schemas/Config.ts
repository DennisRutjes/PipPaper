import { z } from "../deps.ts";

import EnvNames from "../constants/EnvNames.ts";

function getErrorMessage(environmentVariableName: EnvNames) {
  return {
    message: `Missing ${environmentVariableName} environment variable.`,
  };
}

export const ConfigSchema = z.object({
  db: z.object({
    databasePath: z.string().min(1, getErrorMessage(EnvNames.DB_PATH)),
  }),
});

export type Config = z.infer<typeof ConfigSchema>;
