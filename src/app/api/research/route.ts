/**
 * Research API Route
 *
 * Handles research requests using the Claude Agent SDK multi-agent pipeline.
 * Routes to sandbox or direct execution based on environment.
 */

import { NextRequest } from "next/server";
import {
  runResearchPipeline,
  detectStageChange,
  extractTextFromMessage,
  getSubagentCall
} from "@/lib/agent/orchestrator";
import { getExecutionMode } from "@/lib/sandbox";
import { runResearchInSandbox, type SandboxMessage } from "@/lib/sandbox/runner";
import type { PipelineStage, StageChangeMessage } from "@/types/research";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max

/**
 * Map subagent types to pipeline stages
 */
const AGENT_STAGE_MAP: Record<string, PipelineStage> = {
  "planner-agent": "planner",
  "web-search-agent": "web-search",
  "report-writer-agent": "report-writer"
};

/**
 * Run research using Vercel Sandbox (for serverless environments)
 */
async function runResearchWithSandbox(
  topic: string,
  sessionId: string | undefined,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  const exaApiKey = process.env.EXA_API_KEY;

  if (!anthropicApiKey || !exaApiKey) {
    throw new Error("Missing required API keys (ANTHROPIC_API_KEY or EXA_API_KEY)");
  }

  let currentStage: PipelineStage | null = null;

  const emitStageChange = (stage: PipelineStage, description: string) => {
    if (stage !== currentStage) {
      currentStage = stage;
      const stageEvent: StageChangeMessage = {
        type: "stage_change",
        stage,
        timestamp: Date.now(),
        description
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(stageEvent)}\n\n`));
    }
  };

  const messageQueue: SandboxMessage[] = [];

  for await (const sandboxMsg of runResearchInSandbox({
    topic,
    sessionId,
    anthropicApiKey,
    exaApiKey,
    onMessage: (msg) => messageQueue.push(msg)
  })) {
    // Process queued messages first
    while (messageQueue.length > 0) {
      const queuedMsg = messageQueue.shift()!;
      processSandboxMessage(queuedMsg);
    }
    processSandboxMessage(sandboxMsg);
  }

  // Process any remaining queued messages
  while (messageQueue.length > 0) {
    const queuedMsg = messageQueue.shift()!;
    processSandboxMessage(queuedMsg);
  }

  function processSandboxMessage(sandboxMsg: SandboxMessage) {
    console.log(`[Sandbox ${sandboxMsg.type}]`, sandboxMsg.data.substring(0, 200));

    if (sandboxMsg.type === "status") {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "status", content: sandboxMsg.data })}\n\n`));
    } else if (sandboxMsg.type === "result") {
      try {
        const message = JSON.parse(sandboxMsg.data);

        // Detect stage changes from assistant messages
        if (message.type === "assistant" && message.message?.content) {
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === "text") {
                const stageChange = detectStageChange(block.text);
                if (stageChange) {
                  emitStageChange(stageChange.stage, stageChange.description);
                }
              } else if (block.type === "tool_use" && block.name === "Task" && block.input) {
                const input = block.input as { subagent_type?: string; description?: string };
                if (input.subagent_type) {
                  const stage = AGENT_STAGE_MAP[input.subagent_type];
                  if (stage) {
                    emitStageChange(stage, input.description || `Running ${input.subagent_type}`);
                  }
                }
              }
            }
          }
        }

        // Forward ALL messages to frontend (assistant, user, result, etc.)
        controller.enqueue(encoder.encode(`data: ${sandboxMsg.data}\n\n`));

      } catch {
        // Ignore non-JSON results
      }
    } else if (sandboxMsg.type === "error") {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", content: sandboxMsg.data })}\n\n`));
    }
  }
}

/**
 * Run research using direct SDK call (for local development)
 */
async function runResearchDirect(
  topic: string,
  sessionId: string | undefined,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder
) {
  let currentStage: PipelineStage | null = null;

  const emitStageChange = (stage: PipelineStage, description: string) => {
    if (stage !== currentStage) {
      currentStage = stage;
      const stageEvent: StageChangeMessage = {
        type: "stage_change",
        stage,
        timestamp: Date.now(),
        description
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(stageEvent)}\n\n`));
    }
  };

  for await (const message of runResearchPipeline(topic, sessionId)) {
    // Cast message to the expected type
    const typedMessage = message as { type: string; message?: { content?: unknown[] }; result?: string };

    // Detect stage changes from assistant messages
    if (typedMessage.type === "assistant") {
      const text = extractTextFromMessage(typedMessage);
      if (text) {
        const stageChange = detectStageChange(text);
        if (stageChange) {
          emitStageChange(stageChange.stage, stageChange.description);
        }
      }

      // Check for subagent calls
      const subagentCall = getSubagentCall(typedMessage);
      if (subagentCall) {
        const stage = AGENT_STAGE_MAP[subagentCall.subagent_type];
        if (stage) {
          emitStageChange(stage, subagentCall.description);
        }
      }
    }

    // Forward ALL messages to frontend (assistant, user, result, etc.)
    const data = JSON.stringify(typedMessage);
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { topic, sessionId } = await request.json();

    if (!topic || typeof topic !== "string") {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.EXA_API_KEY) {
      return new Response(
        JSON.stringify({ error: "EXA_API_KEY is not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const executionMode = getExecutionMode();
    console.log(`[Research API] Starting research for topic: "${topic.substring(0, 50)}..." (Mode: ${executionMode})`);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (executionMode === "sandbox") {
            console.log("[Research API] Using Vercel Sandbox...");
            await runResearchWithSandbox(topic.trim(), sessionId, controller, encoder);
          } else {
            console.log("[Research API] Using direct SDK...");
            await runResearchDirect(topic.trim(), sessionId, controller, encoder);
          }

          console.log("[Research API] Research completed successfully");
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          console.error("[Research API] Stream error:", errorMessage);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "error", content: errorMessage })}\n\n`)
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Research API] Request error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
