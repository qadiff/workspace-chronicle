# Architecture Overview

This document describes the codebase structure and key components of Workspace Chronicle.

## Directory Structure

```
src/
├── extension.ts          # Extension entry point
├── fs.ts                 # File system utilities
├── commands/             # VS Code command implementations
├── store/                # Data persistence layer
├── tree/                 # Tree view providers
└── test/                 # Test files
    └── suite/            # Test suite configuration
```

## Key Components

### Entry Point

**`src/extension.ts`**

The main entry point that VS Code calls when activating the extension. Registers commands, tree views, and initializes stores.

### Commands (`src/commands/`)

Each file implements one or more VS Code commands:

| File | Commands |
|------|----------|
| `openWorkspace.ts` | Open workspace in new/existing window |
| `setLabel.ts` | Set custom name for workspace |
| `setColor.ts` | Set color tag for workspace |
| `setColorAlias.ts` | Set display name for color |
| `setOpenMode.ts` | Set default open mode |
| `filterByTag.ts` | Filter workspaces by label/color |
| `filterHistory.ts` | Filter history by keyword |
| `clearFilters.ts` | Clear all filters |
| `copyFullPath.ts` | Copy workspace path to clipboard |
| `openRecent.ts` | Quick open recent workspaces |
| `configureRoots.ts` | Add/remove/list root directories |
| `exportImport.ts` | Export/import data |

### Stores (`src/store/`)

Persistent data storage using JSON files:

| Store | Purpose |
|-------|---------|
| `FileStore.ts` | Base class for JSON file storage |
| `HistoryStore.ts` | Workspace open history |
| `MetaStore.ts` | Workspace metadata (labels, colors) |
| `ColorAliasStore.ts` | Custom color display names |
| `WorkspaceFilesStore.ts` | Cached scan results |

Data is stored in platform-specific locations:
- Windows: `%APPDATA%\workspace-chronicle\`
- macOS: `~/Library/Application Support/workspace-chronicle/`
- Linux: `~/.local/share/workspace-chronicle/`

### Tree Views (`src/tree/`)

VS Code tree view implementations:

| File | Description |
|------|-------------|
| `WorkspacesProvider.ts` | Workspaces tree view (discovered `.code-workspace` files) |
| `HistoryProvider.ts` | Workspace History tree view |
| `workspaceScanner.ts` | Scans directories for `.code-workspace` files |
| `scanGating.ts` | Controls when scanning should run |

### Utilities

**`src/fs.ts`**

File system utilities for cross-platform path handling and file operations.

## Data Flow

```
User Action
    │
    ▼
Command Handler (src/commands/)
    │
    ├─── Read/Write ──► Store (src/store/)
    │                      │
    │                      ▼
    │                   JSON Files (platform data dir)
    │
    └─── Refresh ────► Tree Provider (src/tree/)
                           │
                           ▼
                       VS Code Tree View
```

## Key Patterns

### Store Pattern

All stores extend `FileStore<T>`, which provides:
- JSON serialization/deserialization
- Atomic file writes
- Lazy loading

### Tree View Pattern

Tree providers implement `vscode.TreeDataProvider<T>`:
- `getTreeItem()` - Returns display info for an item
- `getChildren()` - Returns child items
- `refresh()` - Triggers tree view update

### Scan Gating

`scanGating.ts` determines whether scanning should run based on:
- Current workspace type (folder, `.code-workspace`, empty)
- User settings (`scanWhenWorkspaceFileOpen`, `scanWhenNoFolderOpen`)

## Extension Activation

The extension activates on:
- Tree view visibility (`onView:workspaceChronicle.*`)
- Command execution (`onCommand:workspaceChronicle.*`)

See `package.json` → `activationEvents` for the full list.

## Configuration

All settings are defined in `package.json` → `contributes.configuration`. Key settings:

- `workspaceChronicle.roots` - Directories to scan
- `workspaceChronicle.defaultOpenMode` - New window vs reuse
- `workspaceChronicle.historyLimit` - Max history entries
- `workspaceChronicle.scan*` - Scan behavior options
