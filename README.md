# Workspace Chronicle


多数の `.code-workspace` を収集して一覧表示し、**新規ウィンドウ（既定）**または**既存ウィンドウ**で開けます。開いた履歴を記録・表示します。


## 機能（MVP）
- `Workspaces` ビュー：指定ルート配下から `.code-workspace` を探索・一覧
- `Workspace History` ビュー：開いた日時・モードを履歴表示
- 既定の開き方：新規ウィンドウ（設定で `reuseWindow` に変更可能）
- ラベル/色タグ：プロト版（項目付与・表示）


## 設定
- `workspaceChronicle.roots`: ルートディレクトリ配列（例：`~/dev`, `~/work`）
- `workspaceChronicle.defaultOpenMode`: `newWindow` | `reuseWindow`
- `workspaceChronicle.historyLimit`: 保存履歴の最大件数


## コマンド
- `Workspace Chronicle: Refresh`
- `Workspace Chronicle: Open Workspace`
- `Workspace Chronicle: Set Default Open Mode`
- `Workspace Chronicle: Set Label`
- `Workspace Chronicle: Set Color`


## 使い方
1. 設定で `workspaceChronicle.roots` に探索開始パスを追加
2. エクスプローラービューに `Workspaces` / `Workspace History` が現れます
3. 一覧からクリックして開くと、履歴に記録されます
