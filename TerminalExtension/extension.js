const vscode = require('vscode');

function activate(context) {
  // 1) Load the full map of { key: { cmd, desc } }
  const cfg = vscode.workspace.getConfiguration('termx');
  let shortcuts = cfg.get('shortcuts') || {};

  // 2) Create your invisible launcher panel (from before)…
  const panel = vscode.window.createWebviewPanel(
    'termxInvisible',
    'TermX Launcher',
    { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
    { enableScripts: true, retainContextWhenHidden: true }
  );
  panel.webview.html = getLauncherHtml();

  // 3) Listen for key presses
  panel.webview.onDidReceiveMessage(msg => {
    const key = msg.key.toLowerCase();
    // If unmapped, flash a question mark
    if (!shortcuts[key]) {
      panel.webview.postMessage({ type: 'flash', char: '?' });
      return;
    }
    // If 'h', open the full cookbook
    if (key === 'h') {
      openCookbook(shortcuts);
      return;
    }
    // Otherwise run the mapped cmd
    const cmd = shortcuts[key].cmd;
    panel.webview.postMessage({ type: 'flash', char: key });
    runInTerminal(cmd);
  });

  context.subscriptions.push(panel);

  // 4) Terminal runner
  function runInTerminal(text) {
    const term = vscode.window.activeTerminal
      || vscode.window.createTerminal({ name: 'TermX' });
    term.show(true);
    term.sendText(text);
  }

  // 5) Cookbook panel (separate window)
  let cookPanel;
  function openCookbook(map) {
    if (cookPanel) {
      cookPanel.reveal(vscode.ViewColumn.One);
      return;
    }
    cookPanel = vscode.window.createWebviewPanel(
      'termxCookbook',
      'TermX Cookbook',
      vscode.ViewColumn.One,
      { enableScripts: false }
    );
    cookPanel.webview.html = getCookbookHtml(map);
    cookPanel.onDidDispose(() => { cookPanel = null; });
  }
}

function deactivate() {}

module.exports = { activate, deactivate };


/** Returns the transparent launcher HTML (same as before) */
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

/** Builds a full‑window HTML table from your {key:{cmd,desc}} map */
function getCookbookHtml(shortcuts) {
  const rows = Object.entries(shortcuts)
    .map(([k, { cmd, desc }]) =>
      `<tr>
         <td><code>${k}</code></td>
         <td><code>${cmd}</code></td>
         <td>${desc}</td>
       </tr>`
    ).join('');
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>TermX Cookbook</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    /* 1. Professional Dark Theme using CSS Variables */
    :root {
      --body-background: #1a1b26;      /* A deep, dark blue-charcoal */
      --table-background: #24283b;     /* A slightly lighter, muted blue */
      --header-background: #2a2f41;   /* A distinct background for the header */
      --hover-background: #3b4261;    /* A more noticeable hover state */
      --border-color: #3b4261;
      --text-main: #c0caf5;           /* A soft, readable light text (easy on the eyes) */
      --text-header: #ffffff;         /* Brighter white for high contrast headers */
      --accent-color: #7aa2f7;        /* A professional blue accent for focus points */
      --shadow-color: rgba(0, 0, 0, 0.4);
    }

    /* 2. Body and Layout Improvements */
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      background-color: var(--body-background);
      color: var(--text-main);
      margin: 0;
      padding: 2rem;
    }
    
    /* Center the content on the page */
    h1, table {
      max-width: 900px;
      margin-left: auto;
      margin-right: auto;
    }
    
    h1 {
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      color: var(--text-header);
      border-bottom: 2px solid var(--accent-color); /* Using accent color for a professional touch */
    }

    /* 3. Modern Table Styling */
    table {
      width: 100%;
      border-collapse: collapse;
      background-color: var(--table-background);
      border-radius: 8px;
      overflow: hidden; /* Crucial for border-radius to work */
      box-shadow: 0 8px 25px var(--shadow-color);
      border: 1px solid var(--border-color); /* Adds a subtle border around the table */
    }

    th, td {
      padding: 1rem 1.25rem; /* Increased padding for better spacing */
      text-align: left;
      border-bottom: 1px solid var(--border-color);
    }

    /* 4. Header and Row Enhancements */
    th {
      background-color: var(--header-background);
      color: var(--text-header);
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.85em;
      letter-spacing: 0.05em;
    }

    /* Add a hover effect for interactivity */
    tbody tr:hover {
      background-color: var(--hover-background);
    }

    /* Remove the bottom border from the last row for a cleaner finish */
    tbody tr:last-child td {
      border-bottom: none;
    }
  </style>
</head>
<body>
  <h1>TermX Shortcuts Cookbook</h1>
  <table>
    <thead>
      <tr><th>Key</th><th>Command</th><th>Description</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
