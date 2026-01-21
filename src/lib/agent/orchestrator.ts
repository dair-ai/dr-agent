/**
 * Research Pipeline Orchestrator
 *
 * Uses Claude Agent SDK query() function to coordinate the multi-agent research pipeline.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import { researchAgentConfig } from "./config";
import type { PipelineStage } from "@/types/research";

/**
 * Generate the current date/time in ISO format
 */
export const getCurrentDateTime = () => new Date().toISOString();

/**
 * Research prompt template with current date/time for the planner agent
 */
export const RESEARCH_PROMPT_TEMPLATE = (topic: string) => {
  const currentDateTime = getCurrentDateTime();

  return `Conduct deep research on the following topic and provide a comprehensive report:

**Research Topic:** ${topic}

**Current Date/Time:** ${currentDateTime}

Please use this date/time information to:
1. Set appropriate date ranges for searching (the planner agent should use this)
2. Prioritize recent vs historical sources based on the topic
3. Filter out outdated information when researching current events

Pipeline Instructions:
1. First, call the planner-agent to create an optimized search strategy with date ranges
2. Then, pass the search plan to web-search-agent to gather sources
3. Finally, pass sources to report-writer-agent for the final report

IMPORTANT: Announce each stage transition with "STAGE: [agent-name] - [description]"

Start the research pipeline now.`;
};

/**
 * Detect pipeline stage transitions from orchestrator's text output
 */
export function detectStageChange(text: string): { stage: PipelineStage; description: string } | null {
  const stagePatterns: { pattern: RegExp; stage: PipelineStage }[] = [
    { pattern: /STAGE:\s*planning\s*-?\s*(.+)?/i, stage: "planner" },
    { pattern: /STAGE:\s*planner\s*-?\s*(.+)?/i, stage: "planner" },
    { pattern: /STAGE:\s*searching\s*-?\s*(.+)?/i, stage: "web-search" },
    { pattern: /STAGE:\s*web-search\s*-?\s*(.+)?/i, stage: "web-search" },
    { pattern: /STAGE:\s*writing\s*-?\s*(.+)?/i, stage: "report-writer" },
    { pattern: /STAGE:\s*report-writer\s*-?\s*(.+)?/i, stage: "report-writer" }
  ];

  for (const { pattern, stage } of stagePatterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        stage,
        description: match[1]?.trim() || `Starting ${stage} stage`
      };
    }
  }

  return null;
}

/**
 * Run the research pipeline using Claude Agent SDK
 *
 * This is an async generator that yields Agent SDK messages.
 * Use this for local development (direct execution).
 */
export async function* runResearchPipeline(topic: string, sessionId?: string) {
  const prompt = RESEARCH_PROMPT_TEMPLATE(topic);

  for await (const message of query({
    prompt,
    options: {
      ...researchAgentConfig,
      resume: sessionId,
    }
  })) {
    yield message;
  }
}

/**
 * Extract text content from an Agent SDK message
 */
export function extractTextFromMessage(message: { type: string; message?: { content?: unknown[] } }): string {
  if (message.type !== "assistant" || !message.message?.content) {
    return "";
  }

  const content = message.message.content;
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter((block): block is { type: "text"; text: string } =>
      typeof block === "object" && block !== null && "type" in block && block.type === "text"
    )
    .map(block => block.text)
    .join("\n");
}

/**
 * Check if an Agent SDK message contains a subagent call
 */
export function getSubagentCall(message: { type: string; message?: { content?: unknown[] } }): { subagent_type: string; description: string } | null {
  if (message.type !== "assistant" || !message.message?.content) {
    return null;
  }

  const content = message.message.content;
  if (!Array.isArray(content)) {
    return null;
  }

  for (const block of content) {
    if (
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      block.type === "tool_use" &&
      "name" in block &&
      block.name === "Task" &&
      "input" in block
    ) {
      const input = block.input as { subagent_type?: string; description?: string };
      if (input.subagent_type) {
        return {
          subagent_type: input.subagent_type,
          description: input.description || `Running ${input.subagent_type}`
        };
      }
    }
  }

  return null;
}
