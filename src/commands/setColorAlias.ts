import * as vscode from 'vscode';
import { ColorAliasStore } from '../store/ColorAliasStore';

const COLORS = [
	'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray'
];

interface ColorQuickPickItem extends vscode.QuickPickItem {
	colorValue: string;
}

export function registerSetColorAlias(
	context: vscode.ExtensionContext,
	colorAliases: ColorAliasStore,
	...refreshers: { refresh(): void }[]
) {
	context.subscriptions.push(
		vscode.commands.registerCommand('workspaceChronicle.setColorAlias', async () => {
			// Build color items with current aliases
			const items: ColorQuickPickItem[] = await Promise.all(
				COLORS.map(async (color) => {
					const alias = await colorAliases.get(color);
					return {
						label: alias ? `$(circle-filled) ${alias}` : `$(circle-filled) ${color}`,
						description: alias ? color : undefined,
						detail: alias ? 'Has alias' : 'No alias set',
						colorValue: color
					};
				})
			);

			// Show color picker
			const picked = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select a color to set alias'
			});

			if (!picked) return;

			const currentAlias = await colorAliases.get(picked.colorValue);

			// Show input box for alias
			const newAlias = await vscode.window.showInputBox({
				prompt: `Enter alias for "${picked.colorValue}" (leave empty to clear)`,
				value: currentAlias || '',
				placeHolder: 'e.g., 重要, In Progress, Done'
			});

			if (newAlias === undefined) return; // Cancelled

			const aliasToSet = newAlias.trim() || undefined;
			await colorAliases.set(picked.colorValue, aliasToSet);

			if (aliasToSet) {
				vscode.window.setStatusBarMessage(`Color alias set: ${picked.colorValue} → ${aliasToSet}`, 3000);
			} else {
				vscode.window.setStatusBarMessage(`Color alias cleared for ${picked.colorValue}`, 3000);
			}

			refreshers.forEach(r => r.refresh());
		})
	);
}
