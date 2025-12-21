import * as vscode from 'vscode';
import { MetaStore } from '../store/MetaStore';

export function registerSetLabel(
	context: vscode.ExtensionContext,
	meta: MetaStore,
	...refreshers: { refresh(): void }[]
) {
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.setLabel', async (item?: { fullPath: string } | string) => {
			let fullPath: string | undefined;

		// Called from context menu (TreeItem) or command palette
		if (item && typeof item === 'object' && 'fullPath' in item) {
			fullPath = item.fullPath;
			} else if (typeof item === 'string') {
				fullPath = item;
			} else {
				fullPath = await vscode.window.showInputBox({ prompt: 'Target workspace path' });
			}

			if (!fullPath) {
				return;
			}
			const label = await vscode.window.showInputBox({ prompt: 'Custom name (empty to clear)' });
			await meta.set(fullPath, { label: label || undefined });
			refreshers.forEach(r => r.refresh());
		})
	);
}
