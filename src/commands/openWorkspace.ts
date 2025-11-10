import * as vscode from 'vscode';
import { HistoryStore, OpenMode } from '../store/HistoryStore';
import { MetaStore } from '../store/MetaStore';
import * as path from 'path';


export function registerOpenWorkspace(context: vscode.ExtensionContext, history: HistoryStore, _meta: MetaStore) {
context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.open', async (fullPath: string) => {
const config = vscode.workspace.getConfiguration('workspaceChronicle');
const mode = (config.get<string>('workspaceChronicle.defaultOpenMode') as OpenMode) || 'newWindow';


// 履歴に記録
history.add({
name: path.basename(fullPath),
path: fullPath,
mode,
openedAt: new Date().toISOString()
});


const uri = vscode.Uri.file(fullPath);
const forceNewWindow = mode === 'newWindow';
await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow });
})
);
}
