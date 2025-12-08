import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { HistoryStore, OpenMode } from '../store/HistoryStore';
import { MetaStore } from '../store/MetaStore';


export function registerOpenWorkspace(context: vscode.ExtensionContext, history: HistoryStore, _meta: MetaStore) {
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.open', async (fullPath: string) => {
			const config = vscode.workspace.getConfiguration('workspaceChronicle');
			const mode = config.get<OpenMode>('defaultOpenMode', 'newWindow');

			try {
				const stat = await fs.stat(fullPath);
				if (!stat.isFile()) {
					vscode.window.showErrorMessage(`Not a file: ${fullPath}`);
					return;
				}
			} catch (error) {
				vscode.window.showErrorMessage(`Workspace file not found: ${fullPath}`);
				return;
			}

			const uri = vscode.Uri.file(fullPath);
			const forceNewWindow = mode === 'newWindow';

			try {
				await vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow });
				history.add({
					name: path.basename(fullPath),
					path: fullPath,
					mode,
					openedAt: new Date().toISOString()
				});
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to open workspace: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		})
	);
}
