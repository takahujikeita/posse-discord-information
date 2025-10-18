/**
 * Search Messages Tool Handler
 * Handles the search_messages MCP tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from '../services/discordService.js';
import {
  MessageSearchParams,
  MCPErrorCode,
  MCPError,
} from '../types/index.js';

/**
 * Validate search_messages parameters
 */
function validateParams(params: any): { valid: boolean; error?: MCPError } {
  // Check if query is provided and is a string
  if (!params.query || typeof params.query !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'query parameter is required and must be a string',
        },
      },
    };
  }

  // Validate limit if provided
  if (params.limit !== undefined) {
    if (typeof params.limit !== 'number' || params.limit < 1) {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'limit must be a positive number',
          },
        },
      };
    }

    if (params.limit > 50) {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'limit cannot exceed 50',
          },
        },
      };
    }
  }

  // Validate channel_id if provided
  if (params.channel_id !== undefined && typeof params.channel_id !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'channel_id must be a string',
        },
      },
    };
  }

  // Validate channel_name if provided
  if (params.channel_name !== undefined && typeof params.channel_name !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'channel_name must be a string',
        },
      },
    };
  }

  // Validate author_id if provided
  if (params.author_id !== undefined && typeof params.author_id !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'author_id must be a string',
        },
      },
    };
  }

  // Validate author_name if provided
  if (params.author_name !== undefined && typeof params.author_name !== 'string') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'author_name must be a string',
        },
      },
    };
  }

  // Validate after date if provided
  if (params.after !== undefined) {
    if (typeof params.after !== 'string') {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'after must be a string in ISO 8601 format',
          },
        },
      };
    }

    const afterDate = new Date(params.after);
    if (isNaN(afterDate.getTime())) {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'after must be a valid ISO 8601 date string',
          },
        },
      };
    }
  }

  // Validate before date if provided
  if (params.before !== undefined) {
    if (typeof params.before !== 'string') {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'before must be a string in ISO 8601 format',
          },
        },
      };
    }

    const beforeDate = new Date(params.before);
    if (isNaN(beforeDate.getTime())) {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'before must be a valid ISO 8601 date string',
          },
        },
      };
    }
  }

  // Validate date range if both provided
  if (params.after && params.before) {
    const afterDate = new Date(params.after);
    const beforeDate = new Date(params.before);
    
    if (afterDate >= beforeDate) {
      return {
        valid: false,
        error: {
          code: MCPErrorCode.INVALID_PARAMS,
          message: 'Invalid parameters',
          data: {
            details: 'after date must be earlier than before date',
          },
        },
      };
    }
  }

  // Validate include_threads if provided
  if (params.include_threads !== undefined && typeof params.include_threads !== 'boolean') {
    return {
      valid: false,
      error: {
        code: MCPErrorCode.INVALID_PARAMS,
        message: 'Invalid parameters',
        data: {
          details: 'include_threads must be a boolean',
        },
      },
    };
  }

  return { valid: true };
}

/**
 * Handle search_messages tool call
 */
export async function handleSearchMessages(
  discordService: DiscordService,
  params: any
): Promise<CallToolResult> {
  try {
    // Validate parameters
    const validation = validateParams(params);
    if (!validation.valid && validation.error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(validation.error, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Build search parameters
    const searchParams: MessageSearchParams = {
      query: params.query,
      channel_id: params.channel_id,
      channel_name: params.channel_name,
      author_id: params.author_id,
      author_name: params.author_name,
      after: params.after,
      before: params.before,
      include_threads: params.include_threads,
      limit: params.limit || 20,
    };

    // Call Discord service
    const messages = await discordService.searchMessages(searchParams);

    // Check if no messages found
    if (messages.length === 0) {
      const notFoundError: MCPError = {
        code: MCPErrorCode.NOT_FOUND_ERROR,
        message: 'No messages found',
        data: {
          details: `No messages matching query "${params.query}" were found`,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(notFoundError, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Return successful result
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(messages, null, 2),
        },
      ],
    };
  } catch (error: any) {
    // Handle MCP errors from Discord service
    if (error.code && error.message) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(error, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Handle unexpected errors
    const discordError: MCPError = {
      code: MCPErrorCode.DISCORD_API_ERROR,
      message: 'Discord API error',
      data: {
        details: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(discordError, null, 2),
        },
      ],
      isError: true,
    };
  }
}
