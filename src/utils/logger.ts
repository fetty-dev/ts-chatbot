/**
 * @file Production-ready logging utility with structured output
 * Provides type-safe, environment-aware logging for debugging and monitoring.
 * Design principles:
 * - Zero dependencies to avoid bloat
 * - Structured JSON output for easy parsing
 * - Environment-based log levels
 * - Rich context support for debugging
 * - Performance optimized (level checks before string formatting)
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1, 
    WARN = 2,
    ERROR = 3
}

export interface LogContext {
    userId?: string;
    guildId?: string;
    messageId?: string;
    operation?: string;
    tokens?: number;
    relationshipLevel?: number;
    duration?: number;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    context?: LogContext;
    error?: {
        message: string;
        stack?: string;
        name: string;
    };
}

class Logger {
    private readonly currentLevel: LogLevel;
    
    constructor() {
        // Production: INFO+, Development: DEBUG+, Test: WARN+ 
        this.currentLevel = this.getLogLevel();
    }
    
    private getLogLevel(): LogLevel {
        const env = process.env.NODE_ENV;
        const level = process.env.LOG_LEVEL;
        
        if (level) {
            switch (level.toUpperCase()) {
                case 'DEBUG': return LogLevel.DEBUG;
                case 'INFO': return LogLevel.INFO;
                case 'WARN': return LogLevel.WARN;
                case 'ERROR': return LogLevel.ERROR;
            }
        }
        
        // Environment-based defaults
        switch (env) {
            case 'test': return LogLevel.WARN;
            case 'production': return LogLevel.INFO;
            default: return LogLevel.DEBUG; // development
        }
    }
    
    private formatError(error: Error): LogEntry['error'] {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack
        };
    }
    
    private createLogEntry(level: string, message: string, context?: LogContext, error?: Error): LogEntry {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message
        };
        
        if (context && Object.keys(context).length > 0) {
            entry.context = context;
        }
        
        if (error) {
            entry.error = this.formatError(error);
        }
        
        return entry;
    }
    
    private shouldLog(level: LogLevel): boolean {
        return level >= this.currentLevel;
    }
    
    private output(level: LogLevel, logEntry: LogEntry): void {
        const output = JSON.stringify(logEntry);
        
        switch (level) {
            case LogLevel.ERROR:
                console.error(output);
                break;
            case LogLevel.WARN:
                console.warn(output);
                break;
            default:
                console.log(output);
        }
    }
    
    debug(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.DEBUG)) {
            this.output(LogLevel.DEBUG, this.createLogEntry('DEBUG', message, context));
        }
    }
    
    info(message: string, context?: LogContext): void {
        if (this.shouldLog(LogLevel.INFO)) {
            this.output(LogLevel.INFO, this.createLogEntry('INFO', message, context));
        }
    }
    
    warn(message: string, context?: LogContext, error?: Error): void {
        if (this.shouldLog(LogLevel.WARN)) {
            this.output(LogLevel.WARN, this.createLogEntry('WARN', message, context, error));
        }
    }
    
    error(message: string, context?: LogContext, error?: Error): void {
        if (this.shouldLog(LogLevel.ERROR)) {
            this.output(LogLevel.ERROR, this.createLogEntry('ERROR', message, context, error));
        }
    }
    
    // High-level operations for consistent logging patterns
    startOperation(operation: string, context?: LogContext): void {
        this.debug(`Starting ${operation}`, { ...context, operation });
    }
    
    endOperation(operation: string, context?: LogContext): void {
        this.debug(`Completed ${operation}`, { ...context, operation });
    }
    
    // Bot-specific convenience methods
    messageProcessed(userId: string, guildId: string, tokens: number, success: boolean): void {
        this.info('Message processed', {
            userId,
            guildId,
            tokens,
            success,
            operation: 'messageProcess'
        });
    }
    
    apiCall(service: string, success: boolean, duration?: number, error?: Error): void {
        const level = success ? 'info' : 'error';
        this[level](`${service} API call ${success ? 'succeeded' : 'failed'}`, {
            service,
            success,
            duration,
            operation: 'apiCall'
        }, error);
    }
}

// Export singleton instance
export const logger = new Logger();