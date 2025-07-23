# 🚀 Termino: Unleash Terminal Superpowers in VS Code – One Key, Infinite Speed!

Hey developer! Tired of typing the same terminal commands over and over? `npm install`, `git status`, `docker compose up`... It gets old, fast. What if you could hit just **one key** and have that command run instantly?

That’s exactly what **Termino** does. I built Termino to be your personal shortcut master for the VS Code terminal, so you can save keystrokes, brainpower, and time. Get ready to stop typing and start *flying* through your workflow!

---

## ✨ Why You'll Love Termino

I created Termino because I was tired of the grind, and I bet you are too. Here’s how it makes your coding life genuinely better:

- **⚡️ Lightning-Fast Workflow:** Press a single key to run your favorite commands. Imagine: `b` for `npm run build`, `t` for `npm test`, `g` for `git status`. It’s like having superpowers for your terminal!
- **🧠 Save Your Brainpower:** Your memory is for code, not for remembering command-line flags. With Termino, your most-used commands are always a glance or a keypress away in the "Cookbook" or Launcher.
- **🎯 Hit Your Targets Instantly:** Build, test, deploy, or run anything with a single keystroke. No more context-switching or fumbling with the terminal.
- **🎉 100% Yours:** Termino is all about *your* workflow. You decide what shortcuts mean what. Make it fit perfectly with how *you* work, whether you’re a frontend wizard, backend guru, or DevOps champ.

---

## 🚦 How It Works

Termino gives you several awesome ways to fire off your commands:

### 🎮 The Interactive Launcher (The Magic!)

Open the **Termino Launcher** panel in VS Code. It sits there, ready. When you press a key, Termino runs the command you’ve linked to it. You’ll see a big letter flash on screen, confirming your press!

- **Press `H` for Help:** Instantly open your **Termino Cookbook** – a neat table showing all your shortcuts and what they do.
- **Press `Q` for Quick Pick:** Need something specific? Hit `Q` and a VS Code quick pick list pops up, letting you search and select any shortcut.

### 💨 Quick Launch from Command Palette

Prefer the Command Palette? Hit `Ctrl/Cmd + Shift + P`, type `Termino: Quick Launch`, and you’ll get a clean list of all your custom commands. Pick one, and it runs!

### 📝 Effortless Shortcut Setup

Setting up your commands is a breeze:

1. **Install Termino:** Grab it from the VS Code Marketplace. Search "Termino".
2. **Open Your Shortcut File:** Hit `Ctrl/Cmd + Shift + P` and type `Termino: Edit Shortcuts`. This opens (or creates) `.vscode/termino-shortcuts.json` in your project.
3. **Add Your Commands:** Add lines like these to the JSON file. Each needs a **key** (the letter you’ll press), the **command** it runs, and an optional **description**.

    ```json
    {
      "g": {
        "cmd": "git status --short",
        "desc": "See quick git status"
      },
      "b": {
        "cmd": "npm run build -- --production",
        "desc": "Build the project for production"
      },
      "s": {
        "cmd": "npm start",
        "desc": "Start the development server"
      }
    }
    ```

4. **Reload & Go:** Save the file! Then, in the Command Palette, run `Termino: Reload Shortcuts`. That’s it! Your new shortcuts are live and ready to use.

---

## 🛠️ Advanced: Custom Shortcut File Path

By default, Termino looks for your `termino-shortcuts.json` file in a `.vscode` folder in your project. Want to change that path?

- Go to VS Code Settings (`Ctrl/Cmd + ,`), search for "Termino", and adjust the `termino.shortcutsPath` setting.

---

## 📘 The Cookbook: See All Your Shortcuts

Press `H` in the Launcher, or use the Command Palette to open the Cookbook. You’ll see a table of all your shortcuts, their keys, commands, and descriptions – always up to date.

---

## 🙌 I Want Your Feedback!

I built Termino to make your coding life smoother. If you have cool ideas for new features, hit a snag, or just want to tell me how Termino is saving your fingers, please reach out! Your feedback helps me make it even better for everyone.

---

**Unleash your terminal. Unleash your flow. Try Termino and code at the speed of thought!**