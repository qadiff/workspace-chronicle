import * as vscode from 'vscode';
import * as path from 'path';
import { globby } from 'globby';
import { MetaStore } from '../store/MetaStore';
import { HistoryStore } from '../store/HistoryStore';

export class WorkspacesProvider implements vscode.TreeDataProvider<WorkspaceItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private tagFilter: { type: 'label' | 'color'; value: string } | null = null;
	private nameFilter: string = '';
	private cachedWorkspaceFiles: string[] = [];
	private isRefreshing = false;
	private refreshTimeout?: NodeJS.Timeout;
	private refreshPromise?: Promise<void>;
	private refreshGeneration = 0;

	constructor(private meta: MetaStore, private history: HistoryStore) {}

	refresh() {
		const generation = ++this.refreshGeneration;
		// Debounce: clear existing timeout
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}

		this.cachedWorkspaceFiles = [];
		this._onDidChangeTreeData.fire();

		// Debounce refresh to avoid rapid consecutive calls
		this.refreshTimeout = setTimeout(() => {
			void this.refreshWorkspaceFiles(generation);
		}, 100);
	}

	private applyUpdate(files: string[], generation: number) {
		if (generation !== this.refreshGeneration) {
			return;
		}
		this.cachedWorkspaceFiles = files;
		this._onDidChangeTreeData.fire();
	}

	private async refreshWorkspaceFiles(generation: number): Promise<void> {
		if (this.isRefreshing) {
			// Wait for current refresh then run again with the latest generation
			return (this.refreshPromise = this.refreshPromise?.then(() => this.refreshWorkspaceFiles(generation)));
		}

		this.isRefreshing = true;
		this.refreshPromise = (async () => {
			try {
				const roots =
					vscode.workspace.getConfiguration('workspaceChronicle').get<string[]>('roots') ||
					[];

				const expandedRoots = roots.map(expandPath).filter(Boolean);
				const uniqueRoots = Array.from(new Set(expandedRoots));
				const allFiles = new Set<string>();

				await Promise.all(
					uniqueRoots.map(async (root) => {
						const pattern = path.join(root, '**/*.code-workspace');

						const files = await globby(pattern, {
							ignore: ['**/node_modules/**', '**/.git/**', '**/bower_components/**', '**/vendor/**'],
							absolute: true,
							followSymbolicLinks: false,
							onlyFiles: true,
							suppressErrors: true
						});

						for (const file of files) {
							allFiles.add(file);
						}
						this.applyUpdate(Array.from(allFiles), generation);
					})
				);

				this.applyUpdate(Array.from(allFiles), generation);
				console.log(
					`[findWorkspaceFilesProgressive] found ${allFiles.size} workspace files across ${uniqueRoots.length} roots`
				);
			} catch (error) {
				console.error('[WorkspacesProvider] Error refreshing workspace files:', error);
			} finally {
				this.isRefreshing = false;
				this.refreshPromise = undefined;
			}
		})();

		return this.refreshPromise;
	}

	setTagFilter(type: 'label' | 'color', value: string) {
		this.tagFilter = { type, value };
		this._onDidChangeTreeData.fire();
	}

	setNameFilter(keyword: string) {
		this.nameFilter = keyword.toLowerCase();
		this._onDidChangeTreeData.fire();
	}

	clearTagFilter() {
		this.tagFilter = null;
		this._onDidChangeTreeData.fire();
	}

	clearNameFilter() {
		this.nameFilter = '';
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: WorkspaceItem): vscode.TreeItem {
		return element;
	}

	async getChildren(element?: WorkspaceItem): Promise<WorkspaceItem[]> {
		if (element) {
			return [];
		}

		// Wait for initial refresh if cache is empty
		if (this.cachedWorkspaceFiles.length === 0) {
			await this.refreshWorkspaceFiles(this.refreshGeneration);
		}

		const items: WorkspaceItem[] = [];
		for (const file of this.cachedWorkspaceFiles) {
			const meta = this.meta.get(file);

			const displayLabel = meta?.label || path.basename(file);

			// Apply name/path filter
			if (this.nameFilter) {
				const labelLower = displayLabel.toLowerCase();
				const pathLower = file.toLowerCase();
				if (!labelLower.includes(this.nameFilter) && !pathLower.includes(this.nameFilter)) {
					continue;
				}
			}

			// Apply tag filter
			if (this.tagFilter) {
				if (this.tagFilter.type === 'label' && meta?.label !== this.tagFilter.value) {
					continue;
				}
				if (this.tagFilter.type === 'color' && meta?.color !== this.tagFilter.value) {
					continue;
				}
			}

			const item = new WorkspaceItem(displayLabel, file, meta?.color);
			items.push(item);
		}

		// Sort by label
		items.sort((a, b) => {
			const labelA = typeof a.label === 'string' ? a.label : '';
			const labelB = typeof b.label === 'string' ? b.label : '';
			return labelA.localeCompare(labelB);
		});
		return items;
	}
}

class WorkspaceItem extends vscode.TreeItem {
	constructor(public readonly label: string, public readonly fullPath: string, color?: string) {
		super(label, vscode.TreeItemCollapsibleState.None);
		this.description = fullPath;
		this.command = {
			command: 'workspaceChronicle.open',
			title: 'Open Workspace',
			arguments: [fullPath]
		};
		this.tooltip = `${label}\n${fullPath}`;
		if (color) {
			// Create SVG icon with custom color
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${encodeColor(color)}"/></svg>`;
			const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
			this.iconPath = vscode.Uri.parse(svgDataUri);
		}
		this.contextValue = 'workspaceItem';
	}
}

function encodeColor(color: string): string {
	// If color starts with #, use it as-is
	if (color.startsWith('#')) {
		return color;
	}
	// If it's a named color, use it as-is
	return color;
}

function expandPath(p: string) {
	const homeDir = process.env.HOME || process.env.USERPROFILE || '';
	if (p.startsWith('~')) {
		return path.join(homeDir, p.slice(1));
	}
	if (p.includes('${userHome}')) {
		return p.replace(/\$\{userHome\}/g, homeDir);
	}
	return p;
}
