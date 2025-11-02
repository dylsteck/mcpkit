# MCP Server for news.ycombinator.com
  
  This MCP server provides browser automation tools for news.ycombinator.com using Stagehand.
  
  ## Available Tools
  
  1. **get_top_stories**: Retrieve the top stories displayed on the Hacker News homepage.
2. **navigate_to_section**: Navigate to a specific section of Hacker News (e.g., 'new', 'past', 'comments', 'ask', 'show', 'jobs').
3. **view_comments**: View the comments for a specific story.
4. **submit_new_story**: Submit a new story to Hacker News.
5. **search_stories**: Search Hacker News for stories or comments matching a specific query.
6. **view_user_profile**: View the profile of a specific user.
  
  ## Setup
  
  1. Install dependencies:
     ```bash
     npm install
     ```
  
  2. Create a `.env` file with your API keys:
     ```bash
     cp .env.example .env
     ```
  
  3. Add your API keys to the `.env` file:
     - Get a Browserbase API key from https://browserbase.com
     - Get a Gemini API key from https://ai.google.dev
  
  4. (Optional) Use saved browser context with authentication:
     - If you already authenticated to news.ycombinator.com using mcpkit, you can reuse that session:
     ```bash
     mcpkit contexts show news.ycombinator.com
     ```
     - Copy the context ID and add it to your `.env` file:
     ```
     BROWSERBASE_CONTEXT_ID=your_context_id_here
     ```
     - This will preserve your login session and cookies across runs!
  
  5. Build the project:
     ```bash
     npm run build
     ```
  
  ## Usage
  
  ### Running the server
  
  ```bash
  npm start
  ```
  
  When the server starts, it will output a live view URL that you can use to watch the browser automation in real-time:
  
  ```
  🔗 Live view: https://app.browserbase.com/sessions/[session-id]
  ```
  
  ### Development mode
  
  ```bash
  npm run dev
  ```
  
  ### Using with Claude Desktop
  
  Add this to your Claude Desktop config file:
  
  **MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
  **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
  
  ```json
  {
    "mcpServers": {
      "news_ycombinator_com": {
        "command": "node",
        "args": ["/Users/kevinoconnell/Desktop/mcpkit/mcp-stagehand-news_ycombinator_com/dist/index.js"],
        "env": {
          "BROWSERBASE_PROJECT_ID": "your_project_id",
          "BROWSERBASE_API_KEY": "your_api_key",
          "GEMINI_API_KEY": "your_gemini_key"
        }
      }
    }
  }
  ```
  
  ## License
  
  MIT
  