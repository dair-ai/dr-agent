/**
 * Research Agent Configuration
 *
 * Configuration for the orchestrator using Claude Agent SDK.
 */

import { exaSearchTools } from "./tools";
import { SUBAGENTS, ORCHESTRATOR_SYSTEM_PROMPT } from "./subagents";

/**
 * Research agent configuration for the orchestrator
 */
export const researchAgentConfig = {
  model: "claude-haiku-4-5-20251001" as const,
  systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
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
  permissionMode: "bypassPermissions" as const
};

/**
 * Stage descriptions for UI display
 */
export const STAGE_DESCRIPTIONS = {
  orchestrator: 'Initializing research pipeline',
  planner: 'Analyzing topic and creating search strategy',
  'web-search': 'Executing web searches and gathering sources',
  'report-writer': 'Synthesizing findings into comprehensive report',
} as const;
