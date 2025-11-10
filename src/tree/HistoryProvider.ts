import * as vscode from 'vscode';
import { HistoryStore, HistoryEntry, SortMode } from '../store/HistoryStore';
import { MetaStore } from '../store/MetaStore';

export class HistoryProvider implements vscode.TreeDataProvider<HistoryItem> {
	private _onDidChangeTreeData = new vscode.EventEmitter<void>();
	readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
	private filterKeyword: string = '';
	private tagFilter: { type: 'label' | 'color'; value: string } | null = null;

	constructor(private history: HistoryStore, private meta: MetaStore) {}

	refresh() {
		this._onDidChangeTreeData.fire();
	}

	setFilter(keyword: string) {
		this.filterKeyword = keyword.toLowerCase();
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

	getTreeItem(element: HistoryItem) {
		return element;
	}

	getChildren(element?: HistoryItem): HistoryItem[] | Promise<HistoryItem[]> {
		if (element) {
			return [];
		}
		let entries = this.history.getSorted();

		// Apply keyword filter
		if (this.filterKeyword) {
			entries = entries.filter(e =>
				e.name.toLowerCase().includes(this.filterKeyword) ||
				e.path.toLowerCase().includes(this.filterKeyword)
			);
		}

		// Apply tag filter
		if (this.tagFilter) {
			entries = entries.filter(e => {
				const meta = this.meta.get(e.path);
				if (this.tagFilter!.type === 'label') {
					return meta?.label === this.tagFilter!.value;
				}
				if (this.tagFilter!.type === 'color') {
					return meta?.color === this.tagFilter!.value;
				}
				return false;
			});
		}

		return entries.map(e => new HistoryItem(e, this.meta.get(e.path)?.color, this.filterKeyword ? entries.length : undefined));
	}

	toggleSort(): SortMode {
		const newMode = this.history.toggleSort();
		this.refresh();
		return newMode;
	}
}

class HistoryItem extends vscode.TreeItem {
	constructor(public readonly entry: HistoryEntry, color?: string, totalCount?: number) {
		const label = `${fmtDate(entry.openedAt)} – ${entry.name}`;
		super(totalCount !== undefined ? `${label} (${totalCount})` : label, vscode.TreeItemCollapsibleState.None);
		this.description = entry.path;
		this.command = { command: 'workspaceChronicle.open', title: 'Open', arguments: [entry.path] };
		this.tooltip = `${entry.name}\n${entry.path}\nmode: ${entry.mode}`;
		if (color) {
			// Create SVG icon with custom color
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="${encodeColor(color)}"/></svg>`;
			const svgDataUri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
			this.iconPath = vscode.Uri.parse(svgDataUri);
		}
		this.contextValue = 'historyItem';
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

function fmtDate(d: string | number | Date) {
	const dt = new Date(d);
	const y = dt.getFullYear();
	const m = String(dt.getMonth() + 1).padStart(2, '0');
	const dd = String(dt.getDate()).padStart(2, '0');
	const hh = String(dt.getHours()).padStart(2, '0');
	const mm = String(dt.getMinutes()).padStart(2, '0');
	return `${y}-${m}-${dd} ${hh}:${mm}`;
}
