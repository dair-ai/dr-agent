'use client';

import { useState, useCallback, useRef } from 'react';
import type {
  ResearchStage,
  StageProgress,
  Source,
  SSEMessage,
  StageChangeEvent,
  StatusEvent,
  SourceEvent,
  ResultEvent,
  ErrorEvent,
} from '@/types/research';

type ResearchStatus = 'idle' | 'researching' | 'completed' | 'error';

const INITIAL_STAGES: Record<ResearchStage, StageProgress> = {
  planning: { stage: 'planning', status: 'pending' },
  searching: { stage: 'searching', status: 'pending' },
  writing: { stage: 'writing', status: 'pending' },
  completed: { stage: 'completed', status: 'pending' },
};

export function useResearchAgent() {
  const [status, setStatus] = useState<ResearchStatus>('idle');
  const [currentStage, setCurrentStage] = useState<ResearchStage | null>(null);
  const [stages, setStages] = useState<Record<ResearchStage, StageProgress>>(INITIAL_STAGES);
  const [sources, setSources] = useState<Source[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  const resetState = useCallback(() => {
    setStages({ ...INITIAL_STAGES });
    setSources([]);
    setReport(null);
    setError(null);
    setCurrentStage(null);
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
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const message: SSEMessage = JSON.parse(line.slice(6));
              handleSSEMessage(message);
            } catch {
              console.error('Failed to parse SSE message:', line);
            }
          }
        }
      }
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

  const handleSSEMessage = useCallback((message: SSEMessage) => {
    switch (message.type) {
      case 'stage_change': {
        const data = message.data as StageChangeEvent;
        setCurrentStage(data.stage);
        setStages((prev) => ({
          ...prev,
          [data.stage]: {
            ...prev[data.stage],
            status: data.status,
            message: data.message,
            startedAt: data.status === 'active' ? Date.now() : prev[data.stage].startedAt,
            completedAt: data.status === 'completed' ? Date.now() : undefined,
          },
        }));

        if (data.stage === 'completed' && data.status === 'completed') {
          setStatus('completed');
        }
        break;
      }

      case 'status': {
        const data = message.data as StatusEvent;
        setStages((prev) => ({
          ...prev,
          [data.stage]: {
            ...prev[data.stage],
            message: data.message,
          },
        }));
        break;
      }

      case 'source': {
        const data = message.data as SourceEvent;
        setSources((prev) => [...prev, data.source]);
        break;
      }

      case 'result': {
        const data = message.data as ResultEvent;
        setReport(data.report);
        break;
      }

      case 'error': {
        const data = message.data as ErrorEvent;
        setError(data.message);
        setStatus('error');
        const errorStage = data.stage;
        if (errorStage) {
          setStages((prev) => ({
            ...prev,
            [errorStage]: {
              ...prev[errorStage],
              status: 'error',
              message: data.message,
            },
          }));
        }
        break;
      }
    }
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
