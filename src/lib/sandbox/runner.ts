/**
 * Vercel Sandbox Runner
 *
 * Executes the research pipeline in an isolated Vercel Sandbox container.
 * This is necessary for production deployment because Vercel serverless
 * functions cannot spawn subprocesses (which the Claude Agent SDK requires).
 */

import { Sandbox } from '@vercel/sandbox';
import type { ResearchStage, Source } from '@/types/research';

export interface SandboxCallbacks {
  onStageChange: (stage: ResearchStage, status: 'active' | 'completed' | 'error', message?: string) => void;
  onStatus: (message: string, stage: ResearchStage) => void;
  onSource: (source: Source) => void;
  onError: (error: string, stage?: ResearchStage) => void;
}

export interface SandboxResult {
  success: boolean;
  report?: string;
  sources: Source[];
  error?: string;
}

/**
 * Generate the research script that will run inside the sandbox
 */
function generateResearchScript(topic: string): string {
  // Escape the topic for safe embedding in JavaScript
  const escapedTopic = topic
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  return `
import Anthropic from '@anthropic-ai/sdk';
import Exa from 'exa-js';

// Output helper - prefix messages for parsing
const emit = (msg) => console.log('__MSG__' + JSON.stringify(msg));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const getExaClient = () => new Exa(process.env.EXA_API_KEY);

// Subagent prompts
const PLANNER_PROMPT = \`You are a research planning specialist. Your job is to analyze a research topic and create an optimal search strategy.

IMPORTANT: Pay close attention to TEMPORAL INTENT in the query:
- Words like "latest", "recent", "current", "today", "this week", "this month", "2024", "2025" indicate time-sensitive queries
- For "latest news" or "recent developments" → use last 30 days
- For "this year" or current year mentions → use start of that year to today
- For historical or conceptual topics (no time indicators) → set isTimeSensitive to false

Given a research topic, you will:
1. Analyze the key concepts and determine if the query is time-sensitive
2. Generate 3-5 diverse search queries that cover different angles
3. Recommend search types (neural for conceptual understanding, keyword for specific terms)
4. If time-sensitive, calculate appropriate date ranges relative to TODAY'S DATE (provided below)

Output your plan as a JSON object with this structure:
{
  "queries": ["query1", "query2", ...],
  "searchTypes": ["neural", "keyword", ...],
  "isTimeSensitive": true/false,
  "dateRange": { "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" } or null if not time-sensitive,
  "rationale": "Brief explanation including why dates were chosen"
}

IMPORTANT:
- Do NOT include "domains" field - let the search engine find the best sources
- For time-sensitive queries, ALWAYS set appropriate dateRange relative to today's date
- For evergreen/conceptual topics, set isTimeSensitive to false and dateRange to null\`;

const WRITER_PROMPT = \`You are a research report writer. Your job is to synthesize research findings into a comprehensive, well-structured report.

Your output should be a well-formatted Markdown report with:

## Structure
1. **Executive Summary** - 2-3 paragraph overview of key findings
2. **Introduction** - Context and scope of the research
3. **Key Findings** - Main sections organized by theme (use ### for subsections)
4. **Analysis** - Deeper insights, connections between sources, implications
5. **Limitations** - Gaps in available information, areas needing more research
6. **Conclusion** - Summary and potential next steps
7. **Sources** - Numbered list of all sources used

## Guidelines
- Be objective and balanced
- Cite sources inline using [Source N] notation
- Use bullet points for lists of related items
- Include relevant quotes when they add value (keep them brief)
- Highlight areas of consensus and disagreement
- Note the recency and authority of sources
- Write for an informed but not expert audience

The report should be thorough (1500-2500 words) but focused on the most valuable insights.\`;

// Search helper
async function searchWeb(query, type = 'neural', numResults = 10, startDate, endDate) {
  const exa = getExaClient();
  try {
    const results = await exa.search(query, {
      type,
      numResults,
      startPublishedDate: startDate,
      endPublishedDate: endDate,
      useAutoprompt: type === 'neural',
    });
    return { success: true, results: results.results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get contents helper
async function getContents(urls, maxChars = 8000) {
  const exa = getExaClient();
  try {
    const results = await exa.getContents(urls, { text: { maxCharacters: maxChars } });
    return { success: true, contents: results.results };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  const topic = \`${escapedTopic}\`;
  const sources = [];
  const contents = [];
  const seenUrls = new Set();

  // Stage 1: Planning
  emit({ type: 'stage_change', data: { stage: 'planning', status: 'active', message: 'Analyzing research topic' } });
  emit({ type: 'status', data: { message: 'Creating search strategy...', stage: 'planning' } });

  const today = new Date().toISOString().split('T')[0];
  const planResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: PLANNER_PROMPT,
    messages: [{
      role: 'user',
      content: \`TODAY'S DATE: \${today}\\n\\nCreate a comprehensive search plan for researching this topic: "\${topic}"\\n\\nOutput only the JSON search plan, no additional text.\`
    }]
  });

  const planText = planResponse.content[0].text;
  const jsonMatch = planText.match(/\\{[\\s\\S]*\\}/);
  if (!jsonMatch) {
    emit({ type: 'error', data: { message: 'Could not parse search plan', stage: 'planning' } });
    process.exit(1);
  }

  const plan = JSON.parse(jsonMatch[0]);
  emit({ type: 'status', data: { message: \`Generated \${plan.queries.length} search queries\`, stage: 'planning' } });
  emit({ type: 'stage_change', data: { stage: 'planning', status: 'completed', message: \`Search strategy ready with \${plan.queries.length} queries\` } });

  // Stage 2: Searching
  emit({ type: 'stage_change', data: { stage: 'searching', status: 'active', message: 'Starting web searches' } });

  for (let i = 0; i < plan.queries.length; i++) {
    const query = plan.queries[i];
    const searchType = plan.searchTypes[i] || 'neural';
    emit({ type: 'status', data: { message: \`Searching: "\${query}"\`, stage: 'searching' } });

    const searchResult = await searchWeb(
      query,
      searchType,
      10,
      plan.dateRange?.startDate,
      plan.dateRange?.endDate
    );

    if (searchResult.success && searchResult.results) {
      for (const result of searchResult.results) {
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          const source = {
            id: result.id,
            title: result.title || 'Untitled',
            url: result.url,
            publishedDate: result.publishedDate,
            author: result.author,
          };
          sources.push(source);
          emit({ type: 'source', data: { source } });
        }
      }
    }
  }

  emit({ type: 'status', data: { message: \`Found \${sources.length} unique sources, fetching content...\`, stage: 'searching' } });

  // Fetch content for top sources
  const topUrls = sources.slice(0, 8).map(s => s.url);
  if (topUrls.length > 0) {
    const contentResult = await getContents(topUrls, 8000);
    if (contentResult.success && contentResult.contents) {
      for (const content of contentResult.contents) {
        contents.push(\`## \${content.title}\\nURL: \${content.url}\\n\\n\${content.text}\`);
        const source = sources.find(s => s.url === content.url);
        if (source) {
          source.snippet = content.text.slice(0, 200) + '...';
        }
      }
    }
  }

  emit({ type: 'status', data: { message: \`Gathered content from \${contents.length} sources\`, stage: 'searching' } });
  emit({ type: 'stage_change', data: { stage: 'searching', status: 'completed', message: \`Collected \${sources.length} sources\` } });

  // Stage 3: Writing
  emit({ type: 'stage_change', data: { stage: 'writing', status: 'active', message: 'Synthesizing research findings' } });
  emit({ type: 'status', data: { message: 'Generating comprehensive report...', stage: 'writing' } });

  const sourcesContext = contents.join('\\n\\n---\\n\\n');
  const sourcesList = sources.map((s, i) => \`[\${i + 1}] \${s.title} - \${s.url}\`).join('\\n');

  const writeResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    system: WRITER_PROMPT,
    messages: [{
      role: 'user',
      content: \`Write a comprehensive research report on: "\${topic}"\\n\\n## Available Sources\\n\${sourcesList}\\n\\n## Source Content\\n\${sourcesContext}\\n\\nGenerate a thorough, well-structured Markdown report synthesizing these findings.\`
    }]
  });

  const report = writeResponse.content[0].text;

  emit({ type: 'status', data: { message: 'Report generation complete', stage: 'writing' } });
  emit({ type: 'stage_change', data: { stage: 'writing', status: 'completed', message: 'Report ready' } });
  emit({ type: 'stage_change', data: { stage: 'completed', status: 'completed', message: 'Research complete' } });

  // Final result
  emit({ type: 'result', data: { report, sources } });
}

main().catch(err => {
  emit({ type: 'error', data: { message: err.message } });
  process.exit(1);
});
`;
}

/**
 * Run the research pipeline in a Vercel Sandbox container
 */
export async function runResearchInSandbox(
  topic: string,
  callbacks: SandboxCallbacks
): Promise<SandboxResult> {
  // Validate sandbox credentials
  if (!process.env.VERCEL_TOKEN) {
    throw new Error('VERCEL_TOKEN is required for sandbox execution');
  }
  if (!process.env.VERCEL_PROJECT_ID) {
    throw new Error('VERCEL_PROJECT_ID is required for sandbox execution');
  }

  const sandbox = await Sandbox.create({
    runtime: 'node22',
    timeout: 300_000, // 5 minutes
    token: process.env.VERCEL_TOKEN,
    projectId: process.env.VERCEL_PROJECT_ID,
    teamId: process.env.VERCEL_TEAM_ID, // Optional, for team projects
  });

  const allSources: Source[] = [];

  try {
    // 1. Write package.json and the research script
    const packageJson = JSON.stringify({
      name: 'research-agent',
      type: 'module',
      dependencies: {
        '@anthropic-ai/sdk': '^0.39.0',
        'exa-js': '^2.0.11',
      }
    }, null, 2);

    const script = generateResearchScript(topic);

    await sandbox.writeFiles([
      { path: 'package.json', content: Buffer.from(packageJson, 'utf-8') },
      { path: 'index.js', content: Buffer.from(script, 'utf-8') },
    ]);

    // 3. Install dependencies
    await sandbox.runCommand({
      cmd: 'npm',
      args: ['install'],
      cwd: '/vercel/sandbox',
    });

    // 4. Execute the research script
    const result = await sandbox.runCommand({
      cmd: 'node',
      args: ['index.js'],
      cwd: '/vercel/sandbox',
      env: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
        EXA_API_KEY: process.env.EXA_API_KEY!,
      },
    });

    // 5. Get output and parse messages
    const stdout = await result.output('stdout');
    const stderr = await result.output('stderr');

    let finalReport: string | undefined;
    const lines = stdout.split('\n');

    for (const line of lines) {
      if (line.startsWith('__MSG__')) {
        try {
          const json = line.replace('__MSG__', '');
          const message = JSON.parse(json);

          switch (message.type) {
            case 'stage_change':
              callbacks.onStageChange(
                message.data.stage,
                message.data.status,
                message.data.message
              );
              break;
            case 'status':
              callbacks.onStatus(message.data.message, message.data.stage);
              break;
            case 'source':
              allSources.push(message.data.source);
              callbacks.onSource(message.data.source);
              break;
            case 'error':
              callbacks.onError(message.data.message, message.data.stage);
              break;
            case 'result':
              finalReport = message.data.report;
              if (message.data.sources) {
                // Update sources with any additional data from result
                for (const source of message.data.sources) {
                  const existing = allSources.find(s => s.id === source.id);
                  if (existing && source.snippet) {
                    existing.snippet = source.snippet;
                  }
                }
              }
              break;
          }
        } catch {
          // Skip malformed messages
        }
      }
    }

    // Check for errors in stderr
    if (stderr && stderr.trim()) {
      console.error('[Sandbox stderr]:', stderr);
    }

    if (result.exitCode !== 0) {
      return {
        success: false,
        sources: allSources,
        error: `Sandbox execution failed with exit code ${result.exitCode}`,
      };
    }

    return {
      success: true,
      report: finalReport,
      sources: allSources,
    };
  } finally {
    await sandbox.stop();
  }
}
