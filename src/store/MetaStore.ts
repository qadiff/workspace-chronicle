import * as vscode from 'vscode';
import { readJson, writeJson, fileExists } from './FileStore';

export interface MetaData {
	label?: string;
	color?: string;
}

const META_FILE = 'meta.json';
const LEGACY_KEY = 'workspaceChronicle.meta';

export class MetaStore {
	private cache: Record<string, MetaData> | null = null;
	private initPromise: Promise<void> | null = null;

	constructor(private ctx: vscode.ExtensionContext) {}

	// For testing: reset internal state
	_reset(): void {
		this.cache = null;
		this.initPromise = null;
	}

	async initialize(): Promise<void> {
		if (!this.initPromise) {
			this.initPromise = this.doInitialize();
		}
		return this.initPromise;
	}

	private async doInitialize(): Promise<void> {
		const exists = await fileExists(META_FILE);
		if (!exists) {
			// Migrate from globalState if available
			const legacyMeta = this.ctx.globalState.get<Record<string, MetaData>>(LEGACY_KEY);

			if (legacyMeta && Object.keys(legacyMeta).length > 0) {
				this.cache = legacyMeta;
				await this.save();
			}
		}
	}

	private async load(): Promise<Record<string, MetaData>> {
		if (this.cache) {
			return this.cache;
		}

		this.cache = await readJson<Record<string, MetaData>>(META_FILE, {});
		return this.cache;
	}

	private async save(): Promise<void> {
		if (this.cache) {
			await writeJson(META_FILE, this.cache);
		}
	}

	async get(path: string): Promise<MetaData | undefined> {
		await this.initialize();
		const map = await this.load();
		return map[path];
	}

	async set(path: string, meta: MetaData): Promise<void> {
		await this.initialize();
		const map = await this.load();
		map[path] = { ...map[path], ...meta };
		await this.save();
	}

	async getAll(): Promise<Record<string, MetaData>> {
		await this.initialize();
		return await this.load();
	}

	async getAllLabels(): Promise<string[]> {
		await this.initialize();
		const map = await this.load();
		const labels = new Set<string>();
		for (const meta of Object.values(map)) {
			if (meta.label) {
				labels.add(meta.label);
			}
		}
		return Array.from(labels).sort();
	}

	async getAllColors(): Promise<string[]> {
		await this.initialize();
		const map = await this.load();
		const colors = new Set<string>();
		for (const meta of Object.values(map)) {
			if (meta.color) {
				colors.add(meta.color);
			}
		}
		return Array.from(colors).sort();
	}
}
