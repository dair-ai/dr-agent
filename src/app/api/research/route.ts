import { runResearchPipeline, type OrchestratorCallbacks } from '@/lib/agent/orchestrator';
import type { ResearchStage, Source } from '@/types/research';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max

interface ResearchRequest {
  topic: string;
}

function createSSEMessage(type: string, data: unknown): string {
  return `data: ${JSON.stringify({ type, data })}\n\n`;
}

export async function POST(request: Request) {
  try {
    const body: ResearchRequest = await request.json();
    const { topic } = body;

    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      return new Response(
        JSON.stringify({ error: 'Please provide a valid research topic (at least 3 characters)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.EXA_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'EXA_API_KEY is not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(encoder.encode(createSSEMessage(type, data)));
        };

        // Set up callbacks for the orchestrator
        const callbacks: OrchestratorCallbacks = {
          onStageChange: (stage: ResearchStage, status: 'active' | 'completed' | 'error', message?: string) => {
            sendEvent('stage_change', { stage, status, message });
          },
          onStatus: (message: string, stage: ResearchStage) => {
            sendEvent('status', { message, stage });
          },
          onSource: (source: Source) => {
            sendEvent('source', { source });
          },
          onError: (error: string, stage?: ResearchStage) => {
            sendEvent('error', { message: error, stage });
          },
        };

        try {
          // Run the research pipeline
          const result = await runResearchPipeline(topic.trim(), callbacks);

          if (result.success) {
            sendEvent('result', {
              report: result.report,
              sources: result.sources,
            });
          } else {
            sendEvent('error', {
              message: result.error || 'Research pipeline failed',
            });
          }
        } catch (error) {
          sendEvent('error', {
            message: error instanceof Error ? error.message : 'Unexpected error occurred',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
