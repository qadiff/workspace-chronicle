import * as vscode from 'vscode';
import { readJson, writeJson } from './FileStore';

export type ColorAliases = Record<string, string>;

const COLOR_ALIASES_FILE = 'colorAliases.json';

export class ColorAliasStore {
	private cache: ColorAliases | null = null;
	private initPromise: Promise<void> | null = null;

	// Keep `ctx` parameter for API consistency / future use, but do not store it.
	constructor(ctx: vscode.ExtensionContext) {
		void ctx;
	}

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
		// Just ensure cache is loaded
		await this.load();
	}

	private async load(): Promise<ColorAliases> {
		if (this.cache) {
			return this.cache;
		}

		this.cache = await readJson<ColorAliases>(COLOR_ALIASES_FILE, {});
		return this.cache;
	}

	private async save(): Promise<void> {
		if (this.cache) {
			await writeJson(COLOR_ALIASES_FILE, this.cache);
		}
	}

	async get(color: string): Promise<string | undefined> {
		await this.initialize();
		const map = await this.load();
		return map[color];
	}

	async set(color: string, alias: string | undefined): Promise<void> {
		await this.initialize();
		const map = await this.load();
		if (alias) {
			map[color] = alias;
		} else {
			delete map[color];
		}
		await this.save();
	}

	async getAll(): Promise<ColorAliases> {
		await this.initialize();
		return await this.load();
	}

	async getDisplayName(color: string): Promise<string> {
		const alias = await this.get(color);
		return alias ? `${alias} (${color})` : color;
	}

	async importAll(aliases: ColorAliases): Promise<void> {
		await this.initialize();
		const map = await this.load();
		for (const [color, alias] of Object.entries(aliases)) {
			if (alias) {
				map[color] = alias;
			}
		}
		await this.save();
	}
}
