import { runResearchPipeline, type OrchestratorCallbacks } from '@/lib/agent/orchestrator';
import { getExecutionMode } from '@/lib/sandbox';
import { runResearchInSandbox, type SandboxCallbacks } from '@/lib/sandbox/runner';
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

    // Determine execution mode based on environment
    const executionMode = getExecutionMode();
    console.log(`[Research API] Execution mode: ${executionMode}`);

    // Create a readable stream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: unknown) => {
          controller.enqueue(encoder.encode(createSSEMessage(type, data)));
        };

        // Common callbacks for both execution modes
        const callbacks: OrchestratorCallbacks & SandboxCallbacks = {
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
          if (executionMode === 'sandbox') {
            // Production: Use Vercel Sandbox for isolated execution
            console.log('[Research API] Running in Vercel Sandbox');
            const result = await runResearchInSandbox(topic.trim(), callbacks);

            if (result.success) {
              sendEvent('result', {
                report: result.report,
                sources: result.sources,
              });
            } else {
              sendEvent('error', {
                message: result.error || 'Sandbox execution failed',
              });
            }
          } else {
            // Development: Direct execution (no sandbox needed)
            console.log('[Research API] Running locally (direct execution)');
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
          }
        } catch (error) {
          console.error('[Research API] Error:', error);
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
