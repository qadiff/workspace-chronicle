import * as vscode from 'vscode';

export function registerCopyFullPath(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.copyFullPath', async (item: any) => {
			if (!item || !item.fullPath) {
				vscode.window.showErrorMessage('No workspace item selected');
				return;
			}
			await vscode.env.clipboard.writeText(item.fullPath);
			vscode.window.showInformationMessage(`Copied: ${item.fullPath}`);
		})
	);
}
