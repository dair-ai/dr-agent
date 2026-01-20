import Anthropic from '@anthropic-ai/sdk';
import { searchWeb, getContents } from './exa-client';
import { PLANNER_SUBAGENT, REPORT_WRITER_SUBAGENT } from './subagents';
import type { Source, SearchPlan, ResearchStage } from '@/types/research';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface OrchestratorCallbacks {
  onStageChange: (stage: ResearchStage, status: 'active' | 'completed' | 'error', message?: string) => void;
  onStatus: (message: string, stage: ResearchStage) => void;
  onSource: (source: Source) => void;
  onError: (error: string, stage?: ResearchStage) => void;
}

export interface OrchestratorResult {
  success: boolean;
  report?: string;
  sources: Source[];
  error?: string;
}

/**
 * Run the planning stage
 */
async function runPlanningStage(
  topic: string,
  callbacks: OrchestratorCallbacks
): Promise<SearchPlan | null> {
  callbacks.onStageChange('planning', 'active', 'Analyzing research topic');
  callbacks.onStatus('Creating search strategy...', 'planning');

  try {
    const response = await anthropic.messages.create({
      model: PLANNER_SUBAGENT.model,
      max_tokens: 2048,
      system: PLANNER_SUBAGENT.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Create a comprehensive search plan for researching this topic: "${topic}"

Output only the JSON search plan, no additional text.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from planner');
    }

    // Parse the JSON plan from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse search plan from response');
    }

    const plan: SearchPlan = JSON.parse(jsonMatch[0]);

    callbacks.onStatus(`Generated ${plan.queries.length} search queries`, 'planning');
    callbacks.onStageChange('planning', 'completed', `Search strategy ready with ${plan.queries.length} queries`);

    return plan;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Planning failed';
    callbacks.onStageChange('planning', 'error', errorMsg);
    callbacks.onError(errorMsg, 'planning');
    return null;
  }
}

/**
 * Run the web search stage
 */
async function runSearchStage(
  topic: string,
  plan: SearchPlan,
  callbacks: OrchestratorCallbacks
): Promise<{ sources: Source[]; contents: string[] } | null> {
  callbacks.onStageChange('searching', 'active', 'Starting web searches');

  const sources: Source[] = [];
  const contents: string[] = [];
  const seenUrls = new Set<string>();

  try {
    // Execute searches
    for (let i = 0; i < plan.queries.length; i++) {
      const query = plan.queries[i];
      const searchType = plan.searchTypes[i] || 'neural';

      callbacks.onStatus(`Searching: "${query}"`, 'searching');

      const searchResult = await searchWeb({
        query,
        type: searchType,
        numResults: 5,
        includeDomains: plan.domains,
        startPublishedDate: plan.dateRange?.startDate,
        endPublishedDate: plan.dateRange?.endDate,
      });

      if (searchResult.success && searchResult.results) {
        for (const result of searchResult.results) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            const source: Source = {
              id: result.id,
              title: result.title,
              url: result.url,
              publishedDate: result.publishedDate,
              author: result.author,
            };
            sources.push(source);
            callbacks.onSource(source);
          }
        }
      }
    }

    callbacks.onStatus(`Found ${sources.length} unique sources, fetching content...`, 'searching');

    // Fetch full content for top sources (limit to 8)
    const topSources = sources.slice(0, 8);
    const urls = topSources.map(s => s.url);

    if (urls.length > 0) {
      const contentResult = await getContents({
        urls,
        maxCharacters: 8000,
      });

      if (contentResult.success && contentResult.contents) {
        for (const content of contentResult.contents) {
          contents.push(`## ${content.title}\nURL: ${content.url}\n\n${content.text}`);

          // Update source with snippet
          const source = sources.find(s => s.url === content.url);
          if (source) {
            source.snippet = content.text.slice(0, 200) + '...';
          }
        }
      }
    }

    callbacks.onStatus(`Gathered content from ${contents.length} sources`, 'searching');
    callbacks.onStageChange('searching', 'completed', `Collected ${sources.length} sources`);

    return { sources, contents };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Search failed';
    callbacks.onStageChange('searching', 'error', errorMsg);
    callbacks.onError(errorMsg, 'searching');
    return null;
  }
}

/**
 * Run the report writing stage
 */
async function runWritingStage(
  topic: string,
  sources: Source[],
  contents: string[],
  callbacks: OrchestratorCallbacks
): Promise<string | null> {
  callbacks.onStageChange('writing', 'active', 'Synthesizing research findings');
  callbacks.onStatus('Generating comprehensive report...', 'writing');

  try {
    const sourcesContext = contents.join('\n\n---\n\n');
    const sourcesList = sources
      .map((s, i) => `[${i + 1}] ${s.title} - ${s.url}`)
      .join('\n');

    const response = await anthropic.messages.create({
      model: REPORT_WRITER_SUBAGENT.model,
      max_tokens: 4096,
      system: REPORT_WRITER_SUBAGENT.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Write a comprehensive research report on: "${topic}"

## Available Sources
${sourcesList}

## Source Content
${sourcesContext}

Generate a thorough, well-structured Markdown report synthesizing these findings.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from report writer');
    }

    callbacks.onStatus('Report generation complete', 'writing');
    callbacks.onStageChange('writing', 'completed', 'Report ready');

    return content.text;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Report writing failed';
    callbacks.onStageChange('writing', 'error', errorMsg);
    callbacks.onError(errorMsg, 'writing');
    return null;
  }
}

/**
 * Main orchestrator function that runs the full research pipeline
 */
export async function runResearchPipeline(
  topic: string,
  callbacks: OrchestratorCallbacks
): Promise<OrchestratorResult> {
  const allSources: Source[] = [];

  // Stage 1: Planning
  const plan = await runPlanningStage(topic, callbacks);
  if (!plan) {
    return { success: false, sources: [], error: 'Planning stage failed' };
  }

  // Stage 2: Web Search
  const searchResults = await runSearchStage(topic, plan, callbacks);
  if (!searchResults) {
    return { success: false, sources: allSources, error: 'Search stage failed' };
  }
  allSources.push(...searchResults.sources);

  // Stage 3: Report Writing
  const report = await runWritingStage(topic, searchResults.sources, searchResults.contents, callbacks);
  if (!report) {
    return { success: false, sources: allSources, error: 'Report writing stage failed' };
  }

  // Mark pipeline as completed
  callbacks.onStageChange('completed', 'completed', 'Research complete');

  return {
    success: true,
    report,
    sources: allSources,
  };
}
