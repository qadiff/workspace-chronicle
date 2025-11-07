import * as vscode from 'vscode';
import { MetaStore } from '../store/MetaStore';


export function registerSetLabel(
context: vscode.ExtensionContext,
meta: MetaStore,
...refreshers: { refresh(): void }[]
) {
context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.setLabel', async (fullPath?: string) => {
if (!fullPath) fullPath = await vscode.window.showInputBox({ prompt: 'Target workspace path' });
if (!fullPath) return;
const label = await vscode.window.showInputBox({ prompt: 'Label (empty to clear)' });
meta.set(fullPath, { label: label || undefined });
refreshers.forEach(r => r.refresh());
})
);
}
