'use client';

import { cn } from '@/lib/utils';
import type { ResearchStage, StageProgress } from '@/types/research';

interface PipelineProgressProps {
  stages: Record<ResearchStage, StageProgress>;
  currentStage: ResearchStage | null;
}

const STAGE_CONFIG: Array<{
  key: ResearchStage;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    key: 'planning',
    label: 'Planning',
    icon: '📋',
    description: 'Creating search strategy',
  },
  {
    key: 'searching',
    label: 'Searching',
    icon: '🔍',
    description: 'Gathering sources',
  },
  {
    key: 'writing',
    label: 'Writing',
    icon: '✍️',
    description: 'Synthesizing report',
  },
];

function formatDuration(startedAt?: number, completedAt?: number): string {
  if (!startedAt) return '';
  const end = completedAt || Date.now();
  const seconds = Math.round((end - startedAt) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export function PipelineProgress({ stages, currentStage }: PipelineProgressProps) {
  const isIdle = currentStage === null;
  const isCompleted = stages.completed?.status === 'completed';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-700 uppercase tracking-wide">
          Pipeline Progress
        </h3>
        {isCompleted && (
          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Complete
          </span>
        )}
      </div>

      <div className="relative">
        {/* Connection line */}
        <div className="absolute left-5 top-8 bottom-8 w-px bg-stone-200" />

        <div className="space-y-6">
          {STAGE_CONFIG.map((config, index) => {
            const stage = stages[config.key];
            const isActive = stage?.status === 'active';
            const isComplete = stage?.status === 'completed';
            const isError = stage?.status === 'error';
            const isPending = !stage || stage.status === 'pending';

            return (
              <div
                key={config.key}
                className={cn(
                  'relative flex items-start gap-4 transition-all duration-500',
                  isActive && 'translate-x-1',
                  isPending && isIdle && 'opacity-40'
                )}
              >
                {/* Status indicator */}
                <div
                  className={cn(
                    'relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300',
                    isActive && 'border-amber-400 bg-amber-50 animate-pulse',
                    isComplete && 'border-emerald-400 bg-emerald-50',
                    isError && 'border-red-400 bg-red-50',
                    isPending && 'border-stone-200 bg-white'
                  )}
                >
                  {isComplete ? (
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : isError ? (
                    <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <span className="text-lg">{config.icon}</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={cn(
                        'text-sm font-semibold transition-colors',
                        isActive && 'text-amber-700',
                        isComplete && 'text-emerald-700',
                        isError && 'text-red-700',
                        isPending && 'text-stone-400'
                      )}
                    >
                      {config.label}
                    </h4>
                    {(isComplete || isActive) && stage?.startedAt && (
                      <span className="text-xs text-stone-400">
                        {formatDuration(stage.startedAt, stage.completedAt)}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-xs mt-0.5 transition-colors',
                      isActive && 'text-amber-600',
                      isComplete && 'text-stone-500',
                      isError && 'text-red-600',
                      isPending && 'text-stone-400'
                    )}
                  >
                    {stage?.message || config.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
