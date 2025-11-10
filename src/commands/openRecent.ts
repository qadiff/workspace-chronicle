import * as vscode from 'vscode';
import * as path from 'path';
import { HistoryStore } from '../store/HistoryStore';
import { MetaStore } from '../store/MetaStore';
import { WorkspacesProvider } from '../tree/WorkspacesProvider';

export function registerQuickOpenRecent(
	context: vscode.ExtensionContext,
	history: HistoryStore,
	meta: MetaStore
) {
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.quickOpenRecent', async () => {
			const entries = history.getSorted();

			if (entries.length === 0) {
				vscode.window.showInformationMessage('No recent workspaces found.');
				return;
			}

			interface QuickPickItemWithPath extends vscode.QuickPickItem {
				fullPath: string;
			}

			const items: QuickPickItemWithPath[] = entries.map(entry => {
				const metadata = meta.get(entry.path);
				const displayName = metadata?.label || entry.name;
				const formattedDate = formatDate(entry.openedAt);

				return {
					label: `$(folder) ${displayName}`,
					description: formattedDate,
					detail: entry.path,
					fullPath: entry.path
				};
			});

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select a workspace to open',
				matchOnDescription: true,
				matchOnDetail: true
			});

			if (selected) {
				await vscode.commands.executeCommand('workspaceChronicle.open', selected.fullPath);
			}
		})
	);
}

export function registerQuickOpenWorkspaces(
	context: vscode.ExtensionContext,
	workspacesProvider: WorkspacesProvider,
	meta: MetaStore
) {
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.quickOpenWorkspaces', async () => {
			const workspaceItems = await workspacesProvider.getChildren();

			if (workspaceItems.length === 0) {
				vscode.window.showInformationMessage('No workspaces found.');
				return;
			}

			interface QuickPickItemWithPath extends vscode.QuickPickItem {
				fullPath: string;
			}

			const items: QuickPickItemWithPath[] = workspaceItems.map(item => {
				const metadata = meta.get(item.fullPath);
				const displayName = metadata?.label || path.basename(item.fullPath);

				return {
					label: `$(folder) ${displayName}`,
					description: metadata?.color || '',
					detail: item.fullPath,
					fullPath: item.fullPath
				};
			});

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select a workspace to open',
				matchOnDescription: true,
				matchOnDetail: true
			});

			if (selected) {
				await vscode.commands.executeCommand('workspaceChronicle.open', selected.fullPath);
			}
		})
	);
}

function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) {
		return 'Just now';
	} else if (diffMins < 60) {
		return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
	} else if (diffHours < 24) {
		return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
	} else if (diffDays < 7) {
		return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
	} else {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
}
