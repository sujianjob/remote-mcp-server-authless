# Building a Remote MCP Server on Cloudflare (With JWT Authentication)

This example allows you to deploy a remote MCP server with JWT Bearer Token authentication on Cloudflare Workers. The server uses a simplified authentication mechanism for better maintainability.

## Get started: 

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

This will deploy your MCP server to a URL like: `remote-mcp-server-authless.<your-account>.workers.dev/sse`

Alternatively, you can use the command line below to get the remote MCP Server created on your local machine:
```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

## 🔐 JWT Authentication Configuration

This MCP server uses a simplified JWT Bearer Token authentication mechanism for better security and maintainability.

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT token validation | `your-super-secure-jwt-secret` |

### Setting up Authentication

Configure JWT secret for token validation:

```bash
# Set JWT secret
wrangler secret put JWT_SECRET
# Enter: your-super-secure-jwt-secret
```

### Authentication Method

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer your-jwt-token" https://your-worker.workers.dev/sse
```

### Generating JWT Tokens

Use the included utility to generate JWT tokens:

```bash
# Generate a JWT token
npm run generate-jwt
```

Or programmatically:

```typescript
import { generateJWT } from './src/auth-utils.js';

const payload = {
  userId: 'user123',
  username: 'john_doe',
  roles: ['user']
};

const token = await generateJWT(payload, 'your-jwt-secret', 3600); // 1 hour expiry
console.log('Generated JWT:', token);
```

## Customizing your MCP Server

To add your own [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/) to the MCP server, define each tool inside the `init()` method of `src/index.ts` using `this.server.tool(...)`. 

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground, which is a remote MCP client:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL (`remote-mcp-server-authless.<your-account>.workers.dev/sse`)
3. **Important:** Add authentication header: `Authorization: Bearer your-jwt-token`
4. You can now use your MCP tools directly from the playground!

## Health Check Endpoint

The server includes a health check endpoint that doesn't require authentication:

```bash
curl https://mcp.123648.xyz/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "MCP Server with JWT Auth"
}
```

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote).

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

### Without Authentication (Development)

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"
      ]
    }
  }
}
```

### With JWT Authentication (Production)

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://remote-mcp-server-authless.your-account.workers.dev/sse"
      ],
      "env": {
        "MCP_REMOTE_HEADERS": "{\"Authorization\": \"Bearer your-jwt-token\"}"
      }
    }
  }
}
```

Restart Claude and you should see the tools become available.

## 🔧 Development and Testing

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.dev.vars` file:
   ```
   JWT_SECRET=your-local-jwt-secret
   ```
4. Start development server: `npm run dev`

### Testing Authentication

Test the health endpoint (no auth required):
```bash
curl http://localhost:8787/health
```

Test with JWT token:
```bash
curl -H "Authorization: Bearer your-jwt-token" http://localhost:8787/sse
```

Test with invalid JWT token (should return 401):
```bash
curl -H "Authorization: Bearer invalid-token" http://localhost:8787/sse
```

### Security Best Practices

1. **Use Strong JWT Secrets**: Generate cryptographically secure JWT secrets with sufficient length (64+ characters)
2. **Rotate Secrets Regularly**: Implement a secret rotation strategy for production environments
3. **Use HTTPS**: Always use HTTPS in production to protect authentication tokens in transit
4. **Monitor Access**: Review logs regularly for suspicious authentication attempts
5. **Environment Separation**: Use different secrets for development, staging, and production environments
6. **Token Expiry**: Set appropriate expiration times for JWT tokens

### Troubleshooting

**Authentication Failed Errors:**
- Verify your JWT token is correct and not expired
- Check that the Authorization header is properly formatted (`Authorization: Bearer <token>`)
- Ensure the JWT_SECRET environment variable is correctly set
- Check the server logs for detailed error messages

**Token Issues:**
- Generate a new JWT token using `npm run generate-jwt`
- Verify the token payload contains the required fields
- Check token expiration time
