# MLT Asset Tracker — Quick Reference

## 🔍 Before ANY Change to index.html

```bash
cd /home/maximus/projects/mlt-asset-tracker
python3 verify-keys.py
```

If this shows issues, **STOP** and fix them first.

---

## 🚀 To Deploy Changes

```bash
cd /home/maximus/projects/mlt-asset-tracker
python3 deploy-safe.py
```

This automatically:
- ✅ Creates backup before changes
- ✅ Verifies Supabase key integrity
- ✅ Tests API connectivity
- ✅ Generates fresh config.js
- ✅ Deploys to Vercel

---

## 🔄 To Rollback

```bash
cd /home/maximus/projects/mlt-asset-tracker

# List available backups
python3 rollback.py

# Restore most recent
python3 rollback.py --latest

# Then redeploy
python3 deploy-safe.py
```

---

## ⚠️ Signs of Key Corruption

1. Activity feed shows "No recent activity"
2. Browser console: 401 errors to Supabase
3. `verify-keys.py` shows key < 200 chars

---

## 🔑 Key Locations

| Purpose | Location |
|---------|----------|
| Canonical anon key | `~/.centurion/secrets/supabase_anon_key.txt` |
| Service role key | `~/.centurion/secrets/supabase-service-key` |
| Vercel token | `~/.centurion/secrets/vercel_token.txt` |

---

## 📁 Project Structure

```
mlt-asset-tracker/
├── index.html           # Main app
├── config.js            # Auto-generated (DO NOT EDIT)
├── config.template.js   # Template for reference
├── deploy-safe.py       # Safe deployment script
├── verify-keys.py       # Pre-flight checks
├── rollback.py          # Quick rollback
├── ARCHITECTURE.md      # Full technical spec
├── backups/             # Timestamped backups
│   └── index.html.*
└── fleet-data.json
```

---

## 🛡️ Golden Rules

1. **Never manually edit config.js** — it's auto-generated
2. **Always run verify-keys.py** before changing index.html
3. **Use deploy-safe.py** for deployments (creates backup automatically)
4. **Keep canonical key in secrets** — never copy manually into code
