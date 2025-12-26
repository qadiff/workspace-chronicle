import * as vscode from 'vscode';
import { WorkspacesProvider } from './tree/WorkspacesProvider';
import { HistoryItem, HistoryProvider } from './tree/HistoryProvider';
import { registerOpenWorkspace } from './commands/openWorkspace';
import { registerQuickOpenRecent, registerQuickOpenWorkspaces } from './commands/openRecent';
import { registerSetOpenMode } from './commands/setOpenMode';
import { registerSetLabel } from './commands/setLabel';
import { registerSetColor } from './commands/setColor';
import { registerFilterHistory } from './commands/filterHistory';
import { registerCopyFullPath } from './commands/copyFullPath';
import { registerFilterByTag } from './commands/filterByTag';
import { registerClearFilters } from './commands/clearFilters';
import { registerExportImport } from './commands/exportImport';
import { addRootDirectory, removeRootDirectory, listRootDirectories } from './commands/configureRoots';
import { HistoryStore } from './store/HistoryStore';
import { MetaStore } from './store/MetaStore';
import { WorkspaceFilesStore } from './store/WorkspaceFilesStore';

export function activate(context: vscode.ExtensionContext) {
	const history = new HistoryStore(context);
	const meta = new MetaStore(context);
	const workspaceFiles = new WorkspaceFilesStore();

	const workspacesProvider = new WorkspacesProvider(meta, history, workspaceFiles);
	const historyProvider = new HistoryProvider(history, meta);

	const workspacesView = vscode.window.createTreeView('workspaceChronicle.workspaces', {
		treeDataProvider: workspacesProvider,
		showCollapseAll: true
	});
	const historyView = vscode.window.createTreeView('workspaceChronicle.history', {
		treeDataProvider: historyProvider,
		showCollapseAll: true
	});

	context.subscriptions.push(workspacesView, historyView);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((event) => {
			if (
				event.affectsConfiguration('workspaceChronicle.roots') ||
				event.affectsConfiguration('workspaceChronicle.scanTimeoutMs') ||
				event.affectsConfiguration('workspaceChronicle.scanWhenWorkspaceFileOpen') ||
				event.affectsConfiguration('workspaceChronicle.scanWhenNoFolderOpen') ||
				event.affectsConfiguration('workspaceChronicle.scanUseDefaultIgnore') ||
				event.affectsConfiguration('workspaceChronicle.scanIgnore') ||
				event.affectsConfiguration('workspaceChronicle.scanRespectGitignore') ||
				event.affectsConfiguration('workspaceChronicle.scanStopAtWorkspaceFile') ||
				event.affectsConfiguration('workspaceChronicle.scanUpdateIntervalMs')
			) {
				workspacesProvider.refresh();
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.refresh', () => {
			workspacesProvider.refresh();
			historyProvider.refresh();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.clearScanCacheAndRescan', async () => {
			await workspacesProvider.clearScanCacheAndRescan();
			vscode.window.setStatusBarMessage('Rescanning workspaces...', 3000);
		})
	);

	registerOpenWorkspace(context, history, meta);
	registerQuickOpenRecent(context, history, meta);
	registerQuickOpenWorkspaces(context, workspacesProvider, meta);
	registerSetOpenMode(context);
	registerSetLabel(context, meta, workspacesProvider, historyProvider);
	registerSetColor(context, meta, workspacesProvider, historyProvider);
	registerFilterHistory(context, historyProvider);
	registerFilterByTag(context, meta, workspacesProvider, historyProvider);
	registerClearFilters(context, workspacesProvider, historyProvider);
	registerExportImport(context, meta, history);
	registerCopyFullPath(context);

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.toggleSort', async () => {
			const newMode = await historyProvider.toggleSort();
			vscode.window.setStatusBarMessage(`History sort mode: ${newMode}`, 3000);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.removeFromHistory', async (item?: HistoryItem) => {
			const pathToRemove = item?.entry?.path;
			if (!pathToRemove) {
				vscode.window.showInformationMessage('Run this command from a History item context menu.');
				return;
			}
			const removed = await historyProvider.removeFromHistory(pathToRemove);
			if (removed) {
				vscode.window.setStatusBarMessage('Removed from history.', 3000);
			} else {
				vscode.window.setStatusBarMessage('History entry not found.', 3000);
			}
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.clearHistory', async () => {
			const answer = await vscode.window.showWarningMessage(
				'Clear all workspace history?',
				{ modal: true },
				'Clear'
			);
			if (answer !== 'Clear') {
				return;
			}
			await historyProvider.clearHistory();
			vscode.window.setStatusBarMessage('History cleared.', 3000);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.addRootDirectory', addRootDirectory),
		vscode.commands.registerCommand('workspaceChronicle.removeRootDirectory', removeRootDirectory),
		vscode.commands.registerCommand('workspaceChronicle.listRootDirectories', listRootDirectories)
	);
}

export function deactivate() {}
