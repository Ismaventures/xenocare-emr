/**
 * Logger Utility - Environment-aware logging
 *
 * In development: All logs are output to console
 * In production: Only errors and warnings are logged, debug/info suppressed
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.info('User logged in', { userId: '123' });
 *   logger.error('Payment failed', error);
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isDebug = process.env.DEBUG_PROD === 'true';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (
    message: string,
    error?: Error | unknown,
    context?: LogContext,
  ) => void;
}

/**
 * Format log message with timestamp and level
 */
const formatMessage = (level: LogLevel, message: string): string => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
};

/**
 * Should this log level be output in current environment?
 */
const shouldLog = (level: LogLevel): boolean => {
  // Always log errors
  if (level === 'error') return true;

  // Always log warnings
  if (level === 'warn') return true;

  // In development or debug mode, log everything
  if (isDevelopment || isDebug) return true;

  // In production, suppress debug and info
  return false;
};

/**
 * Create the logger instance
 */
export const logger: Logger = {
  debug: (message: string, context?: LogContext) => {
    if (shouldLog('debug')) {
      if (context) {
        console.debug(formatMessage('debug', message), context);
      } else {
        console.debug(formatMessage('debug', message));
      }
    }
  },

  info: (message: string, context?: LogContext) => {
    if (shouldLog('info')) {
      if (context) {
        console.info(formatMessage('info', message), context);
      } else {
        console.info(formatMessage('info', message));
      }
    }
  },

  warn: (message: string, context?: LogContext) => {
    if (shouldLog('warn')) {
      if (context) {
        console.warn(formatMessage('warn', message), context);
      } else {
        console.warn(formatMessage('warn', message));
      }
    }
  },

  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    if (shouldLog('error')) {
      const formattedMessage = formatMessage('error', message);

      if (error && context) {
        console.error(formattedMessage, error, context);
      } else if (error) {
        console.error(formattedMessage, error);
      } else if (context) {
        console.error(formattedMessage, context);
      } else {
        console.error(formattedMessage);
      }

      // In production, could send to error tracking service here
      // if (typeof window !== 'undefined' && window.Sentry) {
      //   window.Sentry.captureException(error);
      // }
    }
  },
};

/**
 * Create a scoped logger with a prefix
 * Useful for module-specific logging
 *
 * Usage:
 *   const log = createScopedLogger('Billing');
 *   log.info('Invoice created'); // [2025-01-14T...] [INFO] [Billing] Invoice created
 */
export const createScopedLogger = (scope: string): Logger => {
  return {
    debug: (message, context) => logger.debug(`[${scope}] ${message}`, context),
    info: (message, context) => logger.info(`[${scope}] ${message}`, context),
    warn: (message, context) => logger.warn(`[${scope}] ${message}`, context),
    error: (message, error, context) =>
      logger.error(`[${scope}] ${message}`, error, context),
  };
};

export default logger;
