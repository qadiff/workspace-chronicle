import * as vscode from 'vscode';
import { readJson, writeJson, fileExists } from './FileStore';

export type OpenMode = 'newWindow' | 'reuseWindow';
export type SortMode = 'recent' | 'frequency' | 'name';

export interface HistoryEntry {
	name: string;
	path: string;
	mode: OpenMode;
	openedAt: string; // ISO string
	count?: number;
}

interface HistoryData {
	entries: HistoryEntry[];
	sortMode: SortMode;
}

const HISTORY_FILE = 'history.json';
const LEGACY_KEY = 'workspaceChronicle.history';
const LEGACY_SORT_KEY = 'workspaceChronicle.sortMode';

export class HistoryStore {
	private cache: HistoryData | null = null;
	private initialized = false;

	constructor(private ctx: vscode.ExtensionContext) {}

	// For testing: reset internal state
	_reset(): void {
		this.cache = null;
		this.initialized = false;
	}

	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		const exists = await fileExists(HISTORY_FILE);
		if (!exists) {
			// Migrate from globalState if available
			const legacyEntries = this.ctx.globalState.get<HistoryEntry[]>(LEGACY_KEY);
			const legacySortMode = this.ctx.globalState.get<SortMode>(LEGACY_SORT_KEY);

			if (legacyEntries && legacyEntries.length > 0) {
				this.cache = {
					entries: legacyEntries,
					sortMode: legacySortMode || 'recent'
				};
				await this.save();
			}
		}

		this.initialized = true;
	}

	private async load(): Promise<HistoryData> {
		if (this.cache) {
			return this.cache;
		}

		this.cache = await readJson<HistoryData>(HISTORY_FILE, { entries: [], sortMode: 'recent' });
		return this.cache;
	}

	private async save(): Promise<void> {
		if (this.cache) {
			await writeJson(HISTORY_FILE, this.cache);
		}
	}

	async add(e: HistoryEntry): Promise<void> {
		await this.initialize();
		const data = await this.load();
		const limit = vscode.workspace.getConfiguration('workspaceChronicle').get<number>('historyLimit') || 500;
		const list = data.entries;
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

		await this.save();
	}

	async getAll(): Promise<HistoryEntry[]> {
		await this.initialize();
		const data = await this.load();
		return data.entries;
	}

	async getSorted(): Promise<HistoryEntry[]> {
		await this.initialize();
		const data = await this.load();
		const entries = [...data.entries];
		const sortMode = data.sortMode;

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

	async getSortMode(): Promise<SortMode> {
		await this.initialize();
		const data = await this.load();
		return data.sortMode;
	}

	async setSortMode(mode: SortMode): Promise<void> {
		await this.initialize();
		const data = await this.load();
		data.sortMode = mode;
		await this.save();
	}

	async toggleSort(): Promise<SortMode> {
		await this.initialize();
		const current = await this.getSortMode();
		const modes: SortMode[] = ['recent', 'frequency', 'name'];
		const currentIndex = modes.indexOf(current);
		const nextMode = modes[(currentIndex + 1) % modes.length];
		await this.setSortMode(nextMode);
		return nextMode;
	}

	async remove(pathToRemove: string): Promise<boolean> {
		await this.initialize();
		const data = await this.load();
		const before = data.entries.length;
		data.entries = data.entries.filter((e) => e.path !== pathToRemove);
		const removed = data.entries.length !== before;
		if (removed) {
			await this.save();
		}
		return removed;
	}

	async clear(): Promise<void> {
		await this.initialize();
		const data = await this.load();
		if (data.entries.length === 0) {
			return;
		}
		data.entries = [];
		await this.save();
	}
}
