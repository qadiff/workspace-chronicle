#!/usr/bin/env bash
set -euo pipefail

# 実行ユーザーは devcontainer の "node" を想定
HOME_DIR="${HOME:-/home/node}"
DOT_DIR="${HOME_DIR}/.dotfiles"

# GitHub を known_hosts に登録（初回 clone 時の対話を避ける）
mkdir -p "${HOME_DIR}/.ssh"
touch "${HOME_DIR}/.ssh/known_hosts"
ssh-keyscan -t rsa,ecdsa,ed25519 github.com >> "${HOME_DIR}/.ssh/known_hosts" 2>/dev/null || true
chmod 700 "${HOME_DIR}/.ssh"
chmod 600 "${HOME_DIR}/.ssh/known_hosts"

# (A案) ~/.ssh をマウントしている場合、パーミッションチェックだけ
if [ -d "${HOME_DIR}/.ssh" ]; then
  # 鍵が厳しめでないと ssh が拒否するので念のため
  find "${HOME_DIR}/.ssh" -type f -name "id_*" -exec chmod 600 {} \; 2>/dev/null || true
  find "${HOME_DIR}/.ssh" -type d -exec chmod 700 {} \; 2>/dev/null || true
fi

# dotfiles をクローン（初回のみ）
if [ ! -d "${DOT_DIR}" ]; then
  # 例：SSH URL（プライベートRepo想定）。あなたのリポジトリに合わせて変更してください。
  git clone git@github.com:Qooh0/dotfiles.git "${DOT_DIR}"
fi

# インストーラ実行
if [ -x "${DOT_DIR}/sh/install.sh" ]; then
  echo "[dotfiles] running sh/install.sh ..."
  (cd "${DOT_DIR}" && bash ./sh/install.sh)
else
  echo "[dotfiles] ${DOT_DIR}/sh/install.sh が見つからないか実行不可です。" >&2
fi