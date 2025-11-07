# Node 22 ベースの devcontainers イメージ
FROM mcr.microsoft.com/devcontainers/javascript-node:24

RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client

# pnpm を corepack で有効化（postCreateCommand でも実行）
RUN corepack enable

# 開発用ツール（必要に応じて）
RUN npm i -g @vscode/vsce @types/vscode

# 作業ディレクトリ
WORKDIR /workspaces/workspace-chronicle
