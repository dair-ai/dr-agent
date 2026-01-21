/**
 * Vercel Sandbox Runner for Research Agent
 *
 * Runs the Claude Agent SDK in an isolated container environment
 * to work around Vercel serverless limitations (no subprocess spawning).
 */

import { Sandbox } from "@vercel/sandbox";
import type { Source } from "@/types/research";

export interface SandboxMessage {
  type: "stdout" | "stderr" | "status" | "result" | "error";
  data: string;
  timestamp: number;
}

export interface SandboxCallbacks {
  onStageChange: (stage: string, status: "active" | "completed" | "error", message?: string) => void;
  onStatus: (message: string, stage: string) => void;
  onSource: (source: Source) => void;
  onError: (error: string, stage?: string) => void;
}

export interface SandboxResult {
  success: boolean;
  report?: string;
  sources: Source[];
  error?: string;
}

export interface RunResearchOptions {
  topic: string;
  sessionId?: string;
  anthropicApiKey: string;
  exaApiKey: string;
  onMessage?: (message: SandboxMessage) => void;
}

/**
 * The research script that runs inside the sandbox
 * Uses the Claude Agent SDK for multi-agent orchestration
 */
function getResearchScript(topic: string, exaApiKey: string, sessionId?: string): string {
  const escapedTopic = topic.replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/"/g, '\\"');
  const sessionIdArg = sessionId ? `"${sessionId}"` : "undefined";

  return `
const { query, createSdkMcpServer, tool } = require("@anthropic-ai/claude-agent-sdk");
const { z } = require("zod");
const Exa = require("exa-js").default;

// API key passed from parent environment
const EXA_API_KEY = "${exaApiKey}";

// Initialize Exa client (lazy singleton)
let exaClient = null;
const getExaClient = () => {
  if (exaClient) return exaClient;
  console.log("[Exa] Creating client...");
  exaClient = new Exa(EXA_API_KEY);
  return exaClient;
};

// Create Exa search tools using Agent SDK MCP server
const exaSearchTools = createSdkMcpServer({
  name: "exa-research",
  version: "1.0.0",
  tools: [
    tool(
      "search",
      "Search the web using neural or keyword search.",
      {
        query: z.string().describe("Search query"),
        type: z.enum(["neural", "keyword"]).default("neural").describe("Search type"),
        num_results: z.number().default(10).describe("Number of results"),
        start_published_date: z.string().optional().describe("Filter: published after (YYYY-MM-DD)"),
        end_published_date: z.string().optional().describe("Filter: published before (YYYY-MM-DD)")
      },
      async (args) => {
        console.log("[Exa] search:", args.query.substring(0, 50) + "...");
        try {
          const exa = getExaClient();
          const options = {
            type: args.type,
            numResults: args.num_results,
            useAutoprompt: true,
            contents: { text: { maxCharacters: 1500 } }
          };
          if (args.start_published_date) options.startPublishedDate = args.start_published_date;
          if (args.end_published_date) options.endPublishedDate = args.end_published_date;

          const results = await exa.searchAndContents(args.query, options);
          console.log("[Exa] search done:", results.results.length, "results");

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                query: args.query,
                total: results.results.length,
                results: results.results.map(r => ({
                  title: r.title || "Untitled",
                  url: r.url,
                  author: r.author || "Unknown",
                  published_date: r.publishedDate || "Unknown",
                  text: r.text || null
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error("[Exa] search FAILED:", error.message);
          return { content: [{ type: "text", text: JSON.stringify({ error: true, message: error.message }) }] };
        }
      }
    ),
    tool(
      "get_contents",
      "Get full content from URLs.",
      {
        urls: z.array(z.string()).describe("URLs to fetch"),
        max_characters: z.number().default(3000).describe("Max chars per doc")
      },
      async (args) => {
        console.log("[Exa] get_contents:", args.urls.length, "urls");
        try {
          const exa = getExaClient();
          const contents = await exa.getContents(args.urls, { text: { maxCharacters: args.max_characters } });
          console.log("[Exa] get_contents done:", contents.results.length, "docs");

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                documents: contents.results.map(doc => ({
                  url: doc.url,
                  title: doc.title || "Untitled",
                  author: doc.author || "Unknown",
                  text: doc.text || "No content"
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error("[Exa] get_contents FAILED:", error.message);
          return { content: [{ type: "text", text: JSON.stringify({ error: true, message: error.message }) }] };
        }
      }
    ),
    tool(
      "find_similar",
      "Find content similar to a given URL.",
      {
        url: z.string().describe("URL to find similar content for"),
        num_results: z.number().default(5).describe("Number of similar results"),
        exclude_source_domain: z.boolean().default(true).describe("Exclude results from same domain")
      },
      async (args) => {
        console.log("[Exa] find_similar:", args.url.substring(0, 50) + "...");
        try {
          const exa = getExaClient();
          const results = await exa.findSimilar(args.url, {
            numResults: args.num_results,
            excludeSourceDomain: args.exclude_source_domain
          });
          console.log("[Exa] find_similar done:", results.results.length, "results");

          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                source_url: args.url,
                similar: results.results.map(r => ({
                  title: r.title || "Untitled",
                  url: r.url,
                  author: r.author || "Unknown"
                }))
              }, null, 2)
            }]
          };
        } catch (error) {
          console.error("[Exa] find_similar FAILED:", error.message);
          return { content: [{ type: "text", text: JSON.stringify({ error: true, message: error.message }) }] };
        }
      }
    )
  ]
});

// Orchestrator system prompt
const ORCHESTRATOR_PROMPT = \`You are a Research Orchestrator that coordinates a multi-agent research pipeline.

## Your Pipeline
You have 3 specialized subagents to delegate to in sequence:

1. **planner-agent**: Creates optimized search queries and date ranges
2. **web-search-agent**: Gathers sources from the web (has Exa search tools)
3. **report-writer-agent**: Writes the final research report from gathered sources

## Workflow
For EVERY research request, follow this exact sequence:

### Step 1: Planning
Announce: "STAGE: planner - Creating optimized search strategy..."
Call planner-agent with topic and current date.

### Step 2: Web Search
Announce: "STAGE: web-search - Gathering sources from the web..."
Call web-search-agent with the search plan.

### Step 3: Report Writing
Announce: "STAGE: report-writer - Generating report..."
Call report-writer-agent with the gathered sources.

### Step 4: Output Report
OUTPUT THE COMPLETE REPORT EXACTLY AS RECEIVED FROM report-writer-agent.

## Critical Output Rules
- ALWAYS use all 3 agents in sequence and announce each STAGE
- **IMPORTANT: After report-writer completes, output the ENTIRE report verbatim**
- **DO NOT add commentary, summaries, or emojis after the report**
- **DO NOT say "Here's the report" or "Pipeline complete" - just output the report**
- The final output should be ONLY the markdown report from report-writer-agent\`;

// Subagent definitions
const SUBAGENTS = {
  "planner-agent": {
    description: "Creates search queries with date ranges for a research topic.",
    tools: [],
    prompt: \`You are a Research Planner. Create exactly 4 search queries for the given topic.

## Temporal Analysis
Pay attention to TEMPORAL INTENT in the query:
- Words like "latest", "recent", "current" indicate time-sensitive queries
- For "latest news" -> use last 30 days
- For "this year" -> use start of that year to today
- For historical topics -> use last 6 months as default

## Output Format
Return JSON only:
\\\`\\\`\\\`json
{
  "date_range": {
    "start_published_date": "YYYY-MM-DD",
    "end_published_date": "YYYY-MM-DD"
  },
  "search_queries": [
    {"query": "search query", "type": "neural", "num_results": 3}
  ]
}
\\\`\\\`\\\`

Generate exactly 4 queries with a mix of neural and keyword searches.\`,
    model: "haiku"
  },
  "web-search-agent": {
    description: "Executes search queries and gathers sources using Exa tools.",
    tools: ["mcp__exa-research__search", "mcp__exa-research__get_contents"],
    prompt: \`Execute the search plan provided. For each query, call the search tool with the date range.

After ALL searches complete, pick the 6-8 best URLs and call get_contents ONCE.

Return sources as a structured list:
- Title: [title]
- URL: [url]
- Published: [date]
- Content: [key content summary]

Be efficient. No lengthy explanations.\`,
    model: "haiku"
  },
  "report-writer-agent": {
    description: "Writes the final research report from gathered sources.",
    tools: [],
    prompt: \`You are a Research Report Writer. Create a comprehensive report with:

## Report Structure
# [Report Title]

## Executive Summary
2-3 paragraphs summarizing key findings.

## Introduction
Context and scope of the research.

## Key Findings
3-5 sections by theme. Cite sources inline as [Source N].

## Analysis
Deeper insights and implications.

## Limitations
Gaps in available information.

## Conclusion
Summary and next steps.

## Sources
[N] Title - URL

Target 1,500-2,500 words. Be objective and cite every claim.\`,
    model: "haiku"
  }
};

// Configuration for the orchestrator
const config = {
  model: "claude-haiku-4-5-20251001",
  systemPrompt: ORCHESTRATOR_PROMPT,
  mcpServers: {
    "exa-research": exaSearchTools
  },
  agents: SUBAGENTS,
  allowedTools: [
    "mcp__exa-research__search",
    "mcp__exa-research__get_contents",
    "mcp__exa-research__find_similar"
  ],
  disallowedTools: ["WebFetch", "WebSearch"],
  permissionMode: "bypassPermissions"
};

// Build the research prompt
const currentDateTime = new Date().toISOString();
const topic = "${escapedTopic}";
const prompt = \`Conduct deep research on the following topic and provide a comprehensive report:

**Research Topic:** \${topic}

**Current Date/Time:** \${currentDateTime}

Please use this date/time information to:
1. Set appropriate date ranges for searching (the planner agent should use this)
2. Prioritize recent vs historical sources based on the topic
3. Filter out outdated information when researching current events

Pipeline Instructions:
1. First, call the planner-agent to create an optimized search strategy with date ranges
2. Then, pass the search plan to web-search-agent to gather sources
3. Finally, pass sources to report-writer-agent for the final report

IMPORTANT: Announce each stage transition with "STAGE: [agent-name] - [description]"

Start the research pipeline now.\`;

async function runResearch() {
  try {
    for await (const message of query({
      prompt,
      options: {
        ...config,
        resume: ${sessionIdArg}
      }
    })) {
      // Output each message as JSON for parsing
      console.log("__RESEARCH_MSG__" + JSON.stringify(message));
    }
    console.log("__RESEARCH_DONE__");
  } catch (error) {
    console.error("__RESEARCH_ERROR__" + (error.message || String(error)));
    process.exit(1);
  }
}

runResearch();
`;
}

/**
 * Run research in a Vercel Sandbox
 * Returns an async generator that yields messages from the sandbox
 */
export async function* runResearchInSandbox(
  options: RunResearchOptions
): AsyncGenerator<SandboxMessage> {
  const { topic, sessionId, anthropicApiKey, exaApiKey, onMessage } = options;

  let sandbox: Sandbox | null = null;

  try {
    yield { type: "status", data: "Creating sandbox environment...", timestamp: Date.now() };

    // Validate sandbox credentials
    const token = process.env.VERCEL_TOKEN;
    if (!token) {
      throw new Error("VERCEL_TOKEN is required for sandbox execution");
    }
    if (!process.env.VERCEL_PROJECT_ID) {
      throw new Error("VERCEL_PROJECT_ID is required for sandbox execution");
    }

    // Create sandbox with Node.js runtime
    sandbox = await Sandbox.create({
      runtime: "node22",
      timeout: 300_000, // 5 minutes
      token,
      projectId: process.env.VERCEL_PROJECT_ID,
      teamId: process.env.VERCEL_TEAM_ID,
    });

    yield { type: "status", data: "Sandbox created, setting up project...", timestamp: Date.now() };

    // Working directory
    const workDir = "/vercel/sandbox";

    // Create package.json with Agent SDK dependencies
    const packageJson = JSON.stringify({
      name: "research-runner",
      version: "1.0.0",
      type: "commonjs",
      dependencies: {
        "@anthropic-ai/claude-agent-sdk": "latest",
        "exa-js": "latest",
        "zod": "latest"
      }
    }, null, 2);

    // Generate the research script
    const script = getResearchScript(topic, exaApiKey, sessionId);

    yield { type: "status", data: "Writing project files...", timestamp: Date.now() };

    try {
      await sandbox.writeFiles([
        { path: `${workDir}/package.json`, content: Buffer.from(packageJson, "utf-8") },
        { path: `${workDir}/index.js`, content: Buffer.from(script, "utf-8") }
      ]);
    } catch (writeError) {
      const writeErrMsg = writeError instanceof Error ? writeError.message : String(writeError);
      yield { type: "error", data: `Failed to write files: ${writeErrMsg}`, timestamp: Date.now() };
      return;
    }

    yield { type: "status", data: "Installing dependencies...", timestamp: Date.now() };

    // Install dependencies
    const installResult = await sandbox.runCommand({
      cmd: "npm",
      args: ["install", "--loglevel", "info"],
      cwd: workDir,
      signal: AbortSignal.timeout(120_000), // 2 minutes
    });

    const installStdout = await installResult.stdout();
    const installStderr = await installResult.stderr();

    if (installResult.exitCode !== 0) {
      yield { type: "error", data: `npm install failed (exit ${installResult.exitCode}): ${installStderr || installStdout}`, timestamp: Date.now() };
      return;
    }

    yield { type: "status", data: "Dependencies installed, starting research...", timestamp: Date.now() };

    // Run the research script
    const command = await sandbox.runCommand({
      cmd: "node",
      args: ["index.js"],
      cwd: workDir,
      env: {
        ANTHROPIC_API_KEY: anthropicApiKey,
        EXA_API_KEY: exaApiKey,
        PATH: "/vercel/runtimes/node22/bin:/usr/local/bin:/usr/bin:/bin",
      },
      detached: true,
    });

    // Process output line by line
    const processLine = (line: string) => {
      if (line.startsWith("__RESEARCH_MSG__")) {
        try {
          const json = line.substring("__RESEARCH_MSG__".length);
          const msg: SandboxMessage = {
            type: "result",
            data: json,
            timestamp: Date.now()
          };
          onMessage?.(msg);
        } catch {
          const msg: SandboxMessage = { type: "stdout", data: line, timestamp: Date.now() };
          onMessage?.(msg);
        }
      } else if (line.startsWith("__RESEARCH_DONE__")) {
        const msg: SandboxMessage = { type: "status", data: "Research complete", timestamp: Date.now() };
        onMessage?.(msg);
      } else if (line.startsWith("__RESEARCH_ERROR__")) {
        const error = line.substring("__RESEARCH_ERROR__".length);
        const msg: SandboxMessage = { type: "error", data: error, timestamp: Date.now() };
        onMessage?.(msg);
      } else if (line.trim()) {
        const msg: SandboxMessage = { type: "stdout", data: line, timestamp: Date.now() };
        onMessage?.(msg);
      }
    };

    // Wait for command to finish
    const finished = await command.wait();

    // Process stdout
    const stdout = await command.stdout();
    if (stdout) {
      const lines = stdout.split("\n");
      for (const line of lines) {
        if (line.trim()) {
          processLine(line);
        }
      }
    }

    // Process stderr if any
    const stderr = await command.stderr();
    if (stderr) {
      const stderrMsg: SandboxMessage = { type: "stderr", data: stderr, timestamp: Date.now() };
      onMessage?.(stderrMsg);
      if (finished.exitCode !== 0) {
        yield { type: "error", data: `Script stderr: ${stderr}`, timestamp: Date.now() };
      }
    }

    if (finished.exitCode !== 0) {
      const errorDetails = stderr || stdout || "No output captured";
      yield { type: "error", data: `Research script failed (exit ${finished.exitCode}): ${errorDetails}`, timestamp: Date.now() };
    }

    yield { type: "status", data: "Sandbox cleanup complete", timestamp: Date.now() };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    yield { type: "error", data: errorMessage, timestamp: Date.now() };
  } finally {
    // Clean up sandbox
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        // Ignore stop errors
      }
    }
  }
}
