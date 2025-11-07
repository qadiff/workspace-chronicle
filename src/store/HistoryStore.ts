import * as vscode from 'vscode';


export type OpenMode = 'newWindow' | 'reuseWindow';
export interface HistoryEntry {
name: string;
path: string;
mode: OpenMode;
openedAt: string; // ISO string
}


const KEY = 'workspaceChronicle.history';


export class HistoryStore {
constructor(private ctx: vscode.ExtensionContext) {}


add(e: HistoryEntry) {
const limit = vscode.workspace.getConfiguration('workspaceChronicle').get<number>('workspaceChronicle.historyLimit') || 500;
const list = this.getAll();
list.unshift(e);
if (list.length > limit) list.length = limit;
this.ctx.globalState.update(KEY, list);
}


getAll(): HistoryEntry[] {
return this.ctx.globalState.get<HistoryEntry[]>(KEY) || [];
}
}
