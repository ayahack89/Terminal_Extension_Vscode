const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let disposable = vscode.commands.registerCommand('terminal-extension.runTerminalCommand', function () {
        const terminal = vscode.window.createTerminal(`My Custom Terminal`);
        terminal.show();
        terminal.sendText('echo Hello from VS Code Extension!');
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
