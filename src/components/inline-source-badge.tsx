'use client';

import { cn } from '@/lib/utils';
import { getDomainFromUrl, getDomainBadgeColor } from '@/components/sources-panel';
import type { Source } from '@/types/research';

interface InlineSourceBadgeProps {
  sourceNumber: number;
  source: Source;
  onClick?: () => void;
}

export function InlineSourceBadge({ sourceNumber, source, onClick }: InlineSourceBadgeProps) {
  const domain = getDomainFromUrl(source.url);
  const badgeColor = getDomainBadgeColor(domain);

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[18px] h-[18px] px-1.5 rounded-full',
        'text-[10px] font-medium leading-none',
        'cursor-pointer transition-all duration-150',
        'hover:scale-110 hover:shadow-sm',
        'align-baseline mx-0.5',
        badgeColor
      )}
      title={source.title}
      type="button"
    >
      {sourceNumber}
    </button>
  );
}
