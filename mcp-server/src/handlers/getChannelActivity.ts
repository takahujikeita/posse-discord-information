/**
 * Handler for get_channel_activity tool
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { DiscordService } from '../services/discordService.js';
import { MCPErrorCode, MCPError } from '../types/index.js';

/**
 * Parameters for get_channel_activity tool
 */
interface GetChannelActivityParams {
  channel_id?: string;
  channel_name?: string;
  after?: string;
  before?: string;
}

/**
 * Handle get_channel_activity tool call
 * @param discordService - Discord service instance
 * @param params - Tool parameters
 * @returns Tool result with channel activity statistics
 */
export async function handleGetChannelActivity(
  discordService: DiscordService,
  params: GetChannelActivityParams
): Promise<CallToolResult> {
  try {
    // Validate parameters
    const { channel_id, channel_name, after, before } = params;

    if (!channel_id && !channel_name) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: MCPErrorCode.INVALID_PARAMS,
              message: 'Missing required parameter',
              data: {
                details: 'Either channel_id or channel_name must be provided',
              },
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Resolve channel ID from channel name if needed
    let channelId = channel_id;
    if (!channelId && channel_name) {
      const channelIds = await discordService.resolveChannelId(channel_name);
      if (channelIds.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: MCPErrorCode.NOT_FOUND_ERROR,
                message: 'Channel not found',
                data: {
                  details: `No channel found with name: ${channel_name}`,
                },
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
      // Use the first matching channel if multiple found
      channelId = channelIds[0];
    }

    // Parse date parameters
    let afterDate: Date | undefined;
    let beforeDate: Date | undefined;

    if (after) {
      afterDate = new Date(after);
      if (isNaN(afterDate.getTime())) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: MCPErrorCode.INVALID_PARAMS,
                message: 'Invalid date format',
                data: {
                  details: 'after parameter must be a valid ISO 8601 date string',
                },
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    if (before) {
      beforeDate = new Date(before);
      if (isNaN(beforeDate.getTime())) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                code: MCPErrorCode.INVALID_PARAMS,
                message: 'Invalid date format',
                data: {
                  details: 'before parameter must be a valid ISO 8601 date string',
                },
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    }

    // Validate date range
    if (afterDate && beforeDate && afterDate >= beforeDate) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              code: MCPErrorCode.INVALID_PARAMS,
              message: 'Invalid date range',
              data: {
                details: 'after date must be earlier than before date',
              },
            }, null, 2),
          },
        ],
        isError: true,
      };
    }

    // Get channel activity
    const activity = await discordService.getChannelActivity(
      channelId!,
      afterDate,
      beforeDate
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(activity, null, 2),
        },
      ],
    };
  } catch (error: any) {
    // Handle MCP errors
    if (error.code) {
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
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            code: MCPErrorCode.INTERNAL_ERROR,
            message: 'Internal server error',
            data: {
              details: error instanceof Error ? error.message : 'Unknown error occurred',
            },
          }, null, 2),
        },
      ],
      isError: true,
    };
  }
}
