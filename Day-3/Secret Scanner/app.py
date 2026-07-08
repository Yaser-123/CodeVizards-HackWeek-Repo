from flask import Flask, request, jsonify, render_template
import re
import os
import threading
import tempfile
import subprocess
import shutil
import time

app = Flask(__name__)

# --- Secret Regex Patterns ---
SECRET_PATTERNS = {
    "AWS Access Key": r"(?i)AKIA[0-9A-Z]{16}",
    "Stripe Secret Key": r"(?i)sk_live_[0-9a-zA-Z]{24}",
    "GitHub Token": r"(?i)ghp_[0-9a-zA-Z]{36}",
    "Slack Token": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
    "Google API Key": r"AIza[0-9A-Za-z-_]{35}",
    "Generic Private Key": r"-----BEGIN (RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----",
    "Generic Secret/Password": r"(?i)(password|secret|api_key|token)[\s:=]+[\"'][^\s\"']{8,}[\"']"
}

# --- State for Monitoring ---
# monitored_repos = { "url": { "last_commit": "hash", "status": "safe|danger", "violations": [], "temp_dir": "path" } }
monitored_repos = {}
monitored_repos_lock = threading.Lock()

def scan_text(text, filename="input"):
    violations = []
    lines = text.split('\n')
    for line_num, line in enumerate(lines, 1):
        for secret_name, pattern in SECRET_PATTERNS.items():
            if re.search(pattern, line):
                violations.append({
                    'file': filename,
                    'line_num': line_num,
                    'type': secret_name,
                    'content': line.strip()[:100]
                })
    return violations

def scan_directory(dir_path):
    violations = []
    for root, _, files in os.walk(dir_path):
        if '.git' in root:
            continue
        for file in files:
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    file_violations = scan_text(content, filename=os.path.relpath(file_path, dir_path))
                    violations.extend(file_violations)
            except UnicodeDecodeError:
                pass # skip binary files
    return violations

def get_latest_commit(dir_path):
    try:
        result = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=dir_path, capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except Exception:
        return None

# --- Background Polling Thread ---
def monitor_repos():
    print("Background monitoring thread started...", flush=True)
    while True:
        time.sleep(10) # Poll every 10 seconds for demo purposes
        with monitored_repos_lock:
            for url, data in monitored_repos.items():
                dir_path = data['temp_dir']
                print(f"Polling {url} at {dir_path}...", flush=True)
                try:
                    # git pull to check for new commits
                    pull_res = subprocess.run(['git', 'pull'], cwd=dir_path, capture_output=True, text=True)
                    print(f"git pull output: {pull_res.stdout.strip()}", flush=True)
                    if pull_res.returncode != 0:
                        print(f"git pull error: {pull_res.stderr.strip()}", flush=True)
                    
                    latest_commit = get_latest_commit(dir_path)
                    print(f"Latest commit: {latest_commit}, previous: {data['last_commit']}", flush=True)
                    
                    if latest_commit and latest_commit != data['last_commit']:
                        print("New commit detected! Rescanning...", flush=True)
                        # New commit found! Rescan the whole directory
                        violations = scan_directory(dir_path)
                        data['last_commit'] = latest_commit
                        if violations:
                            data['status'] = 'danger'
                            data['violations'] = violations
                        else:
                            data['status'] = 'safe'
                            data['violations'] = []
                except Exception as e:
                    print(f"Error polling repo {url}: {e}", flush=True)

threading.Thread(target=monitor_repos, daemon=True).start()

# --- API Endpoints ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scan-text', methods=['POST'])
def scan_text_endpoint():
    data = request.json
    text_to_scan = data.get('text', '')
    if not text_to_scan:
        return jsonify({"violations": []})
    violations = scan_text(text_to_scan, filename="Pasted Text")
    return jsonify({"violations": violations})

@app.route('/scan-file', methods=['POST'])
def scan_file_endpoint():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files['file']
    try:
        content = file.read().decode('utf-8')
        violations = scan_text(content, filename=file.filename)
        return jsonify({"violations": violations})
    except UnicodeDecodeError:
        return jsonify({"error": "Cannot read binary file."}), 400

@app.route('/scan-repo', methods=['POST'])
def scan_repo_endpoint():
    data = request.json
    repo_url = data.get('url', '')
    if not repo_url:
        return jsonify({"error": "No URL provided"}), 400

    # Clone to temp directory
    temp_dir = tempfile.mkdtemp()
    try:
        subprocess.run(['git', 'clone', repo_url, temp_dir], capture_output=True, check=True)
        violations = scan_directory(temp_dir)
        
        # Add to monitoring
        latest_commit = get_latest_commit(temp_dir)
        with monitored_repos_lock:
            monitored_repos[repo_url] = {
                'temp_dir': temp_dir,
                'last_commit': latest_commit,
                'status': 'danger' if violations else 'safe',
                'violations': violations
            }
            
        return jsonify({"violations": violations})
    except Exception as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        return jsonify({"error": f"Failed to clone repository: {str(e)}"}), 500

@app.route('/monitoring-status', methods=['GET'])
def monitoring_status():
    with monitored_repos_lock:
        # Don't send temp_dir to frontend
        safe_data = {url: {"status": data["status"], "violations": data["violations"], "last_commit": data["last_commit"]} 
                     for url, data in monitored_repos.items()}
    return jsonify(safe_data)

@app.route('/remove-repo', methods=['POST'])
def remove_repo():
    data = request.json
    repo_url = data.get('url', '')
    with monitored_repos_lock:
        if repo_url in monitored_repos:
            try:
                shutil.rmtree(monitored_repos[repo_url]['temp_dir'], ignore_errors=True)
            except:
                pass
            del monitored_repos[repo_url]
            return jsonify({"success": True})
    return jsonify({"error": "Not found"}), 404

if __name__ == '__main__':
    app.run(debug=True, port=5000, use_reloader=False) # disable reloader so background thread doesn't duplicate
