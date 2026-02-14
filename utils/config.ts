import { Config, ConfigSchema } from "../schemas/Config.ts";

const envConfig: Config = {
  db: {
    databaseURL: Deno.env.get("DATABASE_URL"),
  },
};

const config = ConfigSchema.parse(envConfig);

export default config;