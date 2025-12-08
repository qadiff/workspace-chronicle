import * as vscode from 'vscode';
import { WorkspacesProvider } from '../tree/WorkspacesProvider';
import { HistoryProvider } from '../tree/HistoryProvider';

export function registerClearFilters(
	context: vscode.ExtensionContext,
	workspacesProvider: WorkspacesProvider,
	historyProvider: HistoryProvider
) {
	const clearAll = () => {
		workspacesProvider.clearTagFilter();
		workspacesProvider.clearNameFilter();
		historyProvider.clearTagFilter();
		historyProvider.setFilter('');
		vscode.window.setStatusBarMessage('All filters cleared', 3000);
	};

	const clearWorkspaces = () => {
		workspacesProvider.clearTagFilter();
		workspacesProvider.clearNameFilter();
		vscode.window.setStatusBarMessage('Workspaces filters cleared', 3000);
	};

	const clearHistory = () => {
		historyProvider.clearTagFilter();
		historyProvider.setFilter('');
		vscode.window.setStatusBarMessage('History filters cleared', 3000);
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.clearAllFilters', clearAll),
		vscode.commands.registerCommand('workspaceChronicle.clearAllFiltersPalette', clearAll),
		vscode.commands.registerCommand('workspaceChronicle.clearWorkspacesFiltersView', clearWorkspaces),
		vscode.commands.registerCommand('workspaceChronicle.clearHistoryFiltersView', clearHistory)
	);
}
