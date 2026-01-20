/**
 * Orchestrator configuration for the research pipeline
 */

export const ORCHESTRATOR_CONFIG = {
  model: 'claude-sonnet-4-5-20250514' as const,
  maxTokens: 4096,
};

export const ORCHESTRATOR_SYSTEM_PROMPT = `You are a research orchestrator coordinating a 3-stage deep research pipeline:

## Pipeline Stages
1. **Planning** - Analyze topic, create search strategy
2. **Searching** - Execute searches, gather sources
3. **Writing** - Synthesize findings into report

## Your Role
- Coordinate the pipeline flow
- Pass appropriate context between stages
- Handle errors gracefully
- Ensure quality output at each stage

You do not perform the research directly. You coordinate specialized subagents.`;

export const STAGE_DESCRIPTIONS = {
  planning: 'Analyzing topic and creating search strategy',
  searching: 'Executing web searches and gathering sources',
  writing: 'Synthesizing findings into comprehensive report',
  completed: 'Research complete',
} as const;

export const ACADEMIC_DOMAINS = [
  'arxiv.org',
  'papers.google.com',
  'scholar.google.com',
  'semanticscholar.org',
  'pubmed.ncbi.nlm.nih.gov',
  'nature.com',
  'sciencedirect.com',
  'ieee.org',
  'acm.org',
];

export const TECH_DOMAINS = [
  'github.com',
  'huggingface.co',
  'openai.com',
  'anthropic.com',
  'deepmind.com',
  'pytorch.org',
  'tensorflow.org',
  'medium.com',
  'towardsdatascience.com',
];

export const NEWS_DOMAINS = [
  'techcrunch.com',
  'wired.com',
  'theverge.com',
  'arstechnica.com',
  'venturebeat.com',
  'thenewstack.io',
];
