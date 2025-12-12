# Workspace Chronicle

Collects and lists multiple `.code-workspace` files, allowing you to open them in a **new window (default)** or **existing window**. Records and displays your open history.

[日本語](README.md)

<!-- GitHub CI / Release -->
[![GitHub release](https://img.shields.io/github/v/release/qadiff/workspace-chronicle?include_prereleases)](https://github.com/qadiff/workspace-chronicle/releases)

<!-- License / PR welcome -->
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/qadiff/workspace-chronicle/pulls)

---

This tool solves the following needs for people working with Visual Studio Code:

- Quickly switch between projects
- Deal with sudden project changes
- Quickly find recently opened workspaces
- Frequently switch between multiple projects

---

## Screenshots

![DefaultView](docs/images/main.png)

### Commands displayed when you right-click on the Workspace name
![right-click-on-name](docs/images/right-click-on-name.png)

### Change of label
![set custom name](docs/images/set-custom-name.gif)

### Change color
![set color](docs/images/set-color.gif)

### Incremental search in history
![filter in history](docs/images/filter-in-history.gif)

---

## Installation

### From VS Code Marketplace
1. Open VS Code
2. Open the Extensions panel (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for `Workspace Chronicle`
4. Click **Install**


> Recommended: Use together with [Auto Workspace Creator](https://marketplace.visualstudio.com/items?itemName=nickmcdowall.auto-workspace) for automatic workspace file generation.

---

## Quick Start

1. Go to Settings → Add folders to search for `.code-workspace` files in `workspaceChronicle.roots`
2. Open the list from the `Workspaces` / `Workspace History` views in the sidebar
3. Click any item → Opens in a new window (default)
4. Reopening will automatically update the history

---

## Who is this for?

- **Developers working on multiple projects** - Switch between projects with one click
- **Teams using monorepos** - Organize and manage numerous workspaces
- **Frequent workspace switchers** - Quick access to recently opened workspaces via history
- **Freelancers / Multiple client work** - Efficiently manage projects for each client

---

## Features

| Feature | Description |
|---------|-------------|
| **Workspaces View** | Automatically discovers and lists `.code-workspace` files under specified roots |
| **Workspace History View** | Displays history with open date/time and mode |
| **Open Mode Selection** | Open in new window (default) or reuse existing window |
| **Label/Color Tags** | Organize workspaces with labels and colors |
| **Filter** | Filter workspaces and history by name, label, or color |
| **Quick Open** | Quickly search and open workspaces from command palette |
| **Export/Import** | Backup and restore metadata and history as JSON files |

---

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `workspaceChronicle.roots` | Root directories to search | `["${userHome}"]` |
| `workspaceChronicle.defaultOpenMode` | Default open mode (`newWindow` / `reuseWindow`) | `newWindow` |
| `workspaceChronicle.historyLimit` | Maximum number of history entries | `500` |

---

## Commands

| Command | Description |
|---------|-------------|
| `Workspace Chronicle: Refresh` | Refresh the workspace list |
| `Workspace Chronicle: Set Default Open Mode` | Set the default open mode |
| `Workspace Chronicle: Set Custom Name` | Set a custom name (label) |
| `Workspace Chronicle: Set Color` | Set a color tag |
| `Workspace Chronicle: Filter by Label or Color` | Filter Workspaces by label/color |
| `Workspace Chronicle: Filter History` | Filter history by keyword |
| `Workspace Chronicle: Filter History by Label or Color` | Filter history by label/color |
| `Workspace Chronicle: Toggle Sort Mode` | Toggle history sort mode |
| `Workspace Chronicle: Clear All Filters` | Clear all filters |
| `Workspace Chronicle: Open Recent` | Quick open recently opened workspaces |
| `Workspace Chronicle: Search Workspaces` | Search and open workspaces |
| `Workspace Chronicle: Export Data` | Export metadata and history |
| `Workspace Chronicle: Import Data` | Import metadata and history |
| `Workspace Chronicle: Add Root Directory` | Add a root directory |
| `Workspace Chronicle: Remove Root Directory` | Remove a root directory |
| `Workspace Chronicle: List Root Directories` | List root directories |

---

## Contributing

Issues and Pull Requests are welcome!

- Bug reports: [Issues](https://github.com/qadiff/workspace-chronicle/issues)
- Feature requests: [Issues](https://github.com/qadiff/workspace-chronicle/issues)
- Code contributions: [Pull Requests](https://github.com/qadiff/workspace-chronicle/pulls)

If you find this project helpful, please give it a **Star**!

---

## LICENSE

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
