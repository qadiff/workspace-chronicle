import * as vscode from 'vscode';
import { MetaStore } from '../store/MetaStore';
import { ColorAliasStore } from '../store/ColorAliasStore';


const COLORS = [
'red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink', 'gray', 'none'
];

interface ColorQuickPickItem extends vscode.QuickPickItem {
	colorValue: string;
}

export function registerSetColor(
context: vscode.ExtensionContext,
meta: MetaStore,
colorAliases: ColorAliasStore,
...refreshers: { refresh(): void }[]
) {
context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.setColor', async (item?: { fullPath: string } | string) => {
let fullPath: string | undefined;

// Called from context menu (TreeItem) or command palette
if (item && typeof item === 'object' && 'fullPath' in item) {
fullPath = item.fullPath;
} else if (typeof item === 'string') {
fullPath = item;
} else {
fullPath = await vscode.window.showInputBox({ prompt: 'Target workspace path' });
}

if (!fullPath) return;

// Build color items with aliases
const items: ColorQuickPickItem[] = await Promise.all(
	COLORS.map(async (color) => {
		if (color === 'none') {
			return {
				label: 'none',
				description: 'Clear color',
				colorValue: color
			};
		}
		const alias = await colorAliases.get(color);
		return {
			label: alias ? `${alias} (${color})` : color,
			colorValue: color
		};
	})
);

const picked = await vscode.window.showQuickPick(items, { placeHolder: 'Pick a color' });
const color = picked && picked.colorValue !== 'none' ? picked.colorValue : undefined;
await meta.set(fullPath, { color });
refreshers.forEach(r => r.refresh());
})
);
}
