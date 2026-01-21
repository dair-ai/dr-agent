'use client';

import { cn } from '@/lib/utils';

interface TabNavigationProps {
  activeTab: 'answer' | 'sources';
  onTabChange: (tab: 'answer' | 'sources') => void;
  sourceCount: number;
}

export function TabNavigation({ activeTab, onTabChange, sourceCount }: TabNavigationProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        <button
          onClick={() => onTabChange('answer')}
          className={cn(
            'whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors',
            activeTab === 'answer'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          aria-current={activeTab === 'answer' ? 'page' : undefined}
        >
          Answer
        </button>
        <button
          onClick={() => onTabChange('sources')}
          className={cn(
            'whitespace-nowrap py-3 px-1 border-b-2 text-sm font-medium transition-colors',
            activeTab === 'sources'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          )}
          aria-current={activeTab === 'sources' ? 'page' : undefined}
        >
          Sources
          {sourceCount > 0 && (
            <span
              className={cn(
                'ml-2 py-0.5 px-2 rounded-full text-xs',
                activeTab === 'sources'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {sourceCount}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}
