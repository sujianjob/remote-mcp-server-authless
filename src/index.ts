import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { authenticate, createAuthErrorResponse } from "./auth.js";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);
	}
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		// 健康检查端点（无需鉴权）
		if (url.pathname === "/health") {
			return new Response(JSON.stringify({
				status: "ok",
				timestamp: new Date().toISOString(),
				service: "MCP Server with JWT Auth"
			}), {
				headers: {
					"Content-Type": "application/json"
				}
			});
		}

		// 对MCP端点进行鉴权
		if (url.pathname === "/sse" || url.pathname === "/sse/message" || url.pathname === "/mcp") {
			const authResult = await authenticate(request, env);

			if (!authResult.success) {
				console.log(`Authentication failed: ${authResult.error}`);
				return createAuthErrorResponse(authResult.error || "Authentication failed");
			}

			console.log(`Authentication successful for user: ${authResult.userId}`);

			// 在请求头中添加用户信息，供下游使用
			const modifiedRequest = new Request(request, {
				headers: {
					...Object.fromEntries(request.headers.entries()),
					'X-User-ID': authResult.userId || 'unknown'
				}
			});

			if (url.pathname === "/sse" || url.pathname === "/sse/message") {
				return MyMCP.serveSSE("/sse").fetch(modifiedRequest, env, ctx);
			}

			if (url.pathname === "/mcp") {
				return MyMCP.serve("/mcp").fetch(modifiedRequest, env, ctx);
			}
		}

		return new Response("Not found", { status: 404 });
	},
};
