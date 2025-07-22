// extension.js (Enhanced & Polished Termino with Quick Launch)
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const EXTENSION_ID = 'termino';
let cookPanel;

async function activate(context) {
    console.log('Termino is now active!');

    const shortcuts = await loadShortcuts();

    // Reload Shortcuts Command
    context.subscriptions.push(
        vscode.commands.registerCommand(`${EXTENSION_ID}.reloadShortcuts`, async () => {
            const updated = await loadShortcuts();
            Object.assign(shortcuts, updated);
            vscode.window.showInformationMessage('✅ Termino shortcuts reloaded.');
        })
    );

    // Edit Shortcuts Command
    context.subscriptions.push(
        vscode.commands.registerCommand(`${EXTENSION_ID}.editShortcuts`, async () => {
            const config = vscode.workspace.getConfiguration(EXTENSION_ID);
            const relPath = config.get('shortcutsPath');
            const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!ws) return vscode.window.showErrorMessage('📂 Open a workspace to edit Termino shortcuts.');

            const file = path.join(ws, relPath);
            if (!fs.existsSync(file)) {
                await fs.promises.mkdir(path.dirname(file), { recursive: true });
                await fs.promises.writeFile(file, JSON.stringify(config.get('shortcuts', {}), null, 2));
            }
            const doc = await vscode.workspace.openTextDocument(file);
            vscode.window.showTextDocument(doc, { preview: false });
        })
    );

    // Quick Launch via Command
    context.subscriptions.push(
        vscode.commands.registerCommand(`${EXTENSION_ID}.quickLaunch`, async () => {
            const picks = Object.entries(shortcuts).map(([k, v]) => ({ label: k, description: v.desc }));
            const pick = await vscode.window.showQuickPick(picks, { placeHolder: 'Press a key or select a command' });
            if (pick) runInTerminal(shortcuts[pick.label].cmd);
        })
    );

    // Toggle Launcher Panel
    context.subscriptions.push(
        vscode.commands.registerCommand(`${EXTENSION_ID}.toggleLauncher`, () => {
            vscode.commands.executeCommand('workbench.view.extension.termino');
        })
    );

    // Create Launcher Webview Panel
    const launcherPanel = vscode.window.createWebviewPanel(
        'terminoLauncher',
        '🚀 Termino Launcher',
        { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
        { enableScripts: true, retainContextWhenHidden: true }
    );
    launcherPanel.webview.html = getLauncherHtml();

    // Handle Messages from Webview (Key Presses)
    launcherPanel.webview.onDidReceiveMessage(async message => {
        if (message.type !== 'run') return;
        const key = message.key.toLowerCase();

        if (key === 'h') {
            openCookbook(shortcuts);
            return;
        }
        if (key === 'q') {
            // Quick Launch from Launcher
            const picks = Object.entries(shortcuts).map(([k, v]) => ({ label: k, description: v.desc }));
            const pick = await vscode.window.showQuickPick(picks, { placeHolder: 'Quick Launch: select command' });
            if (pick) runInTerminal(shortcuts[pick.label].cmd);
            return;
        }
        const shortcut = shortcuts[key];
        if (shortcut?.cmd) {
            launcherPanel.webview.postMessage({ type: 'flash', char: key });
            runInTerminal(shortcut.cmd);
        } else {
            launcherPanel.webview.postMessage({ type: 'flash', char: '?' });
        }
    });
}

// Generate HTML for Launcher Webview
function getLauncherHtml() {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html, body {
      background-color: #111827;
      margin: 0;
      padding: 0;
      height: 100%;
      font-family: 'Segoe UI', sans-serif;
    }
    #overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 8rem;
      color: rgba(255, 255, 255, 0.85);
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      pointer-events: none;
      text-shadow: 2px 2px 8px #000;
    }
    .tip {
      position: absolute;
      bottom: 20px;
      width: 100%;
      text-align: center;
      color: #aaa;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>
  <div id="overlay"></div>
  <div class="tip">💡 Press a shortcut key. Try <b>H</b> for help, <b>Q</b> for quick launch.</div>
  <script>
    const vscode = acquireVsCodeApi();
    const overlay = document.getElementById('overlay');
    window.addEventListener('keydown', e => {
      const key = e.key.toLowerCase();
      if (key.length === 1) vscode.postMessage({ type: 'run', key });
      e.preventDefault();
    });
    window.addEventListener('message', ev => {
      if (ev.data.type === 'flash') {
        overlay.textContent = ev.data.char.toUpperCase();
        overlay.style.opacity = 1;
        setTimeout(() => overlay.style.opacity = 0, 500);
      }
    });
  </script>
</body>
</html>`;
}

async function loadShortcuts() {
    const cfg = vscode.workspace.getConfiguration(EXTENSION_ID);
    const defaults = cfg.get('shortcuts', {});
    const rel = cfg.get('shortcutsPath');
    const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!rel || !ws) return defaults;

    const file = path.join(ws, rel);
    try {
        if (fs.existsSync(file)) {
            const data = await fs.promises.readFile(file, 'utf8');
            return { ...defaults, ...JSON.parse(data) };
        }
    } catch (e) {
        vscode.window.showWarningMessage(`⚠️ Could not load shortcuts: ${e.message}`);
    }
    return defaults;
}

function runInTerminal(cmd) {
    const term = vscode.window.activeTerminal || vscode.window.createTerminal({ name: 'Termino' });
    term.show(true);
    term.sendText(cmd);
}

function openCookbook(map) {
    if (cookPanel) {
        cookPanel.reveal(vscode.ViewColumn.One);
        return;
    }
    cookPanel = vscode.window.createWebviewPanel(
        'terminoCookbook', '📘 Termino Cookbook', vscode.ViewColumn.One,
        { enableScripts: false }
    );
    const rows = Object.entries(map)
        .map(([k, { cmd, desc }]) => `<tr><td><code>${k}</code></td><td><code>${cmd}</code></td><td>${desc || ''}</td></tr>`)
        .join('');
    cookPanel.webview.html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:'Segoe UI';background:#0f172a;color:#e2e8f0;padding:1rem}
        h1{color:#7aa2f7}table{width:100%;border-collapse:collapse}
        th,td{padding:0.75rem;border-bottom:1px solid #334155}
        th{background:#1e293b;color:#f1f5f9;text-transform:uppercase}
    </style></head><body><h1>📘 Termino Cookbook</h1><table><thead>
        <tr><th>Key</th><th>Cmd</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    cookPanel.onDidDispose(() => (cookPanel = null));
}

function deactivate() {}

module.exports = { activate, deactivate };
