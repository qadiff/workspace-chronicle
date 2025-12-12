# Workspace Chronicle

多数の `.code-workspace` を収集して一覧表示し、**新規ウィンドウ（既定）**または**既存ウィンドウ**で開けます。開いた履歴を記録・表示します。

[English](README.en.md)

<!-- GitHub CI / Release -->
[![GitHub release](https://img.shields.io/github/v/release/qadiff/workspace-chronicle?include_prereleases)](https://github.com/qadiff/workspace-chronicle/releases)

<!-- License / PR welcome -->
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/qadiff/workspace-chronicle/pulls)

---

## What's this?

Visual Studio Code で仕事している人向けに、以下の要望を解決するツールです。

- プロジェクトに一発で移動したい
- 急なプロジェクト変更に対応したい
- 最近開いたワークスペースをすぐに見つけたい
- 複数のプロジェクトを頻繁に切り替えたい

---

## スクリーンショット

![DefaultView](docs/images/main.png)

### Workspace 名で右クリックをしたときに表示されるコマンド
![right-click-on-name](docs/images/right-click-on-name.png)

### 名称(label)の変更
![set custom name](docs/images/set-custom-name.gif)

### 色の変更
![set color](docs/images/set-color.gif)

### ヒストリーでの逐次検索
![filter in history](docs/images/filter-in-history.gif)

---

## インストール

### VS Code Marketplace から
1. VS Code を開く
2. 拡張機能パネル（`Ctrl+Shift+X` / `Cmd+Shift+X`）を開く
3. `Workspace Chronicle` を検索
4. **Install** をクリック


> おすすめ: [Auto Workspace Creator](https://marketplace.visualstudio.com/items?itemName=nickmcdowall.auto-workspace) と併用すると、ワークスペースファイルの自動生成もできて便利です。

---

## Quick Start

1. 設定 → `workspaceChronicle.roots` に `.code-workspace` を探索するフォルダを追加
2. サイドバーの `Workspaces` / `Workspace History` ビューから一覧を開く
3. 任意の項目をクリック → 新規ウィンドウで開く（既定設定）
4. 再度開くと履歴が自動的に更新されます

---

## 機能

| 機能 | 説明 |
|------|------|
| **Workspaces ビュー** | 指定ルート配下から `.code-workspace` を自動探索・一覧表示 |
| **Workspace History ビュー** | 開いた日時・モードを履歴として表示 |
| **開き方の選択** | 新規ウィンドウ（既定）または既存ウィンドウで開く |
| **ラベル/色タグ** | ワークスペースにラベルや色を付けて整理 |
| **フィルター機能** | 名前・ラベル・色でワークスペースや履歴を絞り込み |
| **クイックオープン** | コマンドパレットから素早くワークスペースを検索・開く |
| **エクスポート/インポート** | メタデータと履歴をJSONファイルでバックアップ・復元 |

---

## 設定

| 設定項目 | 説明 | デフォルト |
|----------|------|------------|
| `workspaceChronicle.roots` | 探索するルートディレクトリ | `["${userHome}"]` |
| `workspaceChronicle.defaultOpenMode` | 既定の開き方 (`newWindow` / `reuseWindow`) | `newWindow` |
| `workspaceChronicle.historyLimit` | 保存する履歴の最大件数 | `500` |

---

## コマンド

| コマンド | 説明 |
|----------|------|
| `Workspace Chronicle: Refresh` | ワークスペース一覧を更新 |
| `Workspace Chronicle: Set Default Open Mode` | 既定の開き方を設定 |
| `Workspace Chronicle: Set Custom Name` | カスタム名（ラベル）を設定 |
| `Workspace Chronicle: Set Color` | 色タグを設定 |
| `Workspace Chronicle: Filter by Label or Color` | Workspaces をラベル/色でフィルター |
| `Workspace Chronicle: Filter History` | 履歴をキーワードでフィルター |
| `Workspace Chronicle: Filter History by Label or Color` | 履歴をラベル/色でフィルター |
| `Workspace Chronicle: Toggle Sort Mode` | 履歴のソートモードを切り替え |
| `Workspace Chronicle: Clear All Filters` | すべてのフィルターをクリア |
| `Workspace Chronicle: Open Recent` | 最近開いたワークスペースをクイックオープン |
| `Workspace Chronicle: Search Workspaces` | ワークスペースを検索して開く |
| `Workspace Chronicle: Export Data` | メタデータと履歴をエクスポート |
| `Workspace Chronicle: Import Data` | メタデータと履歴をインポート |
| `Workspace Chronicle: Add Root Directory` | ルートディレクトリを追加 |
| `Workspace Chronicle: Remove Root Directory` | ルートディレクトリを削除 |
| `Workspace Chronicle: List Root Directories` | ルートディレクトリ一覧を表示 |

---

## 貢献

Issue や Pull Request を歓迎します！

- バグ報告: [Issues](https://github.com/qadiff/workspace-chronicle/issues)
- 機能リクエスト: [Issues](https://github.com/qadiff/workspace-chronicle/issues)
- コード貢献: [Pull Requests](https://github.com/qadiff/workspace-chronicle/pulls)

このプロジェクトが役に立ったら、ぜひ **Star** をお願いします！

---

## LICENSE

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
