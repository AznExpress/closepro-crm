# Push to GitHub - Quick Guide

## After creating your GitHub repository, run these commands:

```bash
# Add the remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/closepro-crm.git

# Rename branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## If you get authentication errors:

### Option 1: Use GitHub Personal Access Token
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `repo` scope
3. Use token as password when pushing

### Option 2: Use GitHub Desktop
- Download [GitHub Desktop](https://desktop.github.com)
- File → Add Local Repository
- Publish repository

### Option 3: Use SSH (more secure)
1. Generate SSH key: `ssh-keygen -t ed25519 -C "your_email@example.com"`
2. Add to GitHub: Settings → SSH and GPG keys
3. Change remote URL: `git remote set-url origin git@github.com:YOUR_USERNAME/closepro-crm.git`
4. Push: `git push -u origin main`

