# Workspace Chronicle – SPEC (MVP)

## Scope

- List/search `.code-workspace`
- Open in new window by default; reuse supported
- Record history: { path, name, mode, openedAt }
- Label & color (basic attach/display)

## Configuration

- workspaceChronicle.roots: string[]
- workspaceChronicle.defaultOpenMode: newWindow|reuseWindow
- workspaceChronicle.historyLimit: number

## Views

- Workspaces (Tree): lists files under roots
- Workspace History (Tree): recent first

## Commands

- workspaceChronicle.open
- workspaceChronicle.refresh
- workspaceChronicle.setOpenMode
- workspaceChronicle.setLabel
- workspaceChronicle.setColor

## Non-Functional

- No telemetry; local only
- Non-blocking UI (async scanning)
