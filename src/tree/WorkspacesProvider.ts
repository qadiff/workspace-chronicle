import * as vscode from 'vscode';
import { promises as fs } from 'fs';
import * as path from 'path';
import { MetaStore } from '../store/MetaStore';
import { HistoryStore } from '../store/HistoryStore';

export class WorkspacesProvider implements vscode.TreeDataProvider<WorkspaceItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private tagFilter: { type: 'label' | 'color'; value: string } | null = null;

	constructor(private meta: MetaStore, private history: HistoryStore) {}

	refresh() {
		this._onDidChangeTreeData.fire();
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

		const roots =
			vscode.workspace.getConfiguration().get<string[]>('workspaceChronicle.roots') ||
			[];

		const items: WorkspaceItem[] = [];
		for (const root of roots) {
			const expanded = expandPath(root);
			const found = await findWorkspaceFiles(expanded);
			for (const file of found) {
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
		}

		// Sort by label
		items.sort((a, b) => a.label!.localeCompare(b.label!));
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

async function findWorkspaceFiles(dir: string): Promise<string[]> {
	const results: string[] = [];
	async function walk(d: string) {
		let entries: any[] = [];
		try {
			entries = await fs.readdir(d, { withFileTypes: true });
		} catch (err: any) {
			// Skip common filesystem errors silently
			const silentErrors = ['EACCES', 'EPERM', 'ENOENT', 'ENOTDIR', 'ELOOP'];
			if (silentErrors.includes(err?.code)) {
				return;
			}
			console.error('[findWorkspaceFiles] error reading dir:', d, err);
			return;
		}
		await Promise.all(entries.map(async (entry) => {
			const p = path.join(d, entry.name);
			if (entry.isDirectory()) {
				if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
					return;
				}
				await walk(p);
			} else if (entry.isFile() && p.endsWith('.code-workspace')) {
				console.log('[findWorkspaceFiles] found:', p);
				results.push(p);
			}
		}));
	}
	await walk(dir);
	return results;
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
