import * as vscode from 'vscode';
import { HistoryProvider } from '../tree/HistoryProvider';


export function registerFilterHistory(context: vscode.ExtensionContext, historyProvider: HistoryProvider) {
context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.filterHistory', async () => {
const qp = vscode.window.createQuickPick();
qp.placeholder = 'Enter keyword to filter history...';
qp.canSelectMany = false;
qp.items = [{ label: '$(clear-all) Clear Filter', alwaysShow: true }];

qp.onDidChangeValue((value) => {
  if (value) {
    qp.items = [
      { label: '$(clear-all) Clear Filter', alwaysShow: true },
      { label: `$(search) Filter: "${value}"`, description: 'Press Enter to apply' }
    ];
  } else {
    qp.items = [{ label: '$(clear-all) Clear Filter', alwaysShow: true }];
  }
});

qp.onDidAccept(() => {
  const selected = qp.selectedItems[0];
  if (selected?.label.includes('Clear Filter')) {
    historyProvider.setFilter('');
  } else {
    historyProvider.setFilter(qp.value);
  }
  qp.hide();
});

qp.onDidHide(() => qp.dispose());
qp.show();
})
);
}