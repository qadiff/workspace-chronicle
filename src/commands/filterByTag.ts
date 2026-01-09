import * as vscode from 'vscode';
import { MetaStore } from '../store/MetaStore';
import { ColorAliasStore } from '../store/ColorAliasStore';
import { WorkspacesProvider } from '../tree/WorkspacesProvider';
import { HistoryProvider } from '../tree/HistoryProvider';

interface QuickPickItemWithTag extends vscode.QuickPickItem {
	type?: 'label' | 'color' | 'clear';
	value?: string;
}

async function buildFilterItems(meta: MetaStore, colorAliases: ColorAliasStore): Promise<QuickPickItemWithTag[]> {
	const labels = await meta.getAllLabels();
	const colors = await meta.getAllColors();

	const items: QuickPickItemWithTag[] = [];

	// Add clear filter option
	items.push({
		label: '$(circle-slash) Clear filter',
		description: 'Show all items',
		type: 'clear'
	});

	// Add label options
	if (labels.length > 0) {
		items.push({
			label: 'Labels',
			kind: vscode.QuickPickItemKind.Separator
		});
		for (const label of labels) {
			items.push({
				label: `$(tag) ${label}`,
				description: 'Filter by label',
				type: 'label',
				value: label
			});
		}
	}

	// Add color options
	if (colors.length > 0) {
		items.push({
			label: 'Colors',
			kind: vscode.QuickPickItemKind.Separator
		});
		for (const color of colors) {
			const alias = await colorAliases.get(color);
			const displayName = alias ? `${alias} (${color})` : color;
			items.push({
				label: `$(circle-filled) ${displayName}`,
				description: 'Filter by color',
				type: 'color',
				value: color
			});
		}
	}

	return items;
}

export function registerFilterByTag(
	context: vscode.ExtensionContext,
	meta: MetaStore,
	colorAliases: ColorAliasStore,
	workspacesProvider: WorkspacesProvider,
	historyProvider: HistoryProvider
) {
	// Filter for Workspaces view only
	const runWorkspacesFilter = async () => {
		const items = await buildFilterItems(meta, colorAliases);

		if (items.length === 1) {
			vscode.window.showInformationMessage('No labels or colors found. Set labels or colors on workspaces first.');
			return;
		}

		const qp = vscode.window.createQuickPick<QuickPickItemWithTag>();
		qp.placeholder = 'Type to filter by name/path, or pick a label/color';
		qp.items = items;
		qp.canSelectMany = false;
		qp.matchOnDetail = true;
		qp.matchOnDescription = true;

		qp.onDidChangeValue((value) => {
			workspacesProvider.setNameFilter(value);
		});

		qp.onDidAccept(() => {
			const selected = qp.selectedItems[0];
			if (!selected) {
				qp.hide();
				return;
			}
			if (selected.type === 'clear') {
				workspacesProvider.clearTagFilter();
				workspacesProvider.clearNameFilter();
				vscode.window.setStatusBarMessage('Workspaces filter cleared', 3000);
			} else if ((selected.type === 'label' || selected.type === 'color') && selected.value) {
				workspacesProvider.setTagFilter(selected.type, selected.value);
				vscode.window.setStatusBarMessage(`Workspaces: Filtering by ${selected.type}: ${selected.value}`, 3000);
			}
			qp.hide();
		});

		qp.onDidHide(() => qp.dispose());
		qp.show();
	};

	// Filter for History view only
	const runHistoryFilter = async () => {
		const items = await buildFilterItems(meta, colorAliases);

		if (items.length === 1) {
			vscode.window.showInformationMessage('No labels or colors found. Set labels or colors on workspaces first.');
			return;
		}

		const qp = vscode.window.createQuickPick<QuickPickItemWithTag>();
		qp.placeholder = 'Pick a label/color to filter history';
		qp.items = items;
		qp.canSelectMany = false;
		qp.matchOnDetail = true;
		qp.matchOnDescription = true;

		qp.onDidAccept(() => {
			const selected = qp.selectedItems[0];
			if (!selected) {
				qp.hide();
				return;
			}
			if (selected.type === 'clear') {
				historyProvider.clearTagFilter();
				vscode.window.setStatusBarMessage('History filter cleared', 3000);
			} else if ((selected.type === 'label' || selected.type === 'color') && selected.value) {
				historyProvider.setTagFilter(selected.type, selected.value);
				vscode.window.setStatusBarMessage(`History: Filtering by ${selected.type}: ${selected.value}`, 3000);
			}
			qp.hide();
		});

		qp.onDidHide(() => qp.dispose());
		qp.show();
	};

	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.filterByTag', runWorkspacesFilter),
		vscode.commands.registerCommand('workspaceChronicle.filterByTagView', runWorkspacesFilter),
		vscode.commands.registerCommand('workspaceChronicle.filterHistoryByTag', runHistoryFilter),
		vscode.commands.registerCommand('workspaceChronicle.filterHistoryByTagView', runHistoryFilter)
	);
}
