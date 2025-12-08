import * as vscode from 'vscode';

/**
 * Command to add a root directory
 */
export async function addRootDirectory(): Promise<void> {
	const result = await vscode.window.showOpenDialog({
		canSelectFiles: false,
		canSelectFolders: true,
		canSelectMany: false,
		title: 'Select Root Directory for Workspace Search',
		openLabel: 'Add Root'
	});

	if (!result || result.length === 0) {
		return;
	}

	const selectedPath = result[0].fsPath;
	const config = vscode.workspace.getConfiguration('workspaceChronicle');
	const currentRoots: string[] = config.get('roots', ['${userHome}']);

	if (currentRoots.includes(selectedPath)) {
		vscode.window.showInformationMessage(`This path is already in the roots list: ${selectedPath}`);
		return;
	}

	const newRoots = [...currentRoots, selectedPath];
	await config.update('roots', newRoots, vscode.ConfigurationTarget.Global);
	vscode.window.showInformationMessage(`Added root directory: ${selectedPath}`);
}

/**
 * Command to remove a root directory
 */
export async function removeRootDirectory(): Promise<void> {
	const config = vscode.workspace.getConfiguration('workspaceChronicle');
	const currentRoots: string[] = config.get('roots', ['${userHome}']);

	if (currentRoots.length === 0) {
		vscode.window.showInformationMessage('No root directories configured.');
		return;
	}

	const items = currentRoots.map(root => ({
		label: root,
		description: root === '${userHome}' ? 'Default home directory' : undefined
	}));

	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select a root directory to remove',
		canPickMany: false
	});

	if (!selected) {
		return;
	}

	const newRoots = currentRoots.filter(r => r !== selected.label);
	await config.update('roots', newRoots, vscode.ConfigurationTarget.Global);
	vscode.window.showInformationMessage(`Removed root directory: ${selected.label}`);
}

/**
 * Command to display the list of current root directories.
 */
export function listRootDirectories(): void {
	const config = vscode.workspace.getConfiguration('workspaceChronicle');
	const currentRoots: string[] = config.get('roots', ['${userHome}']);

	if (currentRoots.length === 0) {
		vscode.window.showInformationMessage('No root directories configured.');
		return;
	}

	const message = `Root directories (${currentRoots.length}): ${currentRoots.join(', ')}`;
	vscode.window.showInformationMessage(message);
}




