import * as vscode from 'vscode';

export interface MetaData {
	label?: string;
	color?: string;
}

const KEY = 'workspaceChronicle.meta';

export class MetaStore {
	constructor(private ctx: vscode.ExtensionContext) {}

	get(path: string): MetaData | undefined {
		const map = this.ctx.globalState.get<Record<string, MetaData>>(KEY) || {};
		return map[path];
	}

	set(path: string, meta: MetaData) {
		const map = this.ctx.globalState.get<Record<string, MetaData>>(KEY) || {};
		map[path] = { ...map[path], ...meta };
		this.ctx.globalState.update(KEY, map);
	}

	getAll(): Record<string, MetaData> {
		return this.ctx.globalState.get<Record<string, MetaData>>(KEY) || {};
	}

	getAllLabels(): string[] {
		const map = this.getAll();
		const labels = new Set<string>();
		for (const meta of Object.values(map)) {
			if (meta.label) {
				labels.add(meta.label);
			}
		}
		return Array.from(labels).sort();
	}

	getAllColors(): string[] {
		const map = this.getAll();
		const colors = new Set<string>();
		for (const meta of Object.values(map)) {
			if (meta.color) {
				colors.add(meta.color);
			}
		}
		return Array.from(colors).sort();
	}
}
