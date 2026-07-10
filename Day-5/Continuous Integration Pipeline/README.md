# Continuous Integration Pipeline

This project demonstrates a production-grade Continuous Integration (CI) pipeline using **GitHub Actions**. It automatically tests, lints, and security-scans your code whenever you push to GitHub!

---

## How to use this CI Pipeline in YOUR own Repository

If you want to protect your own codebase with automatic testing and security scanning, you can easily copy this pipeline to your own projects. Follow these simple steps:

### Step 1: Create the Workflows Folder
In the root directory of your own repository, create the following folder structure exactly as written:
```bash
.github/workflows/
```
*(Note the dot `.` at the beginning of `.github`!)*

### Step 2: Copy the Workflow File
Create a new file inside that folder called `ci-pipeline.yml` (e.g. `.github/workflows/ci-pipeline.yml`) and copy the workflow code we created into it. 

Here is the base structure:
```yaml
name: Node.js CI Pipeline

# 1. Choose when this runs!
on:
  push:
    branches: [ "main", "master" ]
  pull_request:
    branches: [ "main", "master" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    - run: npm ci
    - run: npm run lint
    - run: npm test

  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run NPM Audit
      run: npm audit --audit-level=high
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        format: 'table'
        exit-code: '1'
        severity: 'CRITICAL,HIGH'
```

### Step 3: Ensure Your Package.json is Ready
For the pipeline to work, your project's `package.json` must contain the commands referenced in the workflow. Make sure you have:
```json
"scripts": {
  "test": "jest",
  "lint": "eslint ."
}
```

### Step 4: Push to GitHub!
Commit your new `.github/workflows/ci-pipeline.yml` file and push it to GitHub:
```bash
git add .github/workflows/ci-pipeline.yml
git commit -m "Add CI Pipeline"
git push
```

### Step 5: Watch it run!
Go to your repository on GitHub and click the **Actions** tab at the top. You will immediately see your pipeline running! It will spin up virtual machines, install your dependencies, run your tests, and scan for vulnerabilities.

---

## (Optional) Enforce Branch Protection
To make your repository truly production-grade, you can block anyone from merging code unless the pipeline passes!
1. Go to your repo's **Settings** > **Branches**.
2. Add a branch protection rule for `main`.
3. Check the box for **"Require status checks to pass before merging"**.
4. Select `build-and-test` and `security-scan` from the list.

Now, it is literally impossible for anyone to push broken code or security vulnerabilities into your main branch!
