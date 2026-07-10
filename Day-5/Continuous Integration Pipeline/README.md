# Continuous Integration Pipeline

This project demonstrates a production-grade Continuous Integration (CI) pipeline using **GitHub Actions**.

## Overview
The CI pipeline automatically validates code whenever changes are pushed to the repository or a pull request is opened. The pipeline includes two main jobs:
1. **Build, Lint & Test**: Ensures the code conforms to styling standards (`eslint`), passes all unit tests (`jest`), and successfully builds.
2. **Security Scanning**: Audits the dependencies for known vulnerabilities (`npm audit`) and runs **Trivy**, an industry-standard open-source vulnerability scanner, to scan the file system for potential security risks.

## Components Included
- **Node.js Express App**: A dummy application (`index.js`) to run the pipeline against.
- **Jest**: Used for unit testing (`index.test.js`).
- **ESLint**: Used to enforce code formatting (`.eslintrc.json`).
- **GitHub Actions Workflow**: The configuration file is located at `../../.github/workflows/day5-ci.yml`.

## How to trigger the pipeline
The pipeline is already set up! Simply push any change to this `Day-5/Continuous Integration Pipeline` folder to your GitHub repository, and then go to the **Actions** tab on your GitHub repository page to see the pipeline running automatically in real-time.
