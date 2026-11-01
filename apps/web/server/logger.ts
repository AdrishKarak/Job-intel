import crypto from "crypto";

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  runId: string;
  userId?: string;
  operation: string;
  message: string;
  metadata?: Record<string, any>;
}

export function createRunId(): string {
  return `run_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

const REDACTED_KEYWORDS = [
  "authorization",
  "apikey",
  "api_key",
  "secret",
  "password",
  "pass",
  "token",
  "resumetext",
  "content",
];

export function redactMetadata(data?: Record<string, any>): Record<string, any> | undefined {
  if (!data) return undefined;

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = REDACTED_KEYWORDS.some((kw) => lowerKey.includes(kw));
    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = redactMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  log(level: LogLevel, operation: string, message: string, context?: { runId?: string; userId?: string; metadata?: Record<string, any> }) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: "web",
      runId: context?.runId || createRunId(),
      userId: context?.userId,
      operation,
      message,
      metadata: redactMetadata(context?.metadata),
    };

    const jsonString = JSON.stringify(entry);

    if (level === "error") {
      console.error(jsonString);
    } else if (level === "warn") {
      console.warn(jsonString);
    } else {
      console.log(jsonString);
    }
  },

  info(operation: string, message: string, context?: { runId?: string; userId?: string; metadata?: Record<string, any> }) {
    this.log("info", operation, message, context);
  },

  warn(operation: string, message: string, context?: { runId?: string; userId?: string; metadata?: Record<string, any> }) {
    this.log("warn", operation, message, context);
  },

  error(operation: string, message: string, context?: { runId?: string; userId?: string; metadata?: Record<string, any> }) {
    this.log("error", operation, message, context);
  },
};
