# Requirements Document

## Introduction

このシステムは、Model Context Protocol (MCP)サーバーとして実装され、POSSEのDiscordサーバーから情報を取得する機能を提供します。KiroやClaude DesktopなどのMCPクライアントから、構造化されたツールを通じてDiscord情報にアクセスできます。

## Glossary

- **System**: Discord POSSE MCP Server - MCPプロトコルを実装し、Discord APIへのアクセスを提供するサーバー
- **MCP Client**: KiroやClaude DesktopなどのModel Context Protocolをサポートするクライアントアプリケーション
- **MCP Tool**: MCPサーバーが提供する構造化された機能（メッセージ検索、ユーザー情報取得など）
- **Discord API**: Discordサーバーのデータにアクセスするための公式API
- **POSSE Discord Server**: 情報取得の対象となる特定のDiscordサーバー
- **Tool Result**: Discord APIから取得され、MCPクライアントに返される構造化データ
- **Channel Name**: チャンネルの表示名（例: "general", "announcements"）
- **Channel ID**: Discordが内部的に使用するチャンネルの一意識別子
- **Thread**: チャンネル内の会話スレッド
- **Date Range**: 開始日時と終了日時で定義される期間

## Requirements

### Requirement 1

**User Story:** As an MCP Client, I want to discover available Discord tools, so that I can understand what operations are supported

#### Acceptance Criteria

1. THE System SHALL implement the MCP protocol specification version 2024-11-05
2. WHEN an MCP Client requests tool list, THE System SHALL return all available Discord tools with descriptions
3. THE System SHALL provide tool schemas using JSON Schema format
4. THE System SHALL support the tools/list MCP method
5. THE System SHALL respond to tool discovery requests within 2 seconds

### Requirement 2

**User Story:** As an MCP Client, I want to search Discord messages, so that I can retrieve relevant conversation history

#### Acceptance Criteria

1. THE System SHALL provide a search_messages tool
2. WHEN the search_messages tool is called with a query parameter, THE System SHALL search messages in the POSSE Discord Server
3. THE System SHALL accept optional parameters for channel_id and limit
4. THE System SHALL return message content, author information, timestamp, and channel name
5. WHEN the limit parameter is provided, THE System SHALL return no more than the specified number of messages with a maximum of 50

### Requirement 3

**User Story:** As an MCP Client, I want to retrieve user information, so that I can get details about Discord server members

#### Acceptance Criteria

1. THE System SHALL provide a get_user_info tool
2. WHEN the get_user_info tool is called with a username or user_id parameter, THE System SHALL retrieve user information from Discord API
3. THE System SHALL return username, discriminator, avatar URL, roles, join date, and current status
4. IF the specified user is not found, THEN THE System SHALL return an error with status code 404
5. THE System SHALL complete user information retrieval within 5 seconds

### Requirement 4

**User Story:** As an MCP Client, I want to get channel information, so that I can understand the server structure

#### Acceptance Criteria

1. THE System SHALL provide a get_channel_info tool
2. WHEN the get_channel_info tool is called with a channel_id parameter, THE System SHALL retrieve channel metadata
3. THE System SHALL return channel name, type, topic, member count, and creation date
4. THE System SHALL support text channels, voice channels, and category channels
5. IF the specified channel is not found, THEN THE System SHALL return an error with status code 404

### Requirement 5

**User Story:** As an MCP Client, I want to get server statistics, so that I can understand the overall server activity

#### Acceptance Criteria

1. THE System SHALL provide a get_server_stats tool
2. WHEN the get_server_stats tool is called, THE System SHALL retrieve POSSE Discord Server statistics
3. THE System SHALL return total member count, online member count, channel count, role count, and server creation date
4. THE System SHALL calculate statistics in real-time from Discord API
5. THE System SHALL complete statistics retrieval within 5 seconds

### Requirement 6

**User Story:** As a System Administrator, I want the MCP server to authenticate with Discord securely, so that it can access POSSE Discord Server information

#### Acceptance Criteria

1. THE System SHALL authenticate with Discord API using a bot token
2. THE System SHALL load the bot token from environment variables
3. THE System SHALL validate the bot token on startup
4. IF the bot token is invalid or missing, THEN THE System SHALL log an error and exit with status code 1
5. THE System SHALL request only the minimum required Discord API permissions for read operations

### Requirement 7

**User Story:** As an MCP Client, I want to receive structured error messages, so that I can handle failures appropriately

#### Acceptance Criteria

1. WHEN a Discord API call fails, THE System SHALL return an MCP error response with error code and message
2. IF rate limits are exceeded, THEN THE System SHALL return error code -32000 with retry_after information
3. IF authentication fails, THEN THE System SHALL return error code -32001 with authentication error details
4. THE System SHALL log all errors with timestamps and error details for debugging purposes
5. THE System SHALL include the original Discord API error message in the MCP error response when available

### Requirement 8

**User Story:** As an MCP Client, I want to list all channels in the server, so that I can discover available channels without knowing their IDs

#### Acceptance Criteria

1. THE System SHALL provide a list_channels tool
2. WHEN the list_channels tool is called, THE System SHALL return all channels in the POSSE Discord Server
3. THE System SHALL return channel ID, name, type, and parent category for each channel
4. THE System SHALL support filtering by channel type through an optional type parameter
5. THE System SHALL complete channel listing within 3 seconds

### Requirement 9

**User Story:** As an MCP Client, I want to search messages by channel name instead of channel ID, so that I can use natural language queries

#### Acceptance Criteria

1. THE System SHALL accept a channel_name parameter in the search_messages tool
2. WHEN channel_name is provided, THE System SHALL resolve the channel name to channel ID
3. IF multiple channels have the same name, THEN THE System SHALL search in all matching channels
4. IF the channel name is not found, THEN THE System SHALL return an error with status code 404
5. THE System SHALL support both channel_id and channel_name parameters with channel_id taking precedence

### Requirement 10

**User Story:** As an MCP Client, I want to search messages within a date range, so that I can find historical conversations

#### Acceptance Criteria

1. THE System SHALL accept optional after and before parameters in the search_messages tool
2. WHEN after parameter is provided, THE System SHALL return only messages sent after the specified timestamp
3. WHEN before parameter is provided, THE System SHALL return only messages sent before the specified timestamp
4. THE System SHALL accept ISO 8601 formatted date strings for date parameters
5. THE System SHALL validate that after timestamp is earlier than before timestamp

### Requirement 11

**User Story:** As an MCP Client, I want to search messages by author, so that I can find all messages from a specific user

#### Acceptance Criteria

1. THE System SHALL accept an optional author_id parameter in the search_messages tool
2. WHEN author_id is provided, THE System SHALL return only messages from the specified user
3. THE System SHALL accept an optional author_name parameter as an alternative to author_id
4. WHEN author_name is provided, THE System SHALL resolve the username to user ID
5. THE System SHALL support combining author filters with query and date range filters

### Requirement 12

**User Story:** As an MCP Client, I want to search messages in threads, so that I can find conversations within thread discussions

#### Acceptance Criteria

1. THE System SHALL search both channel messages and thread messages by default
2. THE System SHALL accept an optional include_threads parameter in the search_messages tool
3. WHEN include_threads is set to false, THE System SHALL exclude thread messages from search results
4. THE System SHALL include thread name and parent message information in thread message results
5. THE System SHALL complete thread message searches within 10 seconds

### Requirement 13

**User Story:** As an MCP Client, I want to get message statistics for a channel, so that I can analyze channel activity

#### Acceptance Criteria

1. THE System SHALL provide a get_channel_activity tool
2. WHEN the get_channel_activity tool is called with a channel_id or channel_name parameter, THE System SHALL return activity statistics
3. THE System SHALL return total message count, active user count, and messages per day average
4. THE System SHALL accept optional after and before parameters to limit the analysis period
5. THE System SHALL complete activity analysis within 15 seconds

### Requirement 14

**User Story:** As an MCP Client, I want to list members by role, so that I can find users with specific permissions

#### Acceptance Criteria

1. THE System SHALL provide a list_members_by_role tool
2. WHEN the list_members_by_role tool is called with a role_name parameter, THE System SHALL return all members with that role
3. THE System SHALL return user ID, username, display name, and join date for each member
4. THE System SHALL support case-insensitive role name matching
5. IF the role is not found, THEN THE System SHALL return an error with status code 404

### Requirement 15

**User Story:** As an MCP Client, I want to get recent messages from a channel, so that I can see the latest activity without searching

#### Acceptance Criteria

1. THE System SHALL provide a get_recent_messages tool
2. WHEN the get_recent_messages tool is called with a channel_id or channel_name parameter, THE System SHALL return recent messages
3. THE System SHALL accept an optional limit parameter with a default of 20 and maximum of 100
4. THE System SHALL return messages in reverse chronological order
5. THE System SHALL complete message retrieval within 5 seconds
