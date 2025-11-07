import * as vscode from 'vscode';


export function registerSetOpenMode(context: vscode.ExtensionContext) {
context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.setOpenMode', async () => {
const picked = await vscode.window.showQuickPick([
{ label: 'Open in New Window (default)', value: 'newWindow' },
{ label: 'Reuse Current Window', value: 'reuseWindow' }
], { placeHolder: 'Select default open mode' });
if (!picked) return;
const cfg = vscode.workspace.getConfiguration();
await cfg.update('workspaceChronicle.defaultOpenMode', picked.value, vscode.ConfigurationTarget.Global);
vscode.window.showInformationMessage(`Default open mode: ${picked.label}`);
})
);
}
