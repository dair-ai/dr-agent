'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { ResearchForm } from '@/components/research-form';
import { MinimalProgress } from '@/components/minimal-progress';
import { TabNavigation } from '@/components/tab-navigation';
import { SourcesPanel } from '@/components/sources-panel';
import { ReportViewer } from '@/components/report-viewer';
import { ActionBar } from '@/components/action-bar';
import { useResearchAgent } from '@/hooks/use-research-agent';

export default function Home() {
  const {
    status,
    currentStage,
    stages,
    sources,
    report,
    error,
    topic,
    startResearch,
    isResearching,
    isCompleted,
  } = useResearchAgent();

  const [activeTab, setActiveTab] = useState<'answer' | 'sources'>('answer');
  const [highlightedSourceIndex, setHighlightedSourceIndex] = useState<number | null>(null);

  const handleSourceClick = (index: number) => {
    setActiveTab('sources');
    setHighlightedSourceIndex(index);
    // Clear highlight after a short delay
    setTimeout(() => setHighlightedSourceIndex(null), 2000);
  };

  const showContent = isResearching || isCompleted;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gray-900 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-gray-900">
                Deep Research Agent
              </h1>
              <p className="text-sm text-gray-500">
                AI-powered multi-agent research system
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Centered Single Column */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Research Form */}
        <Card className="p-6 border-gray-200 bg-white shadow-sm mb-6">
          <ResearchForm onSubmit={startResearch} isLoading={isResearching} />
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="p-4 border-red-200 bg-red-50 mb-6">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800">Research Error</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Progress Indicator */}
        {showContent && (
          <div className="mb-6">
            <MinimalProgress stages={stages} currentStage={currentStage} />
          </div>
        )}

        {/* Empty State */}
        {!showContent && !error && (
          <Card className="p-12 border-gray-200 bg-white shadow-sm text-center">
            <div className="max-w-md mx-auto">
              <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-serif font-semibold text-gray-800 mb-2">
                Ready to Research
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                Enter an AI topic to begin deep research. The agent will analyze your
                topic, search the web for relevant sources, and synthesize a comprehensive
                report.
              </p>
            </div>
          </Card>
        )}

        {/* Tab Navigation & Content */}
        {showContent && (
          <div className="space-y-4">
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              sourceCount={sources.length}
            />

            {/* Tab Content */}
            <div className="mt-4">
              {activeTab === 'answer' ? (
                <>
                  <ReportViewer
                    report={report}
                    topic={topic}
                    isLoading={isResearching}
                    sources={sources}
                    onSourceClick={handleSourceClick}
                  />
                  <ActionBar report={report} topic={topic} />
                </>
              ) : (
                <SourcesPanel
                  sources={sources}
                  isLoading={isResearching}
                  highlightedSourceIndex={highlightedSourceIndex}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <p className="text-xs text-gray-400 text-center">
            Powered by Claude Agent SDK and Exa Search
          </p>
        </div>
      </footer>
    </main>
  );
}
