# リリースガイド

このドキュメントでは、Workspace Chronicle のリリースプロセスについて説明します。

## バージョン管理

プロジェクトでは `scripts/bump-version.js` にあるカスタムバージョン管理スクリプトを使用しています。

### バージョン関連コマンド

| コマンド | 説明 |
|---------|------|
| `npm run bump` | パッチバージョンを上げる（例：0.0.8 → 0.0.9） |
| `npm run bump:down` | パッチバージョンを下げる（例：0.0.9 → 0.0.8） |
| `npm run version:tag` | ローカル git タグを作成（例：`v0.0.9`） |
| `npm run version:untag` | ローカル git タグを削除 |

### 重要な注意事項

- `npm run version:tag` は**ローカルタグのみ**を作成します。手動で push が必要です：

  ```bash
  git push origin v0.0.9
  ```

- `npm run version:untag` は**ローカルタグのみ**を削除します。リモートタグを削除するには：

  ```bash
  git push origin --delete v0.0.9
  ```

## リリースワークフロー

### 1. リリース準備

すべての変更がコミットされ、lint とテストが通ることを確認：

```bash
npm run lint
npm run test
```

### 2. バージョンアップとパッケージ作成

release スクリプトでバージョンアップ、コンパイル、パッケージ作成を一括実行：

```bash
npm run release
```

または個別に実行：

```bash
npm run bump           # package.json のバージョンを上げる
npm run compile        # TypeScript をコンパイル
npm run package        # VSIX ファイルを作成
```

### 3. コミット

```bash
git add package.json
git commit -m "Release v0.0.9"
```

### 4. git タグを作成

タグはバージョン変更のコミット後に作成します：

```bash
npm run version:tag    # ローカルタグを作成（例：v0.0.9）
```

### 5. push

```bash
git push origin main
git push origin v0.0.9
```

### 6. VS Code Marketplace に公開

```bash
vsce publish
```

または [VS Code Marketplace Publisher](https://marketplace.visualstudio.com/manage) から `.vsix` ファイルを手動でアップロード。

## バージョニング方針

このプロジェクトは [Semantic Versioning](https://semver.org/lang/ja/) に従います：

- **MAJOR**: 破壊的変更
- **MINOR**: 新機能（後方互換性あり）
- **PATCH**: バグ修正（後方互換性あり）

現在は初期開発段階（`0.0.x`）のため、すべての変更でパッチバージョンを上げています。

## ロールバック

リリースをロールバックする必要がある場合：

### バージョンアップを元に戻す（コミット前）

```bash
npm run bump:down
```

### タグを削除する

ローカル：

```bash
npm run version:untag
```

リモート：

```bash
git push origin --delete v0.0.x
```

## CI/CD

GitHub Actions がプルリクエスト時に自動でテストを実行します。ワークフロー設定は `.github/workflows/` を参照してください。
