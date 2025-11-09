import * as vscode from 'vscode';
import { HistoryStore, HistoryEntry, SortMode } from '../store/HistoryStore';
import { MetaStore } from '../store/MetaStore';


export class HistoryProvider implements vscode.TreeDataProvider<HistoryItem> {
private _onDidChangeTreeData = new vscode.EventEmitter<void>();
readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
private filterKeyword: string = '';


constructor(private history: HistoryStore, private meta: MetaStore) {}


refresh() { this._onDidChangeTreeData.fire(); }


setFilter(keyword: string) {
this.filterKeyword = keyword.toLowerCase();
this._onDidChangeTreeData.fire();
}


getTreeItem(element: HistoryItem) { return element; }


async getChildren(element?: HistoryItem): Promise<HistoryItem[]> {
if (element) return [];
let entries = this.history.getSorted();
if (this.filterKeyword) {
entries = entries.filter(e => 
e.name.toLowerCase().includes(this.filterKeyword) ||
e.path.toLowerCase().includes(this.filterKeyword)
);
return entries.map(e => new HistoryItem(e, this.meta.get(e.path)?.color, entries.length));
}
return entries.map(e => new HistoryItem(e, this.meta.get(e.path)?.color));
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
