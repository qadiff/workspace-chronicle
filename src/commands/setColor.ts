import * as vscode from 'vscode';
import { MetaStore } from '../store/MetaStore';


const COLORS = [
'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray', 'none'
];


export function registerSetColor(
context: vscode.ExtensionContext,
meta: MetaStore,
...refreshers: { refresh(): void }[]
) {
context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.setColor', async (fullPath?: string) => {
if (!fullPath) fullPath = await vscode.window.showInputBox({ prompt: 'Target workspace path' });
if (!fullPath) return;


const picked = await vscode.window.showQuickPick(COLORS, { placeHolder: 'Pick a color' });
const color = picked && picked !== 'none' ? picked : undefined;
meta.set(fullPath, { color });
refreshers.forEach(r => r.refresh());
})
);
}
