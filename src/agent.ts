import { query, type Options, type McpServerConfig } from "@anthropic-ai/claude-agent-sdk";

export const MCP_CONFIG: McpServerConfig = {
  type: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-fetch"],
};

export const ALLOWED_TOOLS = [
  "mcp__mcp__fetch"
];

export const SYSTEM_PROMPT = `You are a recipe finding assistant that helps users discover recipes from AllRecipes. When a user asks for a recipe, search AllRecipes for relevant results and present them in a clear, organized way. Include key details like ingredients, cooking time, and instructions when available. You can help users find recipes by ingredient, dish type, cuisine, or dietary restrictions. Always provide the source URL so users can view the full recipe on AllRecipes.`;

export function getOptions(standalone = false): Options {
  return {
    systemPrompt: SYSTEM_PROMPT,
    model: "haiku",
    allowedTools: ALLOWED_TOOLS,
    maxTurns: 50,
    ...(standalone && { mcpServers: { mcp: MCP_CONFIG } }),
  };
}

export async function* streamAgent(prompt: string) {
  for await (const msg of query({ prompt, options: getOptions(true) })) {
    if (msg.type === "assistant") {
      for (const b of (msg as any).message?.content || []) {
        if (b.type === "text") yield { type: "text", text: b.text };
        if (b.type === "tool_use") yield { type: "tool", name: b.name };
      }
    }
    if ((msg as any).message?.usage) {
      const u = (msg as any).message.usage;
      yield { type: "usage", input: u.input_tokens || 0, output: u.output_tokens || 0 };
    }
    if ("result" in msg) yield { type: "result", text: msg.result };
  }
  yield { type: "done" };
}
