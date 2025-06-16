# Building a Remote MCP Server on Cloudflare (With Authentication)

This example allows you to deploy a remote MCP server with authentication support on Cloudflare Workers. The server supports multiple authentication methods including API Keys and JWT tokens.

## Get started: 

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-authless)

This will deploy your MCP server to a URL like: `remote-mcp-server-authless.<your-account>.workers.dev/sse`

Alternatively, you can use the command line below to get the remote MCP Server created on your local machine:
```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
```

## 🔐 Authentication Configuration

This MCP server supports multiple authentication methods to secure your endpoints:

### 1. API Key Authentication

Set up API keys using environment variables:

```bash
# Set API keys (comma-separated for multiple keys)
wrangler secret put API_KEYS
# Enter: your-api-key-1,your-api-key-2
```

### 2. JWT Token Authentication

Configure JWT secret for token validation:

```bash
# Set JWT secret
wrangler secret put JWT_SECRET
# Enter: your-super-secure-jwt-secret
```

### 3. CORS Configuration

Configure allowed origins:

```bash
# Set allowed origins (comma-separated)
wrangler secret put ALLOWED_ORIGINS
# Enter: https://playground.ai.cloudflare.com,http://localhost:3000
```

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_KEYS` | Comma-separated list of valid API keys | `key1,key2,key3` |
| `JWT_SECRET` | Secret key for JWT token validation | `your-jwt-secret` |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins | `https://example.com,http://localhost:3000` |

### Authentication Methods

#### Using API Key

Include the API key in your requests using one of these methods:

1. **X-API-Key Header:**
```bash
curl -H "X-API-Key: your-api-key" https://your-worker.workers.dev/sse
```

2. **Authorization Header:**
```bash
curl -H "Authorization: ApiKey your-api-key" https://your-worker.workers.dev/sse
```

#### Using JWT Token

Include the JWT token in the Authorization header:

```bash
curl -H "Authorization: Bearer your-jwt-token" https://your-worker.workers.dev/sse
```

### Generating API Keys

You can use the included utility functions to generate secure API keys:

```typescript
import { generateApiKey } from './src/auth-utils.js';

// Generate a 32-character API key
const apiKey = generateApiKey(32);
console.log('Generated API Key:', apiKey);
```

### Generating JWT Tokens

For JWT tokens, you can use the utility functions:

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
3. **Important:** If you have authentication enabled, you'll need to include authentication headers:
   - For API Key: Add header `X-API-Key: your-api-key`
   - For JWT: Add header `Authorization: Bearer your-jwt-token`
4. You can now use your MCP tools directly from the playground!

## Health Check Endpoint

The server includes a health check endpoint that doesn't require authentication:

```bash
curl https://your-worker.workers.dev/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "MCP Server with Auth"
}
```

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote).

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

### Without Authentication

```json
{
  "mcpServers": {
    "calculator": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"  // or remote-mcp-server-authless.your-account.workers.dev/sse
      ]
    }
  }
}
```

### With API Key Authentication

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
        "MCP_REMOTE_HEADERS": "{\"X-API-Key\": \"your-api-key\"}"
      }
    }
  }
}
```

### With JWT Authentication

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
   API_KEYS=test-key-1,test-key-2
   JWT_SECRET=your-local-jwt-secret
   ALLOWED_ORIGINS=http://localhost:3000,https://playground.ai.cloudflare.com
   ```
4. Start development server: `npm run dev`

### Testing Authentication

Test the health endpoint (no auth required):
```bash
curl http://localhost:8787/health
```

Test with API key:
```bash
curl -H "X-API-Key: test-key-1" http://localhost:8787/sse
```

Test with invalid API key (should return 401):
```bash
curl -H "X-API-Key: invalid-key" http://localhost:8787/sse
```

### Security Best Practices

1. **Use Strong API Keys**: Generate cryptographically secure API keys with sufficient length (32+ characters)
2. **Rotate Keys Regularly**: Implement a key rotation strategy for production environments
3. **Use HTTPS**: Always use HTTPS in production to protect authentication tokens in transit
4. **Limit CORS Origins**: Configure `ALLOWED_ORIGINS` to only include trusted domains
5. **Monitor Access**: Review logs regularly for suspicious authentication attempts
6. **Environment Separation**: Use different keys for development, staging, and production environments

### Troubleshooting

**Authentication Failed Errors:**
- Verify your API key or JWT token is correct
- Check that the authentication header is properly formatted
- Ensure the origin is in the `ALLOWED_ORIGINS` list
- Check the server logs for detailed error messages

**CORS Errors:**
- Add your domain to the `ALLOWED_ORIGINS` environment variable
- Ensure you're including the protocol (http/https) in the origin configuration
