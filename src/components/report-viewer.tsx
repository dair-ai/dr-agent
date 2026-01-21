'use client';

import { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { InlineSourceBadge } from '@/components/inline-source-badge';
import type { Source } from '@/types/research';

interface ReportViewerProps {
  report: string | null;
  topic: string;
  isLoading: boolean;
  sources?: Source[];
  onSourceClick?: (index: number) => void;
}

// Parse text content for [Source N] patterns and replace with badges
function parseSourceReferences(
  text: string,
  sources: Source[],
  onSourceClick?: (index: number) => void
): ReactNode[] {
  const sourcePattern = /\[Source\s*(\d+)\]/gi;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = sourcePattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const sourceNumber = parseInt(match[1], 10);
    const sourceIndex = sourceNumber - 1; // Convert to 0-based index
    const source = sources[sourceIndex];

    if (source) {
      parts.push(
        <InlineSourceBadge
          key={`source-${match.index}-${sourceNumber}`}
          sourceNumber={sourceNumber}
          source={source}
          onClick={() => onSourceClick?.(sourceIndex)}
        />
      );
    } else {
      // Keep original text if source doesn't exist
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

// Recursively process children to find and replace source references
function processChildren(
  children: ReactNode,
  sources: Source[],
  onSourceClick?: (index: number) => void
): ReactNode {
  if (typeof children === 'string') {
    const parsed = parseSourceReferences(children, sources, onSourceClick);
    return parsed.length === 1 && typeof parsed[0] === 'string' ? parsed[0] : <>{parsed}</>;
  }

  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === 'string') {
        const parsed = parseSourceReferences(child, sources, onSourceClick);
        return parsed.length === 1 && typeof parsed[0] === 'string' ? (
          child
        ) : (
          <span key={index}>{parsed}</span>
        );
      }
      return child;
    });
  }

  return children;
}

export function ReportViewer({
  report,
  topic,
  isLoading,
  sources = [],
  onSourceClick,
}: ReportViewerProps) {
  if (isLoading && !report) {
    return (
      <Card className="p-8 border-gray-200 bg-white shadow-sm">
        <div className="space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-5/6" />
            <div className="h-4 bg-gray-100 rounded w-4/6" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-1/4 mt-6" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-full" />
            <div className="h-4 bg-gray-100 rounded w-3/4" />
          </div>
        </div>
      </Card>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <Card className="p-8 border-gray-200 bg-white shadow-sm">
      <article className="prose prose-gray prose-sm max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-serif font-bold text-gray-900 mt-0 mb-4">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-serif font-semibold text-gray-800 mt-8 mb-3 pb-2 border-b border-gray-200">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-gray-700 mt-6 mb-2">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="text-gray-600 leading-relaxed mb-4">
                {processChildren(children, sources, onSourceClick)}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-outside ml-4 space-y-1 text-gray-600 mb-4">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-outside ml-4 space-y-1 text-gray-600 mb-4">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-600">
                {processChildren(children, sources, onSourceClick)}
              </li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-500 my-4">
                {children}
              </blockquote>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 underline underline-offset-2 hover:text-gray-900 transition-colors"
              >
                {children}
              </a>
            ),
            code: ({ className, children }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono text-gray-700">
                    {children}
                  </code>
                );
              }
              return (
                <code className={cn('block p-4 bg-gray-50 rounded-lg overflow-x-auto', className)}>
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-gray-50 rounded-lg overflow-x-auto my-4">
                {children}
              </pre>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-gray-800">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-gray-600">{children}</em>
            ),
            hr: () => <hr className="border-gray-200 my-8" />,
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="px-4 py-2 bg-gray-50 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 text-sm text-gray-600 border-t border-gray-100">
                {children}
              </td>
            ),
          }}
        >
          {report}
        </ReactMarkdown>
      </article>
    </Card>
  );
}
