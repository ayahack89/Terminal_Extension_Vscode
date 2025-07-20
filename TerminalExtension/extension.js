const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

// --- CONSTANTS ---
const EXTENSION_ID = 'termino';

// --- STATE (Module Scope) ---
// Keep a reference to the cookbook panel to avoid creating duplicates.
let cookPanel;

// =================================================================================
// ACTIVATE FUNCTION (Main Entry Point)
// =================================================================================

/**
 * This function is called when the extension is activated.
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    console.log('Termino is now active!');

    // 1. Load shortcuts from settings and the user's workspace file.
    let shortcuts = await loadShortcuts();

    // 2. Register a command to reload shortcuts from the file.
    const reloadCmd = vscode.commands.registerCommand(`${EXTENSION_ID}.reloadShortcuts`, async () => {
        shortcuts = await loadShortcuts();
        vscode.window.showInformationMessage('Termino shortcuts reloaded.');
    });
    context.subscriptions.push(reloadCmd);

    // 3. Register a command to edit the shortcuts.json file.
    const editCmd = vscode.commands.registerCommand(`${EXTENSION_ID}.editShortcuts`, async () => {
        const config = vscode.workspace.getConfiguration(EXTENSION_ID);
        const relPath = config.get('shortcutsPath');
        const wsFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

        if (!wsFolder) {
            return vscode.window.showErrorMessage('Open a workspace to edit Termino shortcuts.');
        }

        const fullPath = path.join(wsFolder, relPath);

        // If the file doesn't exist, create it with default content.
        if (!fs.existsSync(fullPath)) {
            try {
                const defaultMap = config.get('shortcuts', {});
                await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
                await fs.promises.writeFile(fullPath, JSON.stringify(defaultMap, null, 2));
            } catch (e) {
                return vscode.window.showErrorMessage(`Failed to create shortcuts file: ${e.message}`);
            }
        }

        // Open the file in the editor.
        const doc = await vscode.workspace.openTextDocument(fullPath);
        vscode.window.showTextDocument(doc, { preview: false });
    });
    context.subscriptions.push(editCmd);

    // 4. Create the invisible webview panel to capture key presses.
    const launcherPanel = vscode.window.createWebviewPanel(
        'terminoLauncher',
        'Termino Launcher',
        { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
        { enableScripts: true, retainContextWhenHidden: true }
    );
    launcherPanel.webview.html = getLauncherHtml();
    context.subscriptions.push(launcherPanel);


    // 5. Listen for messages (key presses) from the webview.
    launcherPanel.webview.onDidReceiveMessage(message => {
        if (message.type !== 'run') return;

        const key = message.key.toLowerCase();

        // Special key 'h' to open the help/cookbook view.
        if (key === 'h') {
            openCookbook(shortcuts);
            return;
        }

        const shortcut = shortcuts[key];

        // If a valid shortcut is found, run its command.
        if (shortcut && shortcut.cmd) {
            launcherPanel.webview.postMessage({ type: 'flash', char: key });
            runInTerminal(shortcut.cmd);
        } else {
            // Otherwise, flash a '?' to indicate an unbound key.
            launcherPanel.webview.postMessage({ type: 'flash', char: '?' });
        }
    });
}

// =================================================================================
// HELPER FUNCTIONS
// =================================================================================

/**
 * Loads shortcuts by merging defaults from settings with the user's JSON file.
 * @returns {Promise<Object>} The final map of shortcuts.
 */
async function loadShortcuts() {
    const config = vscode.workspace.getConfiguration(EXTENSION_ID);
    const defaultShortcuts = config.get('shortcuts', {});

    const userShortcutsPath = config.get('shortcutsPath');
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!userShortcutsPath || !workspaceFolder) {
        return defaultShortcuts; // No custom path or workspace, use defaults.
    }

    const fullUserPath = path.join(workspaceFolder, userShortcutsPath);

    try {
        if (fs.existsSync(fullUserPath)) {
            const userContent = await fs.promises.readFile(fullUserPath, 'utf8');
            const userShortcuts = JSON.parse(userContent);
            // Merge user shortcuts over defaults.
            return { ...defaultShortcuts, ...userShortcuts };
        }
    } catch (e) {
        vscode.window.showWarningMessage(`Failed to parse Termino shortcuts from ${path.basename(fullUserPath)}: ${e.message}`);
    }

    return defaultShortcuts; // Return defaults if file doesn't exist or fails.
}

/**
 * Executes a command in the active terminal, creating one if needed.
 * @param {string} text The command text to send to the terminal.
 */
function runInTerminal(text) {
    const term = vscode.window.activeTerminal || vscode.window.createTerminal({ name: 'Termino' });
    term.show(true); // Bring terminal to front, but don't steal focus.
    term.sendText(text);
}

/**
 * Opens a new webview panel showing all available shortcuts.
 * @param {Object} map The map of shortcuts to display.
 */
function openCookbook(map) {
    if (cookPanel) {
        cookPanel.reveal(vscode.ViewColumn.One);
        return;
    }

    cookPanel = vscode.window.createWebviewPanel(
        'terminoCookbook',
        'Termino Cookbook',
        vscode.ViewColumn.One,
        { enableScripts: false } // Scripts not needed for the cookbook view.
    );
    cookPanel.webview.html = getCookbookHtml(map);
    cookPanel.onDidDispose(() => {
        cookPanel = null; // Clean up the reference when the panel is closed.
    });
}


function deactivate() {}

module.exports = { activate, deactivate };


// =================================================================================
// HTML GENERATOR FUNCTIONS (Unchanged)
// =================================================================================

/** Returns the transparent launcher HTML */
function getLauncherHtml() {
  return `
<!DOCTYPE html>
<html>
  <head>
    <style>
      html,body { background:transparent; margin:0; height:100%; overflow:hidden; }
      #overlay {
        position:absolute;top:40%;left:50%;
        transform:translate(-50%,-50%);
        font-size:8rem;color:rgba(255,255,255,0.75);
        opacity:0;transition:opacity 0.4s ease-out;
        pointer-events:none;mix-blend-mode:difference;
      }
    </style>
  </head>
  <body>
    <div id="overlay"></div>
    <script>
      const vscode = acquireVsCodeApi();
      const overlay = document.getElementById('overlay');
      window.addEventListener('keydown', e => {
        const key = e.key.toLowerCase();
        // Post a message only for single-character keys.
        if (key.length === 1) vscode.postMessage({ type:'run', key });
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

/** Builds a full-window HTML table from your {key:{cmd,desc}} map */
function getCookbookHtml(shortcuts) {
  const rows = Object.entries(shortcuts)
    .map(([k, { cmd, desc }]) =>
      `<tr>
          <td><code>${k}</code></td>
          <td><code>${cmd}</code></td>
          <td>${desc || ''}</td>
        </tr>`
    ).join('');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Termino Cookbook</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --body-background: #1a1b26;
      --table-background: #24283b;
      --header-background: #2a2f41;
      --hover-background: #3b4261;
      --border-color: #3b4261;
      --text-main: #c0caf5;
      --text-header: #ffffff;
      --accent-color: #7aa2f7;
      --shadow-color: rgba(0, 0, 0, 0.4);
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      background-color: var(--body-background);
      color: var(--text-main);
      margin: 0;
      padding: 2rem;
    }
    h1 {
      max-width: 900px;
      margin: 0 auto 1.5rem auto;
      padding-bottom: 0.75rem;
      color: var(--text-header);
      border-bottom: 2px solid var(--accent-color);
    }
    table {
      max-width: 900px;
      width: 100%;
      margin-left: auto;
      margin-right: auto;
      border-collapse: collapse;
      background-color: var(--table-background);
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 8px 25px var(--shadow-color);
      border: 1px solid var(--border-color);
    }
    th, td {
      padding: 1rem 1.25rem;
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }
    th {
      background-color: var(--header-background);
      color: var(--text-header);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.05em;
    }
    tbody tr:hover {
      background-color: var(--hover-background);
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <h1>Termino Shortcuts Cookbook</h1>
  <table>
    <thead>
      <tr><th>Key</th><th>Command</th><th>Description</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}