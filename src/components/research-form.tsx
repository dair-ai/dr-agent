'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ResearchFormProps {
  onSubmit: (topic: string) => void;
  isLoading: boolean;
}

const EXAMPLE_TOPICS = [
  'Transformer attention mechanisms and their variants',
  'Recent advances in multimodal AI models',
  'RAG (Retrieval Augmented Generation) best practices',
  'AI safety and alignment research progress',
];

export function ResearchForm({ onSubmit, isLoading }: ResearchFormProps) {
  const [topic, setTopic] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim() && !isLoading) {
      onSubmit(topic.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setTopic(example);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="topic" className="block text-sm font-medium text-stone-700">
          Research Topic
        </label>
        <Textarea
          id="topic"
          placeholder="Enter an AI topic to research..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isLoading}
          className="min-h-[100px] resize-none bg-white border-stone-200 focus:border-stone-400 focus:ring-stone-400"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">
          Example topics
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_TOPICS.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleExampleClick(example)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={!topic.trim() || isLoading}
        className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Researching...
          </span>
        ) : (
          'Start Research'
        )}
      </Button>
    </form>
  );
}
