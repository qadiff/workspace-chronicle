# Node 22 ベースの devcontainers イメージ
FROM mcr.microsoft.com/devcontainers/javascript-node:24

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    openssh-client \
    xvfb \
    xauth \
    libgtk-3-0 \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    && rm -rf /var/lib/apt/lists/*

# pnpm を corepack で有効化（postCreateCommand でも実行）
RUN corepack enable

# 開発用ツール（必要に応じて）
RUN npm i -g @vscode/vsce @types/vscode

# 作業ディレクトリ
WORKDIR /workspaces/workspace-chronicle
