import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "close-saved" is now active!');

  let disposable = vscode.commands.registerCommand('closeOthersNotSaved.execute', async () => {
    const tabGroups = vscode.window.tabGroups.all;
    const tabsToClose: vscode.Tab[] = [];

    tabGroups.forEach(group => {
      group.tabs.forEach(tab => {
        if (tab.isDirty) return;
        tabsToClose.push(tab);
      });
    });

    if (tabsToClose.length == 0) {
      vscode.window.showInformationMessage('No saved tabs to close.');
      return;
    }

    // Close tabs in batches or one by one. Using close with preserveFocus false is usually fine.
    // Note: vscode.window.tabGroups.close accepts functionality to close multiple tabs.
    await vscode.window.tabGroups.close(tabsToClose);
    vscode.window.showInformationMessage(`Closed ${tabsToClose.length} saved tabs.`);
  });

  let tempDisposable = vscode.commands.registerCommand('closeOthersNotSaved.closeOthersNotSaved', async (targetUri: vscode.Uri) => {
    if (!targetUri) {
      const activeTab = vscode.window.tabGroups.activeTabGroup.activeTab;
      // If executed from command palette without context, we might rely on active editor
      if (activeTab) {
        const input = activeTab.input;
        if (input instanceof vscode.TabInputText) {
          targetUri = input.uri;
        }
      }
    }

    if (!targetUri) {
      vscode.window.showErrorMessage("Could not determine context for 'Close Others Saved'.");
      return;
    }

    // We assume the action is for the active tab group usually, or we try to find the group containing the URI.
    // Since 'Close Others' is typically group-specific, we'll look in the active group first.
    const group = vscode.window.tabGroups.activeTabGroup;
    const tabsToClose: vscode.Tab[] = [];

    // Find the target tab in the group
    const targetTab = group.tabs.find(tab => {
      const input = tab.input;
      if (input instanceof vscode.TabInputText) {
        return input.uri.toString() === targetUri.toString();
      }
      // Add other input types if necessary, e.g. custom editors
      // For now, handling text tabs is the primary use case.
      // Just comparing stringified inputs might be safer if types vary? 
      // Better to rely on URI check for standard files.
      // If checking 'input.uri' exists:
      return (input as any)?.uri?.toString() === targetUri.toString();
    });

    if (!targetTab) {
      // Fallback: If not in active group, check all groups?
      // But 'Close Others' implies "Others in THIS group".
      // If the user right-clicked a background tab, it usually makes that group active or at least focuses it?
      // VS Code behavior: Right clicking a tab creates a context where that tab is the subject.
      // However, identifying the *group* from just the URI is hard if it's open in multiple places.
      // We'll proceed only if found in active group for safety.
      vscode.window.showWarningMessage("Could not find the target tab in the active group.");
      return;
    }

    for (const tab of group.tabs) {
      if (tab !== targetTab && !tab.isDirty) {
        tabsToClose.push(tab);
      }
    }

    if (tabsToClose.length > 0) {
      await vscode.window.tabGroups.close(tabsToClose);
      // Optional: Show message? Standard VS Code commands usually don't verify with toast for simple close actions, but feedback is good.
      vscode.window.showInformationMessage(`Closed ${tabsToClose.length} other saved tabs.`);
    }
  });

  context.subscriptions.push(disposable);
  context.subscriptions.push(tempDisposable);
}

export function deactivate() { }
