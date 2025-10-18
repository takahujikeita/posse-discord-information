/**
 * Error handling utilities for Discord POSSE MCP Server
 */

import { MCPError, MCPErrorCode } from '../types/index.js';

/**
 * Create a generic MCP error
 */
export function createError(
  code: MCPErrorCode,
  message: string,
  data?: MCPError['data']
): MCPError {
  return {
    code,
    message,
    data,
  };
}

/**
 * Create a rate limit error
 */
export function createRateLimitError(retryAfter: number, details?: string): MCPError {
  return createError(
    MCPErrorCode.RATE_LIMIT_ERROR,
    'Rate limit exceeded',
    {
      details: details || 'Discord API rate limit reached',
      retryAfter,
    }
  );
}

/**
 * Create an authentication error
 */
export function createAuthError(details?: string): MCPError {
  return createError(
    MCPErrorCode.AUTHENTICATION_ERROR,
    'Authentication failed',
    {
      details: details || 'Invalid or missing Discord bot token',
    }
  );
}

/**
 * Create a permission error
 */
export function createPermissionError(
  requiredPermissions: string[],
  details?: string
): MCPError {
  return createError(
    MCPErrorCode.PERMISSION_ERROR,
    'Insufficient permissions',
    {
      details: details || 'Bot lacks required permissions',
      requiredPermissions,
    }
  );
}

/**
 * Create a not found error
 */
export function createNotFoundError(resource: string, details?: string): MCPError {
  return createError(
    MCPErrorCode.NOT_FOUND_ERROR,
    `${resource} not found`,
    {
      details: details || `The requested ${resource} does not exist`,
    }
  );
}

/**
 * Create a Discord API error
 */
export function createDiscordApiError(details: string): MCPError {
  return createError(
    MCPErrorCode.DISCORD_API_ERROR,
    'Discord API error',
    {
      details,
    }
  );
}

/**
 * Create an invalid params error
 */
export function createInvalidParamsError(details: string): MCPError {
  return createError(
    MCPErrorCode.INVALID_PARAMS,
    'Invalid parameters',
    {
      details,
    }
  );
}

/**
 * Create an internal error
 */
export function createInternalError(details?: string): MCPError {
  return createError(
    MCPErrorCode.INTERNAL_ERROR,
    'Internal server error',
    {
      details: details || 'An unexpected error occurred',
    }
  );
}

/**
 * Error logger for tracking and debugging errors
 */
export class ErrorLogger {
  /**
   * Log an error with context information
   */
  log(
    error: MCPError,
    context: {
      tool?: string;
      params?: any;
      timestamp?: Date;
    }
  ): void {
    const timestamp = context.timestamp || new Date();
    
    const logEntry = {
      timestamp: timestamp.toISOString(),
      tool: context.tool,
      errorCode: error.code,
      message: error.message,
      details: error.data,
      params: this.sanitizeParams(context.params),
    };

    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * Sanitize parameters to remove sensitive information
   */
  private sanitizeParams(params: any): any {
    if (!params) return undefined;

    const sanitized = { ...params };
    
    // Remove any potential sensitive fields
    const sensitiveFields = ['token', 'password', 'secret', 'apiKey'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>): void {
    console.warn(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...context,
    }, null, 2));
  }

  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>): void {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...context,
    }, null, 2));
  }
}

/**
 * Global error logger instance
 */
export const errorLogger = new ErrorLogger();

/**
 * Rate limit handler for Discord API
 */
export class RateLimitHandler {
  /**
   * Check if an error is a rate limit error from Discord API
   */
  isRateLimitError(error: any): boolean {
    // Discord.js rate limit errors typically have code 429 or specific error codes
    if (error?.code === 429) return true;
    if (error?.httpStatus === 429) return true;
    if (error?.message?.toLowerCase().includes('rate limit')) return true;
    
    return false;
  }

  /**
   * Extract retry-after information from Discord API error
   */
  extractRetryAfter(error: any): number {
    // Try to extract retry_after from various possible locations
    if (error?.retry_after) {
      return typeof error.retry_after === 'number' 
        ? error.retry_after 
        : parseFloat(error.retry_after);
    }
    
    if (error?.retryAfter) {
      return typeof error.retryAfter === 'number'
        ? error.retryAfter
        : parseFloat(error.retryAfter);
    }

    // Check in error response data
    if (error?.response?.data?.retry_after) {
      return parseFloat(error.response.data.retry_after);
    }

    // Check headers for Retry-After
    if (error?.response?.headers?.['retry-after']) {
      return parseFloat(error.response.headers['retry-after']);
    }

    // Default to 60 seconds if we can't determine
    return 60;
  }

  /**
   * Handle a rate limit error and return appropriate MCP error
   */
  handleRateLimitError(error: any): MCPError {
    const retryAfter = this.extractRetryAfter(error);
    const details = error?.message || 'Discord API rate limit exceeded';
    
    return createRateLimitError(retryAfter, details);
  }

  /**
   * Check if we should retry an operation after a rate limit
   */
  shouldRetry(retryAfter: number, maxRetryTime: number = 300): boolean {
    // Don't retry if the wait time is too long (default: 5 minutes)
    return retryAfter <= maxRetryTime;
  }
}

/**
 * Global rate limit handler instance
 */
export const rateLimitHandler = new RateLimitHandler();
