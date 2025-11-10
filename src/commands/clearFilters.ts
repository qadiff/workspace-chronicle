import * as vscode from 'vscode';
import { WorkspacesProvider } from '../tree/WorkspacesProvider';
import { HistoryProvider } from '../tree/HistoryProvider';

export function registerClearFilters(
	context: vscode.ExtensionContext,
	workspacesProvider: WorkspacesProvider,
	historyProvider: HistoryProvider
) {
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.clearAllFilters', async () => {
			// Clear all filters
			workspacesProvider.clearTagFilter();
			historyProvider.clearTagFilter();
			historyProvider.setFilter('');

			vscode.window.showInformationMessage('All filters cleared');
		})
	);
}
