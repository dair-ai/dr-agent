'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Source } from '@/types/research';

interface SourcesPanelProps {
  sources: Source[];
  isLoading: boolean;
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function getDomainBadgeColor(domain: string): string {
  if (domain.includes('arxiv')) return 'bg-orange-100 text-orange-700';
  if (domain.includes('github')) return 'bg-slate-100 text-slate-700';
  if (domain.includes('huggingface')) return 'bg-yellow-100 text-yellow-700';
  if (domain.includes('nature') || domain.includes('science')) return 'bg-green-100 text-green-700';
  if (domain.includes('medium') || domain.includes('towardsdatascience')) return 'bg-emerald-100 text-emerald-700';
  return 'bg-stone-100 text-stone-600';
}

export function SourcesPanel({ sources, isLoading }: SourcesPanelProps) {
  if (sources.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-700 uppercase tracking-wide">
          Discovered Sources
        </h3>
        <Badge variant="secondary" className="bg-stone-100 text-stone-600">
          {sources.length} found
        </Badge>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
        {sources.map((source, index) => {
          const domain = getDomainFromUrl(source.url);
          const badgeColor = getDomainBadgeColor(domain);

          return (
            <Card
              key={source.id || index}
              className={cn(
                'p-4 border-stone-200 hover:border-stone-300 transition-all duration-300',
                'animate-in fade-in slide-in-from-left-2'
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-stone-900 hover:text-stone-600 line-clamp-2 transition-colors"
                  >
                    {source.title}
                  </a>
                  <Badge className={cn('shrink-0 text-xs', badgeColor)}>
                    {domain}
                  </Badge>
                </div>

                {source.snippet && (
                  <p className="text-xs text-stone-500 line-clamp-2">
                    {source.snippet}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-stone-400">
                  {source.author && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {source.author}
                    </span>
                  )}
                  {source.publishedDate && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {new Date(source.publishedDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {isLoading && sources.length === 0 && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 border-stone-200">
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 bg-stone-200 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-full" />
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
