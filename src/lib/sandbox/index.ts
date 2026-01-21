/**
 * Environment detection for Vercel Sandbox
 *
 * The Claude Agent SDK spawns subprocesses for MCP servers, but Vercel
 * serverless functions cannot spawn subprocesses. This module detects
 * the environment to route execution appropriately.
 */

/**
 * Check if running in Vercel's serverless environment
 */
export function isVercelEnvironment(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

/**
 * Check if Vercel Sandbox credentials are configured
 */
export function isSandboxConfigured(): boolean {
  return Boolean(
    process.env.VERCEL_TOKEN &&
    process.env.VERCEL_PROJECT_ID
  );
}

/**
 * Get the execution mode based on environment
 */
export function getExecutionMode(): 'local' | 'sandbox' {
  if (isVercelEnvironment() && isSandboxConfigured()) {
    return 'sandbox';
  }
  return 'local';
}
