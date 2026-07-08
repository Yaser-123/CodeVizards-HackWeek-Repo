# Secret Scanner 🛡️

A lightweight, powerful, and minimalistic security tool that runs entirely locally. It scans your code right before you commit, and uses pattern matching (Regex) to ensure you never accidentally push API keys, passwords, or tokens to GitHub.

## Features
- **Git Native Integration:** Hooks directly into Git's `pre-commit` hook lifecycle. No separate daemon required.
- **Zero Dependencies:** Written in pure standard Python. No `pip install` required.
- **High-Fidelity Patterns:** Pre-configured regex patterns to detect AWS Keys, Stripe Secrets, GitHub Tokens, SSH Private keys, and more.
- **Beautiful UI:** Custom ANSI color-coded terminal outputs to easily read exactly what file and line contains the leak.

---

## 🛠️ Installation

1. Navigate to the root of the Git repository you want to protect.
2. Ensure `secret_scanner.py` and `install.py` are in that directory.
3. Run the installer script:
   ```bash
   python install.py
   ```
   
This will automatically generate a `.git/hooks/pre-commit` file that binds `secret_scanner.py` to your commit workflow.

---

## 🚀 How to Record Your Demo Video

To record your demo video, follow these steps to trigger a block:

1. Create a dummy test folder and initialize it as a git repo:
   ```bash
   mkdir test_repo && cd test_repo
   git init
   ```
2. Copy `secret_scanner.py` and `install.py` into this `test_repo` folder.
3. Run the installer:
   ```bash
   python install.py
   ```
4. Create a dummy file called `config.js` and intentionally leak a fake API key:
   ```javascript
   const awsKey = "AKIA1234567890ABCDEF";
   ```
5. Try to commit the file:
   ```bash
   git add config.js
   git commit -m "Add config file"
   ```
6. Watch the terminal light up in **RED** as the Secret Scanner aborts the commit and warns you about the leaked AWS Key! This makes for a perfect screen recording.
