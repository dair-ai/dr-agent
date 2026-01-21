'use client';

import { cn } from '@/lib/utils';
import type { ResearchStage, StageProgress } from '@/types/research';

interface MinimalProgressProps {
  stages: Record<ResearchStage, StageProgress>;
  currentStage: ResearchStage | null;
}

const stageLabels: Record<ResearchStage, { active: string; completed: string }> = {
  planning: { active: 'Planning research...', completed: 'Plan ready' },
  searching: { active: 'Searching sources...', completed: 'Sources found' },
  writing: { active: 'Writing report...', completed: 'Report ready' },
  completed: { active: 'Finalizing...', completed: 'Complete' },
};

const stageOrder: ResearchStage[] = ['planning', 'searching', 'writing', 'completed'];

function getStageNumber(stage: ResearchStage): number {
  return stageOrder.indexOf(stage) + 1;
}

export function MinimalProgress({ stages, currentStage }: MinimalProgressProps) {
  const isCompleted = stages.completed?.status === 'completed';
  const hasError = Object.values(stages).some(s => s.status === 'error');

  if (hasError) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Research encountered an error</span>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Research complete</span>
      </div>
    );
  }

  if (!currentStage) {
    return null;
  }

  const stageNum = getStageNumber(currentStage);
  const totalStages = stageOrder.length - 1; // Don't count 'completed' as a stage
  const label = stageLabels[currentStage];

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <svg
        className="w-4 h-4 animate-spin text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span>
        {label.active}
        {currentStage !== 'completed' && (
          <span className="text-gray-400 ml-1">
            ({stageNum}/{totalStages})
          </span>
        )}
      </span>
    </div>
  );
}
