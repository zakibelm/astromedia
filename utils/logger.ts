type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    endpoint?: string;
    method?: string;
    statusCode?: number;
    duration?: number;
    [key: string]: unknown;
}

class Logger {
    private isDev = import.meta.env.DEV;

    log(level: LogLevel, message: string, context?: LogContext) {
        if (!this.isDev && level === 'debug') return;

        const timestamp = new Date().toISOString();
        const logData = {
            timestamp,
            level,
            message,
            ...context,
        };

        switch (level) {
            case 'error':
                console.error(`[${timestamp}] ${message}`, context);
                break;
            case 'warn':
                console.warn(`[${timestamp}] ${message}`, context);
                break;
            default:
                console.log(`[${timestamp}] ${message}`, context);
        }
    }

    debug(message: string, context?: LogContext) {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext) {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext) {
        this.log('warn', message, context);
    }

    error(message: string, context?: LogContext) {
        this.log('error', message, context);
    }
}

export const logger = new Logger();
