'use client';

import { Card } from '@/components/ui/card';
import { ResearchForm } from '@/components/research-form';
import { PipelineProgress } from '@/components/pipeline-progress';
import { SourcesPanel } from '@/components/sources-panel';
import { ReportViewer } from '@/components/report-viewer';
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

  return (
    <main className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-900 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
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
              <h1 className="text-2xl font-serif font-bold text-stone-900">
                Deep Research Agent
              </h1>
              <p className="text-sm text-stone-500">
                AI-powered multi-agent research system
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column - Input & Progress */}
          <div className="lg:col-span-4 space-y-6">
            {/* Research Input */}
            <Card className="p-6 border-stone-200 bg-white">
              <h2 className="text-lg font-serif font-semibold text-stone-800 mb-4">
                Start Research
              </h2>
              <ResearchForm onSubmit={startResearch} isLoading={isResearching} />
            </Card>

            {/* Pipeline Progress */}
            {(isResearching || isCompleted) && (
              <Card className="p-6 border-stone-200 bg-white animate-in fade-in slide-in-from-bottom-4">
                <PipelineProgress stages={stages} currentStage={currentStage} />
              </Card>
            )}

            {/* Sources Panel */}
            {(isResearching || isCompleted) && (
              <Card className="p-6 border-stone-200 bg-white animate-in fade-in slide-in-from-bottom-4">
                <SourcesPanel sources={sources} isLoading={isResearching} />
              </Card>
            )}
          </div>

          {/* Right Column - Report */}
          <div className="lg:col-span-8">
            {error && (
              <Card className="p-6 border-red-200 bg-red-50 mb-6">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-500 mt-0.5"
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
                    <h3 className="text-sm font-medium text-red-800">
                      Research Error
                    </h3>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </Card>
            )}

            {!report && !isResearching && !error && (
              <Card className="p-12 border-stone-200 bg-white text-center">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-stone-100 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-stone-400"
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
                  <h2 className="text-xl font-serif font-semibold text-stone-800 mb-2">
                    Ready to Research
                  </h2>
                  <p className="text-stone-500 text-sm leading-relaxed">
                    Enter an AI topic to begin deep research. The agent will
                    analyze your topic, search the web for relevant sources, and
                    synthesize a comprehensive report.
                  </p>
                </div>
              </Card>
            )}

            {(isResearching || report) && (
              <ReportViewer
                report={report}
                topic={topic}
                isLoading={isResearching}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <p className="text-xs text-stone-400 text-center">
            Powered by Claude Agent SDK and Exa Search
          </p>
        </div>
      </footer>
    </main>
  );
}
