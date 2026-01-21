'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  PipelineStage,
  StageProgress,
  Source,
  StageChangeMessage,
} from '@/types/research';

type ResearchStatus = 'idle' | 'researching' | 'completed' | 'error';

// Claude Agent SDK message format
interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | ContentBlock[];
}

interface AgentMessage {
  type: "user" | "assistant" | "system" | "stage_change" | "result" | "status" | "error";
  message?: {
    role: string;
    content: ContentBlock[] | string;
  };
  session_id?: string;
  tool_use_result?: Record<string, unknown>; // Object with content array, not a string
  // Stage change fields
  stage?: PipelineStage;
  timestamp?: number;
  description?: string;
  // Result message fields
  result?: string;
  // Status/error fields
  content?: string;
}

const INITIAL_STAGES: Record<PipelineStage, StageProgress> = {
  orchestrator: { stage: 'orchestrator', status: 'pending' },
  planner: { stage: 'planner', status: 'pending' },
  'web-search': { stage: 'web-search', status: 'pending' },
  'report-writer': { stage: 'report-writer', status: 'pending' },
};

export function useResearchAgent() {
  const [status, setStatus] = useState<ResearchStatus>('idle');
  const [currentStage, setCurrentStage] = useState<PipelineStage | null>(null);
  const [stages, setStages] = useState<Record<PipelineStage, StageProgress>>(INITIAL_STAGES);
  const [sources, setSources] = useState<Source[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const reportRef = useRef<string>('');
  const currentStageRef = useRef<PipelineStage | null>(null);
  const isCapturingReportRef = useRef<boolean>(false);

  const resetState = useCallback(() => {
    setStages({ ...INITIAL_STAGES });
    setSources([]);
    setReport(null);
    setError(null);
    setCurrentStage(null);
    reportRef.current = '';
    currentStageRef.current = null;
    isCapturingReportRef.current = false;
  }, []);

  const startResearch = useCallback(async (researchTopic: string) => {
    // Cancel any existing research
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state
    resetState();
    setTopic(researchTopic);
    setStatus('researching');

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: researchTopic }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start research');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const messages = buffer.split('\n\n');
        // Keep the last part in buffer (might be incomplete)
        buffer = messages.pop() || '';

        for (const message of messages) {
          const lines = message.split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6);

            // Handle completion marker
            if (dataStr === '[DONE]') {
              setStatus('completed');
              continue;
            }

            if (!dataStr) continue;

            try {
              const parsed = JSON.parse(dataStr) as AgentMessage;
              handleMessage(parsed);
            } catch (e) {
              console.error('Failed to parse SSE message:', e, 'Data:', dataStr.substring(0, 500));
            }
          }
        }
      }

      // Mark completion
      setStatus('completed');
      setStages((prev) => ({
        ...prev,
        'report-writer': {
          ...prev['report-writer'],
          status: 'completed',
          completedAt: Date.now(),
        },
      }));

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Research was cancelled
        setStatus('idle');
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Research failed';
      setError(errorMessage);
      setStatus('error');
    }
  }, [resetState]);

  const handleMessage = useCallback((message: AgentMessage) => {
    // Debug: Log all messages to see what we're receiving
    console.log('[Research] Message received:', message.type, message);

    // Handle stage change messages
    if (message.type === 'stage_change') {
      const stageMsg = message as unknown as StageChangeMessage;
      const stage = stageMsg.stage;

      currentStageRef.current = stage;
      setCurrentStage(stage);

      // Start capturing report when we enter report-writer stage
      if (stage === 'report-writer') {
        isCapturingReportRef.current = true;
        reportRef.current = ''; // Clear any previous content
      }

      setStages((prev) => {
        // Mark previous active stage as completed, set new stage as active
        const stageOrder: PipelineStage[] = ['orchestrator', 'planner', 'web-search', 'report-writer'];
        const currentIndex = stageOrder.indexOf(stage);

        const updated = { ...prev };
        for (let i = 0; i < stageOrder.length; i++) {
          const s = stageOrder[i];
          if (i < currentIndex) {
            updated[s] = { ...updated[s], status: 'completed', completedAt: Date.now() };
          } else if (i === currentIndex) {
            updated[s] = { ...updated[s], status: 'active', message: stageMsg.description, startedAt: Date.now() };
          }
        }
        return updated;
      });
      return;
    }

    // Handle status messages
    if (message.type === 'status') {
      return;
    }

    // Handle final result message
    if (message.type === 'result' && message.result) {
      // If we have a captured report, use that; otherwise use the result
      if (!reportRef.current || reportRef.current.length < 500) {
        // Try to extract just the markdown report from the result
        const reportMatch = message.result.match(/^#\s+.+[\s\S]*/m);
        if (reportMatch) {
          setReport(reportMatch[0]);
        } else {
          setReport(message.result);
        }
      }
      return;
    }

    // Handle error messages
    if (message.type === 'error') {
      setError(message.content || 'An error occurred');
      setStatus('error');
      return;
    }

    // Handle assistant messages - extract report text when in report-writer stage
    if (message.type === 'assistant' && message.message?.content) {
      const contentBlocks: ContentBlock[] = [];
      if (Array.isArray(message.message.content)) {
        contentBlocks.push(...message.message.content);
      } else if (typeof message.message.content === 'string') {
        contentBlocks.push({ type: 'text', text: message.message.content });
      }

      for (const block of contentBlocks) {
        // Only capture text content when in report-writer stage
        if (block.type === 'text' && block.text) {
          // Check if this looks like report content (starts with markdown heading or is in report-writer stage)
          const isReportContent = isCapturingReportRef.current ||
            block.text.match(/^#\s+.+/m) || // Starts with markdown heading
            block.text.includes('## Executive Summary') ||
            block.text.includes('## Key Findings') ||
            block.text.includes('## Introduction');

          if (isReportContent) {
            // Extract just the markdown report, filtering out orchestrator commentary
            let textToAdd = block.text;

            // If the text contains a report heading, extract from there
            const reportStart = textToAdd.match(/^(#\s+[^\n]+)/m);
            if (reportStart && reportStart.index !== undefined && reportStart.index > 0) {
              textToAdd = textToAdd.substring(reportStart.index);
            }

            // Remove STAGE: prefix if present at the start
            textToAdd = textToAdd.replace(/^STAGE:[^\n]*\n*/i, '');

            // Filter out orchestrator meta-commentary patterns
            if (!textToAdd.match(/^(✅|📊|🎯|Perfect!|I have|Here's a|Here is|The report|Pipeline)/i)) {
              reportRef.current += textToAdd;
              setReport(reportRef.current);
            }
          }
        }
      }
    }

    // Handle user messages with tool results - extract sources
    if (message.type === 'user') {
      console.log('[Research] User message - checking for tool results:', message);

      if (message.message?.content) {
        const contentBlocks: ContentBlock[] = [];
        if (Array.isArray(message.message.content)) {
          contentBlocks.push(...message.message.content);
        }

        console.log('[Research] User message content blocks:', contentBlocks);

        for (const block of contentBlocks) {
          // Handle tool_result blocks (this is where search results come back)
          if (block.type === 'tool_result') {
            console.log('[Research] Found tool_result block:', block);

            // Content can be an array of {type: "text", text: "..."} objects
            const contentArray = Array.isArray(block.content) ? block.content : [block.content];

            for (const contentItem of contentArray) {
              let textContent = '';

              if (typeof contentItem === 'string') {
                textContent = contentItem;
              } else if (contentItem && typeof contentItem === 'object' && 'text' in contentItem) {
                textContent = (contentItem as { text: string }).text;
              }

              if (!textContent) continue;

              console.log('[Research] Tool result text content (first 500 chars):', textContent.substring(0, 500));

              // Try to parse as JSON directly or extract from code blocks
              try {
                // First try to extract JSON from code blocks
                const jsonMatch = textContent.match(/```json\s*([\s\S]*?)\s*```/);
                const jsonStr = jsonMatch ? jsonMatch[1] : textContent;

                // Check if it looks like JSON
                if (jsonStr.trim().startsWith('{') || jsonStr.trim().startsWith('[')) {
                  const result = JSON.parse(jsonStr.trim());
                  console.log('[Research] Parsed tool result JSON:', result);

                  // Extract sources from search results (Exa search response)
                  if (result.results && Array.isArray(result.results)) {
                    console.log('[Research] Found search results:', result.results.length);
                    extractSources(result.results);
                  }
                  // Also handle documents from get_contents
                  if (result.documents && Array.isArray(result.documents)) {
                    console.log('[Research] Found documents:', result.documents.length);
                    extractSources(result.documents);
                  }
                }
              } catch (e) {
                // Not JSON, that's ok - might be a non-search tool result
                console.log('[Research] Tool result is not JSON (ok for non-search results)');
              }
            }
          }
        }
      }

      // Also check tool_use_result field (alternative format - it's an object, not a string)
      if (message.tool_use_result) {
        console.log('[Research] Found tool_use_result field:', message.tool_use_result);
        const result = message.tool_use_result as Record<string, unknown>;

        // Check if it has content array with text containing JSON
        if (result.content && Array.isArray(result.content)) {
          for (const item of result.content) {
            if (typeof item === 'object' && item !== null && 'text' in item) {
              const text = (item as { text: string }).text;
              // Try to extract JSON from the text (might be wrapped in code blocks)
              const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/^(\{[\s\S]*\})$/m);
              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[1]);
                  if (parsed.results && Array.isArray(parsed.results)) {
                    console.log('[Research] Extracting from tool_use_result content:', parsed.results.length);
                    extractSources(parsed.results);
                  }
                } catch {
                  // Not valid JSON
                }
              }
            }
          }
        }
      }
    }
  }, []);

  const extractSources = useCallback((items: Record<string, unknown>[]) => {
    const newSources: Source[] = items.map((r, index) => ({
      id: `source-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      title: (r.title as string) || 'Untitled',
      url: r.url as string,
      author: r.author as string | undefined,
      publishedDate: (r.published_date || r.publishedDate) as string | undefined,
      snippet: ((r.text as string) || '').substring(0, 200),
    }));

    setSources((prev) => {
      // Deduplicate by URL
      const urlSet = new Set(prev.map(s => s.url));
      const uniqueNew = newSources.filter(s => s.url && !urlSet.has(s.url));
      return [...prev, ...uniqueNew];
    });
  }, []);

  const cancelResearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('idle');
    resetState();
  }, [resetState]);

  return {
    // State
    status,
    currentStage,
    stages,
    sources,
    report,
    error,
    topic,

    // Actions
    startResearch,
    cancelResearch,

    // Computed
    isIdle: status === 'idle',
    isResearching: status === 'researching',
    isCompleted: status === 'completed',
    isError: status === 'error',
  };
}
