import { Handlers } from "$fresh/server.ts";
import { handleMcpHttp } from "../services/mcp_server.ts";

export const handler: Handlers = {
  async POST(req) {
    return await handleMcpHttp(req);
  },
  async GET() {
    return new Response("Use POST", { status: 405 });
  },
};
