#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 1 ]; then
  echo "Usage: bash PUBLISH_AFTER_REPO_CREATED.sh https://github.com/OWNER/NEW-REPO.git"
  echo "First create an EMPTY repository at https://github.com/new"
  exit 2
fi
url="$1"
if [[ "$url" != https://github.com/* ]]; then echo 'Use an HTTPS GitHub repository URL.'; exit 2; fi
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then git init -b main; fi
if ! git config user.name >/dev/null || ! git config user.email >/dev/null; then
  echo 'Git author missing. Configure your own identity before uploading:'
  echo '  git config user.name "Your name"'
  echo '  git config user.email "your GitHub email"'
  exit 2
fi
git add -A
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  git commit -m 'Initial MedArc Next.js public source release'
elif ! git diff --cached --quiet; then
  git commit -m 'Update MedArc public source release'
fi
if git remote get-url origin >/dev/null 2>&1; then git remote set-url origin "$url"; else git remote add origin "$url"; fi
git branch -M main
git push -u origin main
echo 'Source pushed to GitHub. Next, import the repository in Vercel.'
