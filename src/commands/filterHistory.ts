import * as vscode from 'vscode';
import { HistoryProvider } from '../tree/HistoryProvider';


export function registerFilterHistory(context: vscode.ExtensionContext, historyProvider: HistoryProvider) {
const run = () => {
const qp = vscode.window.createQuickPick();
qp.placeholder = 'Enter keyword to filter history...';
qp.canSelectMany = false;
qp.items = [{ label: '$(clear-all) Clear Filter', alwaysShow: true }];

qp.onDidChangeValue((value) => {
  // リアルタイムにフィルタ適用
  historyProvider.setFilter(value);
  
  if (value) {
    qp.items = [
      { label: '$(clear-all) Clear Filter', alwaysShow: true },
      { label: `$(search) Filtering: "${value}"` }
    ];
  } else {
    qp.items = [{ label: '$(clear-all) Clear Filter', alwaysShow: true }];
  }
});

qp.onDidAccept(() => {
  const selected = qp.selectedItems[0];
  if (selected?.label.includes('Clear Filter')) {
    historyProvider.setFilter('');
  }
  // フィルタは既にリアルタイムで適用済み
  qp.hide();
});

qp.onDidHide(() => qp.dispose());
qp.show();
};

context.subscriptions.push(
vscode.commands.registerCommand('workspaceChronicle.filterHistory', run),
vscode.commands.registerCommand('workspaceChronicle.filterHistoryView', run)
);
}
