#!/usr/bin/env node
/**
 * FestApp Rideshare MCP Server
 *
 * Exposes ride operations as tools for external AI assistants
 * (Claude Desktop, ChatGPT, etc.) via the Model Context Protocol.
 *
 * Uses stdio transport for local process communication.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools.js";

const server = new Server(
  {
    name: "festapp-rideshare",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

registerTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr -- stdout is reserved for MCP protocol messages
  console.error("FestApp Rideshare MCP server started (stdio transport)");
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
