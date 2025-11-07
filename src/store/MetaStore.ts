import * as vscode from 'vscode';


export interface MetaData { label?: string; color?: string; }
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
}
