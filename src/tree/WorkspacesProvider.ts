import * as vscode from 'vscode';
import * as path from 'path';
import { globby } from 'globby';
import { MetaStore } from '../store/MetaStore';
import { HistoryStore } from '../store/HistoryStore';

export class WorkspacesProvider implements vscode.TreeDataProvider<WorkspaceItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private tagFilter: { type: 'label' | 'color'; value: string } | null = null;
	private cachedWorkspaceFiles: string[] = [];
	private isRefreshing = false;
	private refreshTimeout?: NodeJS.Timeout;
	private refreshPromise?: Promise<void>;

	constructor(private meta: MetaStore, private history: HistoryStore) {}

	refresh() {
		// Debounce: clear existing timeout
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}

		this.cachedWorkspaceFiles = [];
		this._onDidChangeTreeData.fire();

		// Debounce refresh to avoid rapid consecutive calls
		this.refreshTimeout = setTimeout(() => {
			void this.refreshWorkspaceFiles();
		}, 100);
	}

	private async refreshWorkspaceFiles(): Promise<void> {
		if (this.isRefreshing) {
			// Return existing promise to wait for current refresh
			return this.refreshPromise;
		}

		this.isRefreshing = true;
		this.refreshPromise = (async () => {
			try {
				const roots =
					vscode.workspace.getConfiguration().get<string[]>('workspaceChronicle.roots') ||
					[];

				// Search all roots in parallel using globby with progressive updates
				const expandedRoots = roots.map(expandPath);

				// Use streaming approach for progressive updates
				await findWorkspaceFilesProgressive(expandedRoots, (files) => {
					this.cachedWorkspaceFiles = files;
					this._onDidChangeTreeData.fire();
				});
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

	clearTagFilter() {
		this.tagFilter = null;
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
			await this.refreshWorkspaceFiles();
		}

		const items: WorkspaceItem[] = [];
		for (const file of this.cachedWorkspaceFiles) {
			const meta = this.meta.get(file);

			// Apply tag filter
			if (this.tagFilter) {
				if (this.tagFilter.type === 'label' && meta?.label !== this.tagFilter.value) {
					continue;
				}
				if (this.tagFilter.type === 'color' && meta?.color !== this.tagFilter.value) {
					continue;
				}
			}

			const label = meta?.label || path.basename(file);
			const item = new WorkspaceItem(label, file, meta?.color);
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

async function findWorkspaceFilesProgressive(
	roots: string[],
	onUpdate: (files: string[]) => void
): Promise<void> {
	try {
		// Search each root progressively and update as we go
		const allFiles: string[] = [];

		for (const root of roots) {
			const pattern = path.join(root, '**/*.code-workspace');

			const files = await globby(pattern, {
				ignore: [
					'**/node_modules/**',
					'**/.git/**',
					'**/bower_components/**',
					'**/vendor/**'
				],
				absolute: true,
				followSymbolicLinks: false,
				onlyFiles: true,
				suppressErrors: true
			});

			// Add found files and trigger update
			allFiles.push(...files);
			if (files.length > 0) {
				onUpdate([...allFiles]);
			}
		}

		// Final update with all files
		onUpdate(allFiles);
		console.log(`[findWorkspaceFilesProgressive] found ${allFiles.length} workspace files across ${roots.length} roots`);
	} catch (error) {
		console.error('[findWorkspaceFilesProgressive] error:', error);
		onUpdate([]);
	}
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
