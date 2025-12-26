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

	async getChildren(element?: HistoryItem): Promise<HistoryItem[]> {
		if (element) {
			return [];
		}
		let entries = await this.history.getSorted();

		// Apply keyword filter
		if (this.filterKeyword) {
			entries = entries.filter(e =>
				e.name.toLowerCase().includes(this.filterKeyword) ||
				e.path.toLowerCase().includes(this.filterKeyword)
			);
		}

		// Apply tag filter
		if (this.tagFilter) {
			const filteredEntries: HistoryEntry[] = [];
			for (const e of entries) {
				const meta = await this.meta.get(e.path);
				if (this.tagFilter.type === 'label' && meta?.label === this.tagFilter.value) {
					filteredEntries.push(e);
				} else if (this.tagFilter.type === 'color' && meta?.color === this.tagFilter.value) {
					filteredEntries.push(e);
				}
			}
			entries = filteredEntries;
		}

		const items: HistoryItem[] = [];
		for (const e of entries) {
			const meta = await this.meta.get(e.path);
			items.push(new HistoryItem(e, meta?.color));
		}
		return items;
	}

	async toggleSort(): Promise<SortMode> {
		const newMode = await this.history.toggleSort();
		this.refresh();
		return newMode;
	}

	async removeFromHistory(pathToRemove: string): Promise<boolean> {
		const removed = await this.history.remove(pathToRemove);
		if (removed) {
			this.refresh();
		}
		return removed;
	}

	async clearHistory(): Promise<void> {
		await this.history.clear();
		this.refresh();
	}
}

export class HistoryItem extends vscode.TreeItem {
	constructor(public readonly entry: HistoryEntry, color?: string) {
		const baseLabel = `${fmtDate(entry.openedAt)} – ${entry.name}`;
		const withCount = entry.count ? `${baseLabel} (${entry.count}x)` : baseLabel;
		super(withCount, vscode.TreeItemCollapsibleState.None);
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
