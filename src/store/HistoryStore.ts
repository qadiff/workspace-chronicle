import * as vscode from 'vscode';

export type OpenMode = 'newWindow' | 'reuseWindow';
export type SortMode = 'recent' | 'frequency' | 'name';

export interface HistoryEntry {
	name: string;
	path: string;
	mode: OpenMode;
	openedAt: string; // ISO string
	count?: number;
}

const KEY = 'workspaceChronicle.history';
const SORT_KEY = 'workspaceChronicle.sortMode';

export class HistoryStore {
	constructor(private ctx: vscode.ExtensionContext) {}

	add(e: HistoryEntry) {
		const limit = vscode.workspace.getConfiguration('workspaceChronicle').get<number>('historyLimit') || 500;
		const list = this.getAll();
		const existing = list.findIndex(item => item.path === e.path);

		if (existing !== -1) {
			const existingEntry = list[existing];
			existingEntry.openedAt = e.openedAt;
			existingEntry.count = (existingEntry.count || 0) + 1;
			list.splice(existing, 1);
			list.unshift(existingEntry);
		} else {
			e.count = 1;
			list.unshift(e);
		}

		if (list.length > limit) {
			list.length = limit;
		}
		this.ctx.globalState.update(KEY, list);
	}

	getAll(): HistoryEntry[] {
		return this.ctx.globalState.get<HistoryEntry[]>(KEY) || [];
	}

	getSorted(): HistoryEntry[] {
		const entries = [...this.getAll()];
		const sortMode = this.getSortMode();

		switch (sortMode) {
			case 'frequency':
				return entries.sort((a, b) => (b.count || 0) - (a.count || 0));
			case 'name':
				return entries.sort((a, b) => a.name.localeCompare(b.name));
			case 'recent':
			default:
				return entries.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
		}
	}

	getSortMode(): SortMode {
		return this.ctx.globalState.get<SortMode>(SORT_KEY) || 'recent';
	}

	setSortMode(mode: SortMode) {
		this.ctx.globalState.update(SORT_KEY, mode);
	}

	toggleSort(): SortMode {
		const current = this.getSortMode();
		const modes: SortMode[] = ['recent', 'frequency', 'name'];
		const currentIndex = modes.indexOf(current);
		const nextMode = modes[(currentIndex + 1) % modes.length];
		this.setSortMode(nextMode);
		return nextMode;
	}
}
