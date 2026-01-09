# アーキテクチャ概要

このドキュメントでは、Workspace Chronicle のコードベース構成と主要コンポーネントについて説明します。

## ディレクトリ構成

```
src/
├── extension.ts          # 拡張機能のエントリーポイント
├── fs.ts                 # ファイルシステムユーティリティ
├── commands/             # VS Code コマンドの実装
├── store/                # データ永続化レイヤー
├── tree/                 # ツリービュープロバイダー
└── test/                 # テストファイル
    └── suite/            # テストスイート設定
```

## 主要コンポーネント

### エントリーポイント

**`src/extension.ts`**

拡張機能がアクティベートされたときに VS Code が呼び出すメインエントリーポイント。コマンド、ツリービュー、ストアの登録・初期化を行います。

### コマンド (`src/commands/`)

各ファイルが 1 つ以上の VS Code コマンドを実装：

| ファイル | コマンド |
|---------|----------|
| `openWorkspace.ts` | ワークスペースを新規/既存ウィンドウで開く |
| `setLabel.ts` | ワークスペースのカスタム名を設定 |
| `setColor.ts` | ワークスペースの色タグを設定 |
| `setColorAlias.ts` | 色の表示名を設定 |
| `setOpenMode.ts` | デフォルトのオープンモードを設定 |
| `filterByTag.ts` | ラベル/色でワークスペースをフィルタ |
| `filterHistory.ts` | キーワードで履歴をフィルタ |
| `clearFilters.ts` | すべてのフィルタをクリア |
| `copyFullPath.ts` | ワークスペースのパスをクリップボードにコピー |
| `openRecent.ts` | 最近のワークスペースをクイックオープン |
| `configureRoots.ts` | ルートディレクトリの追加/削除/一覧 |
| `exportImport.ts` | データのエクスポート/インポート |

### ストア (`src/store/`)

JSON ファイルを使用した永続データストレージ：

| ストア | 用途 |
|-------|------|
| `FileStore.ts` | JSON ファイルストレージの基底クラス |
| `HistoryStore.ts` | ワークスペースのオープン履歴 |
| `MetaStore.ts` | ワークスペースのメタデータ（ラベル、色） |
| `ColorAliasStore.ts` | 色のカスタム表示名 |
| `WorkspaceFilesStore.ts` | キャッシュされたスキャン結果 |

データはプラットフォーム固有の場所に保存：
- Windows: `%APPDATA%\workspace-chronicle\`
- macOS: `~/Library/Application Support/workspace-chronicle/`
- Linux: `~/.local/share/workspace-chronicle/`

### ツリービュー (`src/tree/`)

VS Code ツリービューの実装：

| ファイル | 説明 |
|---------|------|
| `WorkspacesProvider.ts` | Workspaces ツリービュー（発見された `.code-workspace` ファイル） |
| `HistoryProvider.ts` | Workspace History ツリービュー |
| `workspaceScanner.ts` | ディレクトリをスキャンして `.code-workspace` ファイルを検索 |
| `scanGating.ts` | スキャンを実行するかどうかを制御 |

### ユーティリティ

**`src/fs.ts`**

クロスプラットフォームのパス処理とファイル操作のためのユーティリティ。

## データフロー

```
ユーザーアクション
    │
    ▼
コマンドハンドラ (src/commands/)
    │
    ├─── 読み書き ──► ストア (src/store/)
    │                    │
    │                    ▼
    │                 JSON ファイル（プラットフォームデータディレクトリ）
    │
    └─── リフレッシュ ──► ツリープロバイダ (src/tree/)
                            │
                            ▼
                        VS Code ツリービュー
```

## 主要パターン

### ストアパターン

すべてのストアは `FileStore<T>` を継承し、以下を提供：
- JSON シリアライズ/デシリアライズ
- アトミックなファイル書き込み
- 遅延読み込み

### ツリービューパターン

ツリープロバイダは `vscode.TreeDataProvider<T>` を実装：
- `getTreeItem()` - アイテムの表示情報を返す
- `getChildren()` - 子アイテムを返す
- `refresh()` - ツリービューの更新をトリガー

### スキャンゲーティング

`scanGating.ts` は以下に基づいてスキャンを実行するかどうかを決定：
- 現在のワークスペースタイプ（フォルダ、`.code-workspace`、空）
- ユーザー設定（`scanWhenWorkspaceFileOpen`、`scanWhenNoFolderOpen`）

## 拡張機能のアクティベーション

拡張機能は以下のタイミングでアクティベート：
- ツリービューが表示されたとき（`onView:workspaceChronicle.*`）
- コマンドが実行されたとき（`onCommand:workspaceChronicle.*`）

完全なリストは `package.json` → `activationEvents` を参照。

## 設定

すべての設定は `package.json` → `contributes.configuration` で定義。主な設定：

- `workspaceChronicle.roots` - スキャン対象ディレクトリ
- `workspaceChronicle.defaultOpenMode` - 新規ウィンドウ or 既存ウィンドウ
- `workspaceChronicle.historyLimit` - 履歴の最大件数
- `workspaceChronicle.scan*` - スキャン動作オプション
