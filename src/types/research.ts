export type ResearchStage = 'planning' | 'searching' | 'writing' | 'completed';

export interface StageProgress {
  stage: ResearchStage;
  status: 'pending' | 'active' | 'completed' | 'error';
  startedAt?: number;
  completedAt?: number;
  message?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  snippet?: string;
}

export interface ResearchSession {
  id: string;
  topic: string;
  status: 'idle' | 'researching' | 'completed' | 'error';
  stages: Record<ResearchStage, StageProgress>;
  sources: Source[];
  report?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface SSEMessage {
  type: 'stage_change' | 'status' | 'source' | 'result' | 'error';
  data: unknown;
}

export interface StageChangeEvent {
  stage: ResearchStage;
  status: 'active' | 'completed' | 'error';
  message?: string;
}

export interface StatusEvent {
  message: string;
  stage: ResearchStage;
}

export interface SourceEvent {
  source: Source;
}

export interface ResultEvent {
  report: string;
  sources: Source[];
}

export interface ErrorEvent {
  message: string;
  stage?: ResearchStage;
}

// Search plan from planner agent
export interface SearchPlan {
  queries: string[];
  searchTypes: ('neural' | 'keyword')[];
  domains?: string[];
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  rationale: string;
}

// Search result from web search agent
export interface SearchResult {
  sources: Source[];
  contents: Array<{
    url: string;
    title: string;
    text: string;
    publishedDate?: string;
  }>;
}
