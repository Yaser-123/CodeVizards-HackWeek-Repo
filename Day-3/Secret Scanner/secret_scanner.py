import os
import re
import sys
import subprocess

# --- Terminal UI Colors ---
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# --- Secret Regex Patterns ---
# These patterns detect common secrets.
SECRET_PATTERNS = {
    "AWS Access Key": r"(?i)AKIA[0-9A-Z]{16}",
    "Stripe Secret Key": r"(?i)sk_live_[0-9a-zA-Z]{24}",
    "GitHub Token": r"(?i)ghp_[0-9a-zA-Z]{36}",
    "Slack Token": r"xox[baprs]-[0-9a-zA-Z]{10,48}",
    "Google API Key": r"AIza[0-9A-Za-z-_]{35}",
    "Generic Private Key": r"-----BEGIN (RSA|OPENSSH|DSA|EC|PGP) PRIVATE KEY-----",
    "Generic Secret/Password": r"(?i)(password|secret|api_key|token)[\s:=]+[\"'][^\s\"']{8,}[\"']"
}

def get_staged_files():
    """Gets a list of files currently staged for commit."""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only'],
            capture_output=True, text=True, check=True
        )
        files = result.stdout.strip().split('\n')
        return [f for f in files if f and os.path.isfile(f)]
    except subprocess.CalledProcessError:
        return []

def scan_file(filepath):
    """Scans a file for secrets and returns a list of violations."""
    violations = []
    
    # Try to open the file as text
    try:
        with open(filepath, 'r', encoding='utf-8') as file:
            for line_num, line in enumerate(file, 1):
                for secret_name, pattern in SECRET_PATTERNS.items():
                    match = re.search(pattern, line)
                    if match:
                        violations.append({
                            'file': filepath,
                            'line_num': line_num,
                            'type': secret_name,
                            'content': line.strip()[:100] # Truncate long lines
                        })
    except UnicodeDecodeError:
        # Binary file, skip
        pass
    except Exception as e:
        print(f"{Colors.WARNING}⚠️ Could not read file {filepath}: {e}{Colors.ENDC}")
        
    return violations

def print_header():
    print(f"\n{Colors.OKCYAN}{Colors.BOLD}========================================={Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}🛡️  SECRET SCANNER - PRE-COMMIT CHECK 🛡️{Colors.ENDC}")
    print(f"{Colors.OKCYAN}{Colors.BOLD}========================================={Colors.ENDC}\n")

def main():
    print_header()
    
    staged_files = get_staged_files()
    
    if not staged_files:
        print(f"{Colors.OKBLUE}ℹ️ No staged files to scan. Skipping...{Colors.ENDC}\n")
        sys.exit(0)
        
    print(f"{Colors.OKBLUE}🔍 Scanning {len(staged_files)} staged file(s) for sensitive data...{Colors.ENDC}\n")
    
    all_violations = []
    for file in staged_files:
        violations = scan_file(file)
        all_violations.extend(violations)
        
    if all_violations:
        print(f"{Colors.FAIL}{Colors.BOLD}🚨 CRITICAL: SECRETS DETECTED! 🚨{Colors.ENDC}")
        print(f"{Colors.WARNING}Commit aborted to prevent sensitive data exposure.{Colors.ENDC}\n")
        
        for v in all_violations:
            print(f"{Colors.FAIL}✖ {Colors.BOLD}{v['type']}{Colors.ENDC} found in {Colors.UNDERLINE}{v['file']}{Colors.ENDC} on line {v['line_num']}")
            print(f"  {Colors.OKBLUE}↳ {Colors.ENDC} {v['content']}")
            print()
            
        print(f"{Colors.OKCYAN}💡 Please remove these secrets and commit again.{Colors.ENDC}\n")
        sys.exit(1) # Block the commit
    else:
        print(f"{Colors.OKGREEN}✅ Scan passed! No secrets detected.{Colors.ENDC}")
        print(f"{Colors.OKGREEN}🚀 Committing...{Colors.ENDC}\n")
        sys.exit(0) # Allow the commit

if __name__ == "__main__":
    main()
