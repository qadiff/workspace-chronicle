import * as vscode from 'vscode';
import { HistoryProvider } from '../tree/HistoryProvider';


export function registerFilterHistory(context: vscode.ExtensionContext, historyProvider: HistoryProvider) {
context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.filterHistory', async () => {
const keyword = await vscode.window.showInputBox({
prompt: 'Filter history by keyword (case-insensitive)',
placeHolder: 'Enter keyword to filter...',
value: ''
});


if (keyword !== undefined) {
historyProvider.setFilter(keyword);
}
})
);
}

