# 開発ガイド

このドキュメントでは、開発環境のセットアップと一般的な開発ワークフローについて説明します。

## 前提条件

- Node.js（v18 以降推奨）
- npm
- Visual Studio Code

## はじめに

### 1. リポジトリをクローン

```bash
git clone https://github.com/qadiff/workspace-chronicle.git
cd workspace-chronicle
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. TypeScript をコンパイル

```bash
npm run compile
```

### 4. Extension Host を起動

VS Code で `F5` を押すと、拡張機能がロードされた新しい VS Code ウィンドウが起動します。

または：

```bash
npm run dev
```

その後 `F5` を押してください。

## npm スクリプト

| スクリプト | 説明 |
|-----------|------|
| `npm run compile` | TypeScript を JavaScript にコンパイル |
| `npm run watch` | ウォッチモードでコンパイル |
| `npm run dev` | コンパイルして F5 の案内を表示 |
| `npm run lint` | ESLint を実行 |
| `npm run test` | テストを実行 |
| `npm run test:linux` | Linux でテストを実行（xvfb 使用） |
| `npm run package` | VSIX パッケージを作成 |
| `npm run bump` | パッチバージョンを上げる（0.0.8 → 0.0.9） |
| `npm run bump:down` | パッチバージョンを下げる（0.0.9 → 0.0.8） |
| `npm run version:tag` | 現在のバージョンで git タグを作成 |
| `npm run version:untag` | git タグを削除 |
| `npm run release` | バージョンアップ、コンパイル、パッケージ作成を一括実行 |

## テスト

全テストを実行：

```bash
npm run test
```

Linux（CI 環境）の場合：

```bash
npm run test:linux
```

テストは `src/test/` にあり、テストフレームワークとして Mocha を使用しています。

## Lint

```bash
npm run lint
```

プロジェクトでは TypeScript 対応の ESLint を使用しています。Husky と lint-staged がコミット前に自動で lint を実行するよう設定されています。

## VSIX パッケージのビルド

```bash
npm run package
```

プロジェクトルートに `.vsix` ファイルが作成されます。ローカルインストールや配布に使用できます。

## 開発ワークフロー

1. フィーチャーブランチを作成
2. 変更を加える
3. `npm run lint` で問題がないか確認
4. `npm run test` でテストを実行
5. `F5` で拡張機能を手動テスト
6. 変更をコミット（lint-staged が自動実行される）
7. プルリクエストを作成

## デバッグ

1. VS Code でブレークポイントを設定
2. `F5` で Extension Development Host を起動
3. デバッグしたい機能をトリガー
4. VS Code がブレークポイントで停止する

`.vscode/launch.json` にデバッグ設定が含まれています。
