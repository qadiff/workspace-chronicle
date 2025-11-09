import * as vscode from 'vscode';
import { MetaStore } from '../store/MetaStore';
import { WorkspacesProvider } from '../tree/WorkspacesProvider';
import { HistoryProvider } from '../tree/HistoryProvider';

export function registerFilterByTag(
	context: vscode.ExtensionContext,
	meta: MetaStore,
	workspacesProvider: WorkspacesProvider,
	historyProvider: HistoryProvider
) {
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.filterByTag', async () => {
			const labels = meta.getAllLabels();
			const colors = meta.getAllColors();

			interface QuickPickItemWithTag extends vscode.QuickPickItem {
				type?: 'label' | 'color' | 'clear';
				value?: string;
			}

			const items: QuickPickItemWithTag[] = [];

			// Add clear filter option
			items.push({
				label: '$(circle-slash) Clear filter',
				description: 'Show all workspaces',
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
					items.push({
						label: `$(circle-filled) ${color}`,
						description: 'Filter by color',
						type: 'color',
						value: color
					});
				}
			}

			if (items.length === 1) {
				vscode.window.showInformationMessage('No labels or colors found. Set labels or colors on workspaces first.');
				return;
			}

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select a label or color to filter by'
			});

			if (!selected) {
				return;
			}

			if (selected.type === 'clear') {
				workspacesProvider.clearTagFilter();
				historyProvider.clearTagFilter();
				vscode.window.showInformationMessage('Filter cleared');
			} else if (selected.type && selected.value) {
				workspacesProvider.setTagFilter(selected.type, selected.value);
				historyProvider.setTagFilter(selected.type, selected.value);
				vscode.window.showInformationMessage(`Filtering by ${selected.type}: ${selected.value}`);
			}
		})
	);
}
