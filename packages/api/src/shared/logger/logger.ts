export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  child(context: LogContext): ILogger;
}

export class Logger implements ILogger {
  private baseContext: LogContext;
  private minLevel: LogLevel;
  private readonly levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(baseContext: LogContext = {}, minLevel: LogLevel = "info") {
    this.baseContext = baseContext;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    const mergedContext = { ...this.baseContext, ...context };
    if (Object.keys(mergedContext).length > 0) {
      entry.context = mergedContext;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private write(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog("debug")) {
      this.write(this.formatEntry("debug", message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog("info")) {
      this.write(this.formatEntry("info", message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog("warn")) {
      this.write(this.formatEntry("warn", message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog("error")) {
      this.write(this.formatEntry("error", message, context, error));
    }
  }

  child(context: LogContext): ILogger {
    return new Logger({ ...this.baseContext, ...context }, this.minLevel);
  }
}

export const logger = new Logger(
  {},
  process.env.NODE_ENV === "production" ? "info" : "debug"
);
