/**
 * Research Pipeline Types
 *
 * Types for the multi-agent research pipeline using Claude Agent SDK.
 */

/**
 * Pipeline stages matching subagent names
 */
export type PipelineStage = "orchestrator" | "planner" | "web-search" | "report-writer";

/**
 * Legacy research stage type for backwards compatibility
 */
export type ResearchStage = 'planning' | 'searching' | 'writing' | 'completed';

/**
 * Stage progress tracking
 */
export interface StageProgress {
  stage: ResearchStage | PipelineStage;
  status: 'pending' | 'active' | 'completed' | 'error';
  startedAt?: number;
  completedAt?: number;
  message?: string;
}

/**
 * Research source from web search
 */
export interface Source {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  snippet?: string;
}

/**
 * Research session state
 */
export interface ResearchSession {
  id: string;
  topic: string;
  status: 'idle' | 'researching' | 'completed' | 'error';
  stages: Record<ResearchStage | PipelineStage, StageProgress>;
  sources: Source[];
  report?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

/**
 * SSE message types
 */
export interface SSEMessage {
  type: 'stage_change' | 'status' | 'source' | 'result' | 'error';
  data: unknown;
}

/**
 * Stage change event from API
 */
export interface StageChangeEvent {
  stage: ResearchStage | PipelineStage;
  status: 'active' | 'completed' | 'error';
  message?: string;
}

/**
 * Stage change message for SSE streaming
 */
export interface StageChangeMessage {
  type: "stage_change";
  stage: PipelineStage;
  timestamp: number;
  description?: string;
}

/**
 * Status event from API
 */
export interface StatusEvent {
  message: string;
  stage: ResearchStage | PipelineStage;
}

/**
 * Source event from API
 */
export interface SourceEvent {
  source: Source;
}

/**
 * Result event from API
 */
export interface ResultEvent {
  report: string;
  sources: Source[];
}

/**
 * Error event from API
 */
export interface ErrorEvent {
  message: string;
  stage?: ResearchStage | PipelineStage;
}

/**
 * Search plan from planner agent
 */
export interface SearchPlan {
  queries: string[];
  searchTypes: ('neural' | 'keyword')[];
  isTimeSensitive?: boolean;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  } | null;
  rationale: string;
}

/**
 * Search result from web search agent
 */
export interface SearchResult {
  sources: Source[];
  contents: Array<{
    url: string;
    title: string;
    text: string;
    publishedDate?: string;
  }>;
}

/**
 * Agent SDK message type
 */
export interface AgentSDKMessage {
  type: "assistant" | "result" | "error" | string;
  message?: {
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };
  result?: string;
  error?: string;
  sessionId?: string;
}
