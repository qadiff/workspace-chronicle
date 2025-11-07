import * as vscode from 'vscode';
import { HistoryStore, HistoryEntry } from '../store/HistoryStore';
import { MetaStore } from '../store/MetaStore';


export class HistoryProvider implements vscode.TreeDataProvider<HistoryItem> {
private _onDidChangeTreeData = new vscode.EventEmitter<void>();
readonly onDidChangeTreeData = this._onDidChangeTreeData.event;


constructor(private history: HistoryStore, private meta: MetaStore) {}


refresh() { this._onDidChangeTreeData.fire(); }


getTreeItem(element: HistoryItem) { return element; }


async getChildren(element?: HistoryItem): Promise<HistoryItem[]> {
if (element) return [];
const entries = this.history.getAll();
return entries.map(e => new HistoryItem(e, this.meta.get(e.path)?.color));
}
}

class HistoryItem extends vscode.TreeItem {
    constructor(public readonly entry: HistoryEntry, color?: string) {
    super(`${fmtDate(entry.openedAt)} – ${entry.name}`, vscode.TreeItemCollapsibleState.None);
    this.description = entry.path;
    this.command = { command: 'workspaceChronicle.open', title: 'Open', arguments: [entry.path] };
    this.tooltip = `${entry.name}\n${entry.path}\nmode: ${entry.mode}`;
    if (color) this.iconPath = new vscode.ThemeIcon('circle-filled');
    this.contextValue = 'historyItem';
    }
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
