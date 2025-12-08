import * as vscode from 'vscode';


export function registerSetOpenMode(context: vscode.ExtensionContext) {
context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.setOpenMode', async () => {
const picked = await vscode.window.showQuickPick([
{ label: 'Open in New Window (default)', value: 'newWindow' },
{ label: 'Reuse Current Window', value: 'reuseWindow' }
], { placeHolder: 'Select default open mode' });
if (!picked) return;
const cfg = vscode.workspace.getConfiguration('workspaceChronicle');
await cfg.update('defaultOpenMode', picked.value, vscode.ConfigurationTarget.Global);
vscode.window.setStatusBarMessage(`Default open mode: ${picked.label}`, 3000);
})
);
}
