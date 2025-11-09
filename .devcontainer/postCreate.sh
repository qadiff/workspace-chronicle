#!/usr/bin/env bash
set -euo pipefail

if command -v corepack >/dev/null 2>&1; then
  corepack enable || true
  # 好きな安定版に固定（例: 10.20.0）
  corepack prepare pnpm@10.20.0 --activate || true
fi

export PNPM_HOME="${PNPM_HOME:-/home/node/.local/share/pnpm}"
mkdir -p "$PNPM_HOME"
case ":$PATH:" in *":$PNPM_HOME:"*) ;; *) export PATH="$PNPM_HOME:$PATH";; esac

pnpm approve-builds keytar || true

pnpm i

if [ ! -d .husky ]; then
  pnpm dlx husky@9 init || true
fi

if grep -q '"vsce"' package.json 2>/dev/null; then
  pnpm remove vsce || true
  pnpm add -D @vscode/vsce || true
fi
