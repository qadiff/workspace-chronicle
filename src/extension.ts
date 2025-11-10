import * as vscode from 'vscode';
import { WorkspacesProvider } from './tree/WorkspacesProvider';
import { HistoryProvider } from './tree/HistoryProvider';
import { registerOpenWorkspace } from './commands/openWorkspace';
import { registerQuickOpenRecent, registerQuickOpenWorkspaces } from './commands/openRecent';
import { registerSetOpenMode } from './commands/setOpenMode';
import { registerSetLabel } from './commands/setLabel';
import { registerSetColor } from './commands/setColor';
import { registerFilterHistory } from './commands/filterHistory';
import { registerCopyFullPath } from './commands/copyFullPath';
import { registerFilterByTag } from './commands/filterByTag';
import { HistoryStore } from './store/HistoryStore';
import { MetaStore } from './store/MetaStore';

export function activate(context: vscode.ExtensionContext) {
	const history = new HistoryStore(context);
	const meta = new MetaStore(context);

	const workspacesProvider = new WorkspacesProvider(meta, history);
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
		vscode.commands.registerCommand('workspaceChronicle.refresh', () => {
			workspacesProvider.refresh();
			historyProvider.refresh();
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
	registerCopyFullPath(context);

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.toggleSort', () => {
			const newMode = historyProvider.toggleSort();
			vscode.window.showInformationMessage(`History sort mode: ${newMode}`);
		})
	);
}

export function deactivate() {}
