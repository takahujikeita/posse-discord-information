# Discord POSSE MCP Server

POSSE の Discord サーバー情報にアクセスするための Model Context Protocol (MCP)サーバーです。Kiro や Claude Desktop などの MCP クライアントから、構造化されたツールを通じて Discord 情報を取得できます。

## 概要

この MCP サーバーは、以下の機能を提供します：

### 基本機能

- **メッセージ検索** (`search_messages`): Discord サーバー内のメッセージを高度な検索（日付範囲、作成者、チャンネル名、スレッド対応）
- **ユーザー情報取得** (`get_user_info`): サーバーメンバーの詳細情報を取得
- **チャンネル情報取得** (`get_channel_info`): チャンネルのメタデータを取得
- **サーバー統計取得** (`get_server_stats`): サーバー全体の統計情報を取得

### 拡張機能

- **チャンネル一覧取得** (`list_channels`): サーバー内の全チャンネルを一覧表示（タイプ別フィルタリング対応）
- **最近のメッセージ取得** (`get_recent_messages`): チャンネルの最新メッセージを取得
- **チャンネルアクティビティ分析** (`get_channel_activity`): チャンネルの活動統計を分析
- **ロール別メンバー一覧** (`list_members_by_role`): 特定のロールを持つメンバーを一覧表示

## 主な機能

### チャンネル名での検索

チャンネル ID の代わりにチャンネル名を使用できます。例えば：

- `channel_name: "general"` - チャンネル名で指定
- `channel_id: "123456789"` - チャンネル ID で指定（従来通り）

チャンネル名は大文字小文字を区別せず、同じ名前の複数チャンネルがある場合は全て検索されます。

### 日付範囲フィルタ

メッセージ検索で日付範囲を指定できます：

- `after: "2024-01-01T00:00:00Z"` - この日時以降のメッセージ
- `before: "2024-12-31T23:59:59Z"` - この日時以前のメッセージ

ISO 8601 形式の日時文字列を使用します。

### 作成者フィルタ

特定のユーザーが投稿したメッセージのみを検索できます：

- `author_name: "John"` - ユーザー名で指定
- `author_id: "123456789"` - ユーザー ID で指定

### スレッド検索

デフォルトでチャンネル内のスレッドも検索対象に含まれます。スレッドを除外する場合は `include_threads: false` を指定します。

### アクティビティ分析

チャンネルの活動状況を詳細に分析できます：

- 総メッセージ数とアクティブユーザー数
- 1日あたりの平均メッセージ数
- トップ投稿者（上位5名）
- ピーク時間帯（時間別の投稿数）

## 技術スタック

- **Node.js** 18 以上
- **TypeScript**
- **@modelcontextprotocol/sdk**: MCP プロトコル実装
- **discord.js**: Discord API クライアント

## セットアップ手順

### 前提条件

- Node.js 18 以上がインストールされていること
- Discord アカウント
- 対象の Discord サーバーへの管理者権限

### 1. Discord Bot の作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にアクセス
2. 「New Application」をクリックして新しいアプリケーションを作成
3. アプリケーション名を入力（例: "POSSE MCP Bot"）

### 2. Bot の設定

1. 左側のメニューから「Bot」タブを選択
2. 「Add Bot」をクリックして Bot を作成
3. 「Reset Token」をクリックして Bot Token を生成
4. **Bot Token をコピーして安全な場所に保存**（後で環境変数に設定します）

### 3. Bot 権限の設定

「Bot」タブで以下の設定を行います：

**Privileged Gateway Intents:**

- ✅ **Presence Intent** (オプション - ユーザーのオンライン状態を取得する場合)
- ✅ **Server Members Intent** (必須 - メンバー情報を取得するため)
- ✅ **Message Content Intent** (必須 - メッセージ内容を読み取るため)

### 4. OAuth2 URL の生成と Bot の招待

1. 左側のメニューから「OAuth2」→「URL Generator」を選択
2. **Scopes**で以下を選択：
   - ✅ `bot`
3. **Bot Permissions**で以下を選択：
   - ✅ `Read Messages/View Channels`
   - ✅ `Read Message History`
   - ✅ `View Server Insights` (サーバー統計情報用)
4. 生成された URL をコピーしてブラウザで開く
5. 対象の Discord サーバーを選択して Bot を招待

### 5. Guild ID の取得

1. Discord アプリで「ユーザー設定」→「詳細設定」→「開発者モード」を有効化
2. サーバーリストで対象のサーバーを右クリック
3. 「ID をコピー」を選択
4. **Guild ID を保存**（後で環境変数に設定します）

### 6. プロジェクトのセットアップ

```bash
# 依存関係のインストール
npm install

# 環境変数ファイルの作成
cp .env.example .env
```

### 7. 環境変数の設定

`.env`ファイルを編集して以下の値を設定：

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
```

**重要な設定項目：**

- `DISCORD_BOT_TOKEN`: Discord Developer Portal で取得した Bot Token
- `DISCORD_GUILD_ID`: 対象の Discord サーバーの ID

⚠️ **セキュリティ注意事項:**

- `.env`ファイルは絶対に Git にコミットしないでください
- Bot Token は秘密情報として扱い、他人と共有しないでください

## ビルドと実行

### 開発モード

TypeScript の watch モードで開発：

```bash
npm run dev
```

### 本番ビルド

```bash
# TypeScriptをコンパイル
npm run build

# ビルドされたサーバーを起動
npm start
```

ビルドされたファイルは`build/`ディレクトリに出力されます。

## MCP クライアントとの統合

### Kiro での設定

`.kiro/settings/mcp.json`ファイルに以下を追加：

```json
{
  "mcpServers": {
    "discord-posse": {
      "command": "node",
      "args": [
        "/absolute/path/to/discord-posse-query/mcp-server/build/index.js"
      ],
      "env": {
        "DISCORD_BOT_TOKEN": "your_bot_token_here",
        "DISCORD_GUILD_ID": "your_guild_id_here"
      }
    }
  }
}
```

**注意:**

- `args`の最初の要素は、ビルドされた`index.js`への絶対パスを指定してください
- パスの例: macOS の場合 `/Users/username/projects/discord-posse-query/mcp-server/build/index.js`
- 現在のディレクトリの絶対パスを確認するには: `pwd` コマンドを実行

### Claude Desktop での設定

Claude Desktop の設定ファイル（場所は OS によって異なります）に以下を追加：

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "discord-posse": {
      "command": "node",
      "args": [
        "/absolute/path/to/discord-posse-query/mcp-server/build/index.js"
      ],
      "env": {
        "DISCORD_BOT_TOKEN": "your_bot_token_here",
        "DISCORD_GUILD_ID": "your_guild_id_here"
      }
    }
  }
}
```

**注意:**

- `args`の最初の要素は、ビルドされた`index.js`への絶対パスを指定してください
- パスの例: macOS の場合 `/Users/username/projects/discord-posse-query/mcp-server/build/index.js`

設定後、Claude Desktop を再起動してください。

## 利用可能なツール

### 1. search_messages

Discord サーバー内のメッセージを高度な検索機能で検索します。

**パラメータ:**

- `query` (必須): 検索キーワード
- `channel_id` (オプション): 検索対象のチャンネル ID
- `channel_name` (オプション): 検索対象のチャンネル名（channel_id の代わりに使用可能）
- `author_id` (オプション): メッセージ作成者のユーザー ID でフィルタリング
- `author_name` (オプション): メッセージ作成者のユーザー名でフィルタリング
- `after` (オプション): この日時以降のメッセージのみ取得（ISO 8601 形式）
- `before` (オプション): この日時以前のメッセージのみ取得（ISO 8601 形式）
- `include_threads` (オプション): スレッド内のメッセージも検索するか（デフォルト: true）
- `limit` (オプション): 取得するメッセージ数（デフォルト: 20、最大: 50）

**使用例:**

```
「最近のメッセージを検索して」
「general チャンネルで"会議"というキーワードを含むメッセージを探して」
「先週の announcements チャンネルのメッセージを検索して」
「John が投稿した"プロジェクト"に関するメッセージを探して」
「2024年1月以降の development チャンネルのメッセージを検索」
```

### 2. get_user_info

サーバーメンバーの詳細情報を取得します。

**パラメータ:**

- `username` (オプション): ユーザー名
- `user_id` (オプション): ユーザー ID

**使用例:**

```
「ユーザー名が"John"のユーザー情報を教えて」
「ユーザーID 123456789 の情報を取得して」
```

### 3. get_channel_info

チャンネルのメタデータを取得します。

**パラメータ:**

- `channel_id` (必須): チャンネル ID

**使用例:**

```
「チャンネルID 987654321 の情報を表示して」
```

### 4. get_server_stats

サーバー全体の統計情報を取得します。

**パラメータ:** なし

**使用例:**

```
「サーバーの統計情報を教えて」
「メンバー数とチャンネル数を表示して」
```

### 5. list_channels

サーバー内の全チャンネルを一覧表示します。

**パラメータ:**

- `type` (オプション): チャンネルタイプでフィルタリング（`text`, `voice`, `category`, `announcement`, `forum`）

**使用例:**

```
「サーバーの全チャンネルを表示して」
「テキストチャンネルだけをリストアップして」
「ボイスチャンネルの一覧を教えて」
```

### 6. get_recent_messages

チャンネルの最新メッセージを取得します。

**パラメータ:**

- `channel_id` (オプション): チャンネル ID
- `channel_name` (オプション): チャンネル名（channel_id の代わりに使用可能）
- `limit` (オプション): 取得するメッセージ数（デフォルト: 20、最大: 100）

**使用例:**

```
「general チャンネルの最新メッセージを表示して」
「announcements の最新50件のメッセージを取得して」
```

### 7. get_channel_activity

チャンネルの活動統計を分析します。

**パラメータ:**

- `channel_id` (オプション): チャンネル ID
- `channel_name` (オプション): チャンネル名（channel_id の代わりに使用可能）
- `after` (オプション): 分析開始日時（ISO 8601 形式）
- `before` (オプション): 分析終了日時（ISO 8601 形式）

**返される情報:**

- 総メッセージ数
- アクティブユーザー数
- 1日あたりの平均メッセージ数
- トップ投稿者（上位5名）
- ピーク時間帯（時間別メッセージ数）

**使用例:**

```
「general チャンネルの活動状況を分析して」
「先月の development チャンネルの統計を教えて」
「今週の announcements チャンネルで誰が一番投稿しているか教えて」
```

### 8. list_members_by_role

特定のロールを持つメンバーを一覧表示します。

**パラメータ:**

- `role_name` (必須): ロール名（大文字小文字を区別しない）

**使用例:**

```
「Moderator ロールを持つメンバーを表示して」
「Developer ロールのメンバー一覧を教えて」
```

## 実用例

### 例1: チャンネル名でメッセージを検索

```
「general チャンネルで"ミーティング"を含むメッセージを検索して」
```

内部的に `search_messages` ツールが以下のパラメータで呼び出されます：

```json
{
  "query": "ミーティング",
  "channel_name": "general"
}
```

### 例2: 特定期間のメッセージを検索

```
「先週の announcements チャンネルのメッセージを全て表示して」
```

内部的に：

```json
{
  "query": "",
  "channel_name": "announcements",
  "after": "2024-10-09T00:00:00Z",
  "before": "2024-10-16T23:59:59Z"
}
```

### 例3: 特定ユーザーのメッセージを検索

```
「John が development チャンネルで投稿した"バグ"に関するメッセージを探して」
```

内部的に：

```json
{
  "query": "バグ",
  "channel_name": "development",
  "author_name": "John"
}
```

### 例4: チャンネルのアクティビティを分析

```
「今月の general チャンネルの活動状況を分析して」
```

内部的に `get_channel_activity` ツールが呼び出され、以下の情報が返されます：

- 総メッセージ数: 1,234
- アクティブユーザー数: 45
- 1日あたりの平均メッセージ数: 82
- トップ投稿者: John (234件), Alice (189件), Bob (156件)...
- ピーク時間帯: 14時 (156件), 15時 (142件), 10時 (128件)...

### 例5: ロール別メンバーを確認

```
「Moderator ロールを持つメンバーを全員表示して」
```

内部的に `list_members_by_role` ツールが呼び出され、該当するメンバーの一覧が返されます。

### 例6: 最新のメッセージを取得

```
「announcements チャンネルの最新10件のメッセージを表示して」
```

内部的に：

```json
{
  "channel_name": "announcements",
  "limit": 10
}
```

## エラーハンドリング

MCP サーバーは以下のエラーコードを返します：

| エラーコード | 説明               | 対処方法                         |
| ------------ | ------------------ | -------------------------------- |
| -32000       | レート制限エラー   | `retryAfter`秒待ってから再試行   |
| -32001       | 認証エラー         | Bot Token を確認                 |
| -32002       | 権限エラー         | Bot 権限を確認                   |
| -32003       | Not Found          | 指定されたリソースが存在しません |
| -32004       | Discord API エラー | Discord API の状態を確認         |
| -32602       | 無効なパラメータ   | パラメータを確認                 |

## トラブルシューティング

### Bot Token エラー

**症状:** `Authentication failed` エラーが発生

**解決方法:**

1. `.env`ファイルの`DISCORD_BOT_TOKEN`が正しいか確認
2. Discord Developer Portal で Token を再生成
3. Token の前後に余分なスペースがないか確認

### 権限エラー

**症状:** `Permission denied` エラーが発生

**解決方法:**

1. Discord Developer Portal の「Bot」タブで必要な Intents が有効になっているか確認
2. サーバーで Bot に適切な権限が付与されているか確認
3. Bot を一度サーバーから削除して、正しい権限で再招待

### メッセージが取得できない

**症状:** メッセージ検索で結果が返ってこない

**解決方法:**

1. 「Message Content Intent」が有効になっているか確認
2. Bot がチャンネルを閲覧できる権限を持っているか確認
3. チャンネル ID が正しいか確認

### レート制限

**症状:** `Rate limit exceeded` エラーが発生

**解決方法:**

- エラーレスポンスの`retryAfter`フィールドに示された秒数待ってから再試行
- 短時間に大量のリクエストを送信しないように注意

## 開発

### プロジェクト構造

```
mcp-server/
├── src/
│   ├── index.ts                    # MCPサーバーのエントリーポイント
│   ├── handlers/                   # ツールハンドラー
│   │   ├── searchMessages.ts      # メッセージ検索（拡張機能付き）
│   │   ├── getUserInfo.ts         # ユーザー情報取得
│   │   ├── getChannelInfo.ts      # チャンネル情報取得
│   │   ├── getServerStats.ts      # サーバー統計取得
│   │   ├── listChannels.ts        # チャンネル一覧取得
│   │   ├── getRecentMessages.ts   # 最近のメッセージ取得
│   │   ├── getChannelActivity.ts  # チャンネルアクティビティ分析
│   │   └── listMembersByRole.ts   # ロール別メンバー一覧
│   ├── services/                   # Discord API統合
│   │   └── discordService.ts      # Discord API統合（チャンネル名解決機能付き）
│   ├── types/                      # TypeScript型定義
│   │   └── index.ts
│   └── utils/                      # ユーティリティ
│       └── errors.ts
├── build/                          # コンパイル済みJavaScript
├── .env                            # 環境変数（Gitにコミットしない）
├── .env.example                    # 環境変数のテンプレート
├── package.json
├── tsconfig.json
└── README.md
```

### コードの変更

1. `src/`ディレクトリ内の TypeScript ファイルを編集
2. `npm run dev`で watch モードを起動（自動再コンパイル）
3. MCP クライアントでテスト

## ライセンス

MIT

## サポート

問題が発生した場合は、以下を確認してください：

1. Node.js のバージョンが 18 以上であること
2. すべての依存関係がインストールされていること（`npm install`）
3. `.env`ファイルが正しく設定されていること
4. Discord Bot がサーバーに Invite されていること
5. 必要な権限と Intents が有効になっていること

それでも解決しない場合は、Issue を作成してください。
