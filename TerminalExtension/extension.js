// extension.js (Bottom‑Panel Launcher & Premium UX)
const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

const EXTENSION_ID = 'termino';
let cookPanel;

class LauncherProvider {
  constructor(extensionUri) {
    this.extensionUri = extensionUri;
    this.shortcuts = {};
  }

  async resolveWebviewView(webviewView) {
    this.webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(ev => {
      if (ev.type !== 'run') return;
      const key = ev.key.toLowerCase();
      if (key === 'h') {
        openCookbook(this.shortcuts);
        return;
      }
      const shortcut = this.shortcuts[key];
      if (shortcut && shortcut.cmd) {
        webviewView.webview.postMessage({ type: 'flash', char: key });
        runInTerminal(shortcut.cmd).then(() => {
          vscode.commands.executeCommand('workbench.action.closePanel');
        });
      } else {
        webviewView.webview.postMessage({ type: 'flash', char: '?' });
      }
    });
  }

  updateShortcuts(shortcuts) {
    this.shortcuts = shortcuts;
  }

  getHtml() {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    html, body {
      background-color: #111827;
      margin: 0; padding: 0; height: 100%;
      font-family: 'Segoe UI', sans-serif;
    }
    #overlay {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 6rem; color: rgba(255,255,255,0.85);
      opacity: 0; transition: opacity 0.3s;
      pointer-events: none; text-shadow: 1px 1px 6px #000;
    }
    .tip {
      position: absolute; bottom: 10px; width: 100%;
      text-align: center; color: #aaa; font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div id="overlay"></div>
  <div class="tip">💡 Press a key (H for help)</div>
  <script>
    const vscode = acquireVsCodeApi();
    const overlay = document.getElementById('overlay');
    window.addEventListener('keydown', e => {
      const k = e.key.toLowerCase();
      if (k.length === 1) vscode.postMessage({ type: 'run', key: k });
      e.preventDefault();
    });
    window.addEventListener('message', ev => {
      if (ev.data.type === 'flash') {
        overlay.textContent = ev.data.char.toUpperCase();
        overlay.style.opacity = '1';
        setTimeout(() => (overlay.style.opacity = '0'), 400);
      }
    });
  </script>
</body>
</html>`;
  }
}

async function activate(context) {
  console.log('Termino active');
  const launcher = new LauncherProvider(context.extensionUri);

  // Load shortcuts
  let shortcuts = await loadShortcuts();
  launcher.updateShortcuts(shortcuts);

  // Register bottom-panel view provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'termino.launcherView',
      launcher,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );

  // Edit shortcuts file command
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_ID}.editShortcuts`, editShortcutsFile)
  );

  // Reload shortcuts command
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_ID}.reloadShortcuts`, async () => {
      shortcuts = await loadShortcuts();
      launcher.updateShortcuts(shortcuts);
      vscode.window.showInformationMessage('✅ Termino shortcuts reloaded.');
    })
  );

  // QuickPick fallback command
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_ID}.quickLaunch`, async () => {
      const picks = Object.entries(shortcuts).map(([k, v]) => ({ label: k, description: v.desc }));
      const pick = await vscode.window.showQuickPick(picks, { placeHolder: 'Type key or select command' });
      if (pick) runInTerminal(shortcuts[pick.label].cmd);
    })
  );

  // Toggle launcher panel command
  context.subscriptions.push(
    vscode.commands.registerCommand(`${EXTENSION_ID}.toggleLauncher`, () => {
      if (launcher.webviewView) {
        launcher.webviewView.reveal();
      } else {
        // Use correct container command ID: workbench.view.termino
        vscode.commands.executeCommand('workbench.view.termino');
      }
    })
  );
}

async function editShortcutsFile() {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID);
  const rel = config.get('shortcutsPath');
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!ws) return vscode.window.showErrorMessage('Open a workspace first');
  const file = path.join(ws, rel);
  if (!fs.existsSync(file)) {
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, JSON.stringify(config.get('shortcuts', {}), null, 2));
  }
  const doc = await vscode.workspace.openTextDocument(file);
  await vscode.window.showTextDocument(doc, { preview: false });
}

async function loadShortcuts() {
  const cfg = vscode.workspace.getConfiguration(EXTENSION_ID);
  const defaults = cfg.get('shortcuts', {});
  const rel = cfg.get('shortcutsPath');
  const ws = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!rel || !ws) return defaults;
  const full = path.join(ws, rel);
  try {
    if (fs.existsSync(full)) {
      const txt = await fs.promises.readFile(full, 'utf8');
      return { ...defaults, ...JSON.parse(txt) };
    }
  } catch (e) {
    vscode.window.showWarningMessage(`⚠️ Could not load custom shortcuts: ${e.message}`);
  }
  return defaults;
}

function runInTerminal(cmd) {
  const term = vscode.window.activeTerminal || vscode.window.createTerminal({ name: 'Termino' });
  term.show(true);
  term.sendText(cmd);
  return Promise.resolve();
}

function openCookbook(map) {
  if (cookPanel) return cookPanel.reveal(vscode.ViewColumn.One);
  cookPanel = vscode.window.createWebviewPanel(
    'terminoCookbook',
    '📘 Termino Cookbook',
    vscode.ViewColumn.One,
    { enableScripts: false }
  );
  const rows = Object.entries(map)
    .map(([k, { cmd, desc }]) => `<tr><td><code>${k}</code></td><td><code>${cmd}</code></td><td>${desc || ''}</td></tr>`)
    .join('');
  cookPanel.webview.html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:'Segoe UI';background:#0f172a;color:#e2e8f0;margin:0;padding:1rem}
    h1{color:#7aa2f7}table{width:100%;border-collapse:collapse}
    th,td{padding:0.75rem;border-bottom:1px solid #334155}
    th{background:#1e293b;color:#f1f5f9;text-transform:uppercase;font-size:0.85rem}
  </style></head><body><h1>📘 Termino Cookbook</h1><table>
    <thead><tr><th>Key</th><th>Cmd</th><th>Description</th></tr></thead><tbody>${rows}</tbody>
  </table></body></html>`;
  cookPanel.onDidDispose(() => (cookPanel = null));
}

function deactivate() {}

module.exports = { activate, deactivate };
