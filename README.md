# mcpkit

> Easy setup for MCPs with Browserbase. Run browser automation anywhere with just an API key.

## What is mcpkit?

**mcpkit** is a CLI tool that automatically generates MCP servers for any website using AI-powered browser automation. It handles authentication discovery, context management, and server generation - making it easy to create MCP servers for any web application without manual coding.

## Quick Start

### Installation

```bash
npm install -g mcpkit
```

### Setup

Set up your Browserbase API key and secrets:
```bash
mcpkit secrets
```

### Create Your First MCP Server

```bash
# Create an MCP server for any website
mcpkit create https://linear.app

# Or use interactive mode
mcpkit create
```

## CLI Commands

### `mcpkit create <url>`
Generate an MCP server for a website with AI-powered discovery.

**Arguments:**
- `url` (optional): The website URL. If omitted, you'll be prompted interactively.

**Examples:**
```bash
mcpkit create https://linear.app
mcpkit create https://news.ycombinator.com
mcpkit create  # Interactive mode
```


Manage saved authentication contexts for websites.

**Actions:**
- `list`: Show all saved contexts
- `show <domain>`: Display details for a specific context
- `delete <domain>`: Remove a context

**Examples:**
```bash
mcpkit contexts list
mcpkit contexts show github.com
mcpkit contexts delete linear.app
mcpkit contexts create linear.app
```

### `mcpkit secrets`
Set up and manage secrets for authentication

**Examples:**
```bash
mcpkit secrets  # Interactive setup
```

### `mcpkit help`
Display help information and available commands.

### `mcpkit version`
Show the current version of mcpkit.

## Testing Generated MCP Servers

After running `mcpkit create`, test your generated server:

1. Navigate to the created folder:
```bash
cd mcp-stagehand-{domain}/
```

2. Install dependencies and build:
```bash
npm install && npm run build
```

3. Test with the MCP Inspector:
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

You should see a screen like this:

![Hacker News MCP Example](HNMCP.png)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

Within the repo, run:

```bash
npm install && npm run build && npm link
```

Now you can run a local instance of mcpkit for testing.

## License

MIT
