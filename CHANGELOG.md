# Changelog

## 0.0.9
- Add color alias feature:
  - Assign custom names (aliases) to workspace colors
  - New `Workspace Chronicle: Set Color Alias` command
  - Aliases are persisted across sessions
- Add version bump and release scripts for streamlined releases
- Security improvements:
  - Use `execFileSync` instead of `execSync` to prevent shell injection
  - Add input validation to `tagExists` function for defense-in-depth
- Exclude `scripts` directory from ESLint checks

## 0.0.8
- Improve workspace discovery performance and control:
  - Respect `.gitignore` while scanning (configurable)
  - Add built-in ignore patterns + user-defined ignore globs
  - Optional branch pruning: stop descending when a `.code-workspace` is found
  - Configurable scan gating for empty windows / when a workspace file is open
- Add persistent scan cache to avoid rescanning from scratch across sessions
- Add `Workspace Chronicle: Rescan` to clear scan cache and force a fresh scan
- Add history management:
  - Remove a single entry from history
  - Clear all history
- Windows: exclude `AppData` by default to reduce noise
- When scanning the user home directory itself, exclude home-level `.vscode` and `.kiro` by default

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
