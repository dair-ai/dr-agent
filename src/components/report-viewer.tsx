'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReportViewerProps {
  report: string | null;
  topic: string;
  isLoading: boolean;
}

export function ReportViewer({ report, topic, isLoading }: ReportViewerProps) {
  const handleCopy = async () => {
    if (report) {
      await navigator.clipboard.writeText(report);
    }
  };

  const handleDownload = () => {
    if (report) {
      const blob = new Blob([report], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `research-${topic.slice(0, 30).replace(/\s+/g, '-').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading && !report) {
    return (
      <Card className="p-8 border-stone-200">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-stone-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-stone-100 rounded w-full" />
            <div className="h-4 bg-stone-100 rounded w-5/6" />
            <div className="h-4 bg-stone-100 rounded w-4/6" />
          </div>
          <div className="h-6 bg-stone-200 rounded w-1/4 mt-6" />
          <div className="space-y-2">
            <div className="h-4 bg-stone-100 rounded w-full" />
            <div className="h-4 bg-stone-100 rounded w-full" />
            <div className="h-4 bg-stone-100 rounded w-3/4" />
          </div>
        </div>
      </Card>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-serif font-semibold text-stone-800">
          Research Report
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs border-stone-200 hover:bg-stone-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Copy
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="text-xs border-stone-200 hover:bg-stone-50"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download
          </Button>
        </div>
      </div>

      <Card className="p-8 border-stone-200 bg-white">
        <article className="prose prose-stone prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0 mb-4">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-serif font-semibold text-stone-800 mt-8 mb-3 pb-2 border-b border-stone-200">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-semibold text-stone-700 mt-6 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-stone-600 leading-relaxed mb-4">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-outside ml-4 space-y-1 text-stone-600 mb-4">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-outside ml-4 space-y-1 text-stone-600 mb-4">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-stone-600">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-500 my-4">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-700 underline underline-offset-2 hover:text-stone-900 transition-colors"
                >
                  {children}
                </a>
              ),
              code: ({ className, children }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code className="px-1.5 py-0.5 bg-stone-100 rounded text-sm font-mono text-stone-700">
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={cn('block p-4 bg-stone-50 rounded-lg overflow-x-auto', className)}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="bg-stone-50 rounded-lg overflow-x-auto my-4">
                  {children}
                </pre>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-stone-800">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-stone-600">{children}</em>
              ),
              hr: () => <hr className="border-stone-200 my-8" />,
              table: ({ children }) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full divide-y divide-stone-200 border border-stone-200 rounded">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="px-4 py-2 bg-stone-50 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 text-sm text-stone-600 border-t border-stone-100">
                  {children}
                </td>
              ),
            }}
          >
            {report}
          </ReactMarkdown>
        </article>
      </Card>
    </div>
  );
}
