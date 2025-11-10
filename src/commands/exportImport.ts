import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MetaStore } from '../store/MetaStore';
import { HistoryStore } from '../store/HistoryStore';

interface ExportData {
	version: string;
	exportedAt: string;
	meta: Record<string, { label?: string; color?: string }>;
	history: Array<{
		name: string;
		path: string;
		mode: 'newWindow' | 'reuseWindow';
		openedAt: string;
		count?: number;
	}>;
}

/**
 * Determines the default directory for export/import dialogs
 * @param workspaceFile The current workspace file URI, if any
 * @returns The default directory path, or undefined if none can be determined
 */
export function getDefaultDirectory(workspaceFile?: vscode.Uri): string | undefined {
	if (workspaceFile && workspaceFile.scheme === 'file') {
		// If workspace is open, use workspace file directory
		// Normalize to forward slashes for cross-platform consistency
		return path.dirname(workspaceFile.fsPath).replace(/\\/g, '/');
	} else {
		// Otherwise use user's home directory
		return process.env.HOME || process.env.USERPROFILE;
	}
}

export function registerExportImport(
	context: vscode.ExtensionContext,
	metaStore: MetaStore,
	historyStore: HistoryStore
) {
	// Export command
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.exportData', async () => {
			try {
				const exportData: ExportData = {
					version: '1.0',
					exportedAt: new Date().toISOString(),
					meta: metaStore.getAll(),
					history: historyStore.getAll()
				};

				// Determine default directory
				const defaultDir = getDefaultDirectory(vscode.workspace.workspaceFile);

				const fileName = `workspace-chronicle-export-${new Date().toISOString().split('T')[0]}.json`;
				const defaultUri = vscode.Uri.file(
					defaultDir ? path.join(defaultDir, fileName) : path.join(process.cwd(), fileName)
				);

				const uri = await vscode.window.showSaveDialog({
					defaultUri,
					filters: {
						'JSON': ['json']
					},
					title: 'Export Workspace Chronicle Data'
				});

				if (!uri) {
					return;
				}

				await fs.writeFile(uri.fsPath, JSON.stringify(exportData, null, 2), 'utf-8');

				const metaCount = Object.keys(exportData.meta).length;
				const historyCount = exportData.history.length;

				vscode.window.showInformationMessage(
					`Exported ${metaCount} workspace metadata and ${historyCount} history entries to ${uri.fsPath}`
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to export data: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		})
	);

	// Import command
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.importData', async () => {
			try {
				// Determine default directory
				const defaultDir = getDefaultDirectory(vscode.workspace.workspaceFile);
				const defaultUri = defaultDir ? vscode.Uri.file(defaultDir) : undefined;

				const uris = await vscode.window.showOpenDialog({
					canSelectMany: false,
					filters: {
						'JSON': ['json']
					},
					title: 'Import Workspace Chronicle Data',
					openLabel: 'Import',
					defaultUri
				});

				if (!uris || uris.length === 0) {
					return;
				}

				const fileContent = await fs.readFile(uris[0].fsPath, 'utf-8');
				const importData = JSON.parse(fileContent) as ExportData;

				// Validate data structure
				if (
					!importData.version ||
					typeof importData.meta !== 'object' ||
					importData.meta === null ||
					!Array.isArray(importData.history)
				) {
					vscode.window.showErrorMessage('Invalid import file format');
					return;
				}

				// Show confirmation dialog
				const metaCount = Object.keys(importData.meta).length;
				const historyCount = importData.history.length;

				const answer = await vscode.window.showWarningMessage(
					`Import ${metaCount} workspace metadata and ${historyCount} history entries?\n\nThis will merge with existing data.`,
					{ modal: true },
					'Import',
					'Cancel'
				);

				if (answer !== 'Import') {
					return;
				}

				// Import metadata
				for (const [path, metadata] of Object.entries(importData.meta)) {
					metaStore.set(path, metadata);
				}

				// Import history
				for (const entry of importData.history) {
					historyStore.add(entry);
				}

				// Show success message
				vscode.window.showInformationMessage(
					`Successfully imported ${metaCount} metadata and ${historyCount} history entries.\n\nExported at: ${importData.exportedAt}`
				);
			} catch (error) {
				vscode.window.showErrorMessage(
					`Failed to import data: ${error instanceof Error ? error.message : String(error)}`
				);
			}
		})
	);
}
