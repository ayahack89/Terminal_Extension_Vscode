// extension.js 
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


    // Create Launcher Webview Panel
    const launcherPanel = vscode.window.createWebviewPanel(
        'terminoLauncher',
        '🪐 Termino Launcher',
        
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
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-color-start: #2a2a2e;
            --bg-color-end: #1e1e1e;
            --tip-color: #999999;
            --key-bg: #3c3c3c;
            --key-color: #f0f0f0;
            --key-border: #222222;
        }

        html, body {
            background-color: var(--bg-color-end);
            background-image: radial-gradient(circle, var(--bg-color-start) 0%, var(--bg-color-end) 100%);
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            overflow: hidden;
            font-family: 'Poppins', 'Segoe UI', sans-serif;
        }

        #overlay {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 12rem;
            font-weight: 700;
            color: #e0e0e0; /* Fallback color */
            
            /* Professional text gradient */
            background: linear-gradient(45deg, #a7b3c9, #e0e0e0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            text-fill-color: transparent;

            opacity: 0;
            transition: opacity 0.4s ease-out;
            pointer-events: none;
            text-shadow: 0 0 30px rgba(200, 200, 200, 0.25);
        }

        .tip {
            position: absolute;
            bottom: 30px;
            width: 100%;
            text-align: center;
            color: var(--tip-color);
            font-size: 1rem;
            font-weight: 400;
            letter-spacing: 0.5px;
        }

        .tip kbd {
            display: inline-block;
            background-color: var(--key-bg);
            color: var(--key-color);
            padding: 4px 8px;
            border-radius: 6px;
            border-bottom: 2px solid var(--key-border);
            font-family: inherit;
            font-size: 0.9em;
            font-weight: 600;
            line-height: 1;
            margin: 0 2px;
            vertical-align: middle;
        }
    </style>
</head>
<body>
    <div id="overlay"></div>
    <div class="tip">💡 Press a shortcut key. Try <kbd>H</kbd> for help, <kbd>Q</kbd> for quick launch.</div>
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

cookPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
    <style>
        :root {
            --background-color: #141415ff;
            --text-color: #c9d1d9;
            --accent-color: #58a6ff;
            --glass-bg: rgba(43, 43, 44, 0.5);
            --glass-border: rgba(255, 255, 255, 0.1);
            --header-bg: rgba(88, 166, 255, 0.2);
            --hover-bg: rgba(88, 166, 255, 0.1);
            --code-bg: rgba(13, 17, 23, 0.7);
        }
        body {
            font-family: 'Poppins', 'Segoe UI', sans-serif;
            background: var(--background-color);
            color: var(--text-color);
            padding: 2rem;
            min-height: 100vh;
            box-sizing: border-box;
        }
        h1 {
            color: var(--accent-color);
            text-align: center;
            font-weight: 600;
            margin-bottom: 2rem;
            letter-spacing: 1px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: var(--glass-bg);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border-radius: 12px;
            border: 1px solid var(--glass-border);
            overflow: hidden;
            box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        th, td {
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--glass-border);
            text-align: left;
            vertical-align: middle;
        }
        th {
            background: var(--header-bg);
            color: #f0f6fc;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        tbody tr {
            transition: background-color 0.3s ease;
        }
        tbody tr:last-child td {
            border-bottom: none;
        }
        tbody tr:hover {
            background-color: var(--hover-bg);
        }
        code {
            font-family: 'SF Mono', 'Courier New', monospace;
            background-color: var(--code-bg);
            padding: 0.2em 0.5em;
            border-radius: 6px;
            font-size: 1em;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h1>Termino Cookbook</h1>
    <table>
        <thead>
            <tr><th>Key</th><th>Cmd</th><th>Description</th></tr>
        </thead>
        <tbody>
            ${rows}
        </tbody>
    </table>
</body>
</html>`;

cookPanel.onDidDispose(() => (cookPanel = null));
}

function deactivate() {}

module.exports = { activate, deactivate };
