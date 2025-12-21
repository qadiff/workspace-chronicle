# Changelog

## 0.0.7
- Add Icon

## 0.0.6
- Store history and metadata in platform-specific locations:
  - Windows: %APPDATA%\workspace-chronicle\
  - macOS: ~/Library/Application Support/workspace-chronicle/
  - Linux: ~/.local/share/workspace-chronicle/
- Auto-migrate existing data from VS Code globalState on first launch
- Add FileStore utility for cross-platform file operations
- Convert all store methods to async/await for file-based I/O

## 0.0.5
- Fix activation error by bundling `globby` into the VSIX package.
- Stop workspace scanning when no folder is open or when a multi-root workspace file is opened.
- Switch VS Code tasks from pnpm to npm and tidy badges in README.

## 0.0.3
- lightweight package

## 0.0.2
- CI / Release: switch workflows from pnpm to npm and pin Node.js 24.x (Active LTS).

## 0.0.1
- release
