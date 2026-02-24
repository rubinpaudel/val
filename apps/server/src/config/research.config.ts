/**
 * Centralized configuration for research job system
 *
 * Values can be overridden via environment variables for deployment flexibility
 */

export const researchConfig = {
  queue: {
    // Maximum time a job can run before timing out (milliseconds)
    jobTimeoutMs: parseInt(process.env.RESEARCH_JOB_TIMEOUT_MS ?? "1800000", 10), // 30 min default

    // Maximum number of retries for failed jobs
    maxRetries: parseInt(process.env.RESEARCH_MAX_RETRIES ?? "3", 10),

    // Initial backoff delay for retries (milliseconds)
    retryBackoffMs: parseInt(process.env.RESEARCH_RETRY_BACKOFF_MS ?? "5000", 10), // 5 sec
  },

  gemini: {
    // Polling interval when waiting for Gemini Deep Research completion (milliseconds)
    pollIntervalMs: parseInt(process.env.GEMINI_POLL_INTERVAL_MS ?? "10000", 10), // 10 sec

    // Maximum number of polling attempts before timing out
    maxPollAttempts: parseInt(process.env.GEMINI_MAX_POLL_ATTEMPTS ?? "120", 10), // 20 min max (120 * 10s)
  },

  frontend: {
    // Frontend polling interval for research status updates (milliseconds)
    statusPollIntervalMs: parseInt(process.env.NEXT_PUBLIC_RESEARCH_POLL_MS ?? "5000", 10), // 5 sec

    // Frontend polling interval for competitor results (milliseconds)
    resultsPollIntervalMs: parseInt(process.env.NEXT_PUBLIC_RESULTS_POLL_MS ?? "10000", 10), // 10 sec
  },
} as const;
