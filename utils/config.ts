import EnvNames from "../constants/EnvNames.ts";
import { Config, ConfigSchema } from "../schemas/Config.ts";

const envConfig: Config = {
  db: {
   // databasePath: Deno.env.get(EnvNames.DB_PATH) || "",
    databaseURL: Deno.env.get(EnvNames.DATABASE_URL) || "",
  },
};

const config = ConfigSchema.parse(envConfig);

export default config;
