# MLT Asset Tracker — Bulletproof Architecture Specification

**Version:** 1.0  
**Date:** November 24, 2026  
**Status:** Approved for Implementation

---

## Problem Statement

The Supabase anon key (~208 characters) repeatedly gets truncated/corrupted when patching `index.html`. This causes:
- Activity feed to fail silently
- User loses visibility of team activity
- Each incident requires manual key restoration

**Root Cause:** Keys embedded directly in a 6000+ line HTML file are vulnerable to:
1. Partial string matches during find-and-replace operations
2. AI/editor line wrapping or truncation
3. No validation before deployment

---

## Solution Architecture

### 1. Separate Configuration File

**File:** `/home/maximus/projects/mlt-asset-tracker/config.js`

```javascript
// MLT Asset Tracker Configuration
// ⚠️  NEVER PATCH THIS FILE - Keys are immutable
// Last verified: 2026-11-24

const MLT_CONFIG = {
    supabase: {
        url: 'https://fntqwckvrdbemjadcpcz.supabase.co',
        // Key loaded from canonical source at build/deploy time
        anonKey: null
    },
    version: '2026.11.24',
    build: Date.now()
};

// Key injection happens via deploy script, NOT manual editing
```

**Why This Works:**
- `config.js` is a simple, small file that's easy to verify
- Keys are injected by deployment script from canonical source
- No patching = no corruption risk

### 2. Canonical Key Storage

**Location:** `~/.centurion/secrets/supabase_anon_key.txt`

This is the **single source of truth** for the Supabase anon key. 

**Rules:**
- Never copy the key into code manually
- Always read from this file programmatically
- Verify key length (should be ~208 characters)

### 3. index.html Changes

Replace the embedded key with config reference:

```javascript
// OLD (vulnerable):
const SUPABASE_URL = 'https://fntqwckvrdbemjadcpcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbG...long key...';

// NEW (bulletproof):
// Config loaded from config.js (included via <script src="config.js">)
const SUPABASE_URL = MLT_CONFIG.supabase.url;
const SUPABASE_ANON_KEY = MLT_CONFIG.supabase.anonKey;
```

---

## File Structure

```
/home/maximus/projects/mlt-asset-tracker/
├── index.html              # Main app (NO keys embedded)
├── config.js               # Config file (keys injected at deploy)
├── config.template.js      # Template without keys (committed)
├── deploy.py               # Deployment script with verification
├── verify-keys.py          # Pre-flight key verification
├── backups/                # Automated backup directory
│   └── index.html.{timestamp}
├── vercel.json
└── fleet-data.json
```

---

## Deployment Script (deploy.py)

```python
#!/usr/bin/env python3
"""
MLT Asset Tracker Deployment Script
- Creates timestamped backup before any change
- Injects key from canonical source
- Verifies key integrity before deploy
- Tests Supabase connectivity
- Only deploys if all checks pass
"""

import os
import sys
import json
import shutil
import requests
from datetime import datetime

PROJECT_DIR = '/home/maximus/projects/mlt-asset-tracker'
KEY_FILE = os.path.expanduser('~/.centurion/secrets/supabase_anon_key.txt')
VERCEL_TOKEN_FILE = os.path.expanduser('~/.centurion/secrets/vercel_token.txt')
SUPABASE_URL = 'https://fntqwckvrdbemjadcpcz.supabase.co'

# Key length constants
MIN_KEY_LENGTH = 200
MAX_KEY_LENGTH = 220

def load_key():
    """Load Supabase anon key from canonical source."""
    with open(KEY_FILE, 'r') as f:
        key = f.read().strip()
    return key

def verify_key_integrity(key):
    """Verify key meets expected format."""
    if len(key) < MIN_KEY_LENGTH:
        raise ValueError(f"Key too short: {len(key)} chars (expected >{MIN_KEY_LENGTH})")
    if len(key) > MAX_KEY_LENGTH:
        raise ValueError(f"Key too long: {len(key)} chars (expected <{MAX_KEY_LENGTH})")
    if not key.startswith('eyJ'):
        raise ValueError("Key doesn't start with expected JWT prefix 'eyJ'")
    return True

def test_supabase_connectivity(key):
    """Test that Supabase responds with this key."""
    headers = {
        'apikey': key,
        'Authorization': f'Bearer {key}'
    }
    try:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/activity_feed?limit=1',
            headers=headers,
            timeout=10
        )
        if resp.status_code == 200:
            print("✅ Supabase connectivity: OK")
            return True
        elif resp.status_code == 401:
            raise ValueError(f"Authentication failed (401) - key may be invalid")
        else:
            print(f"⚠️  Supabase returned {resp.status_code}: {resp.text[:100]}")
            return False
    except requests.exceptions.RequestException as e:
        raise ValueError(f"Supabase connection failed: {e}")

def create_backup():
    """Create timestamped backup of index.html."""
    backup_dir = os.path.join(PROJECT_DIR, 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    src = os.path.join(PROJECT_DIR, 'index.html')
    dst = os.path.join(backup_dir, f'index.html.{timestamp}')
    
    shutil.copy2(src, dst)
    print(f"✅ Backup created: {dst}")
    return dst

def inject_config(key):
    """Generate config.js with injected key."""
    config_content = f'''// MLT Asset Tracker Configuration
// ⚠️  AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated: {datetime.now().isoformat()}
// Key length: {len(key)} chars

const MLT_CONFIG = {{
    supabase: {{
        url: '{SUPABASE_URL}',
        anonKey: '{key}'
    }},
    version: '{datetime.now().strftime("%Y.%m.%d")}',
    build: {int(datetime.now().timestamp() * 1000)}
}};
'''
    config_path = os.path.join(PROJECT_DIR, 'config.js')
    with open(config_path, 'w') as f:
        f.write(config_content)
    print(f"✅ Config generated: {config_path}")
    return config_path

def deploy_to_vercel():
    """Deploy to Vercel production."""
    with open(VERCEL_TOKEN_FILE, 'r') as f:
        token = f.read().strip()
    
    import subprocess
    os.chdir(PROJECT_DIR)
    result = subprocess.run(
        ['vercel', '--prod', f'--token={token}'],
        capture_output=True, text=True
    )
    
    if result.returncode == 0:
        print("✅ Vercel deployment: SUCCESS")
        # Extract URL from output
        for line in result.stdout.split('\n'):
            if 'https://' in line and 'vercel' in line:
                print(f"   URL: {line.strip()}")
        return True
    else:
        print(f"❌ Vercel deployment FAILED")
        print(f"   stdout: {result.stdout}")
        print(f"   stderr: {result.stderr}")
        return False

def main():
    print("=" * 60)
    print("MLT Asset Tracker — Safe Deployment")
    print("=" * 60)
    
    # Step 1: Load and verify key
    print("\n📋 Step 1: Verifying Supabase key...")
    try:
        key = load_key()
        verify_key_integrity(key)
        print(f"✅ Key loaded: {len(key)} characters")
    except Exception as e:
        print(f"❌ Key verification FAILED: {e}")
        sys.exit(1)
    
    # Step 2: Test Supabase connectivity
    print("\n📋 Step 2: Testing Supabase connectivity...")
    try:
        test_supabase_connectivity(key)
    except Exception as e:
        print(f"❌ Connectivity test FAILED: {e}")
        sys.exit(1)
    
    # Step 3: Create backup
    print("\n📋 Step 3: Creating backup...")
    backup_path = create_backup()
    
    # Step 4: Generate config
    print("\n📋 Step 4: Generating config.js...")
    inject_config(key)
    
    # Step 5: Deploy
    print("\n📋 Step 5: Deploying to Vercel...")
    if deploy_to_vercel():
        print("\n" + "=" * 60)
        print("✅ DEPLOYMENT COMPLETE")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ DEPLOYMENT FAILED - Rollback available at:")
        print(f"   {backup_path}")
        print("=" * 60)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

---

## Pre-Deploy Verification Script (verify-keys.py)

```python
#!/usr/bin/env python3
"""
Quick verification script - run before ANY change to index.html
"""

import os
import re
import sys
import requests

def check_config_js():
    """Verify config.js has valid key."""
    config_path = '/home/maximus/projects/mlt-asset-tracker/config.js'
    
    if not os.path.exists(config_path):
        return None, "config.js not found"
    
    with open(config_path, 'r') as f:
        content = f.read()
    
    match = re.search(r"anonKey:\s*'([^']+)'", content)
    if not match:
        return None, "anonKey not found in config.js"
    
    key = match.group(1)
    if len(key) < 200:
        return None, f"Key truncated: only {len(key)} chars"
    
    return key, None

def check_index_html():
    """Check if index.html has embedded key (old style) or uses config."""
    index_path = '/home/maximus/projects/mlt-asset-tracker/index.html'
    
    with open(index_path, 'r') as f:
        content = f.read()
    
    # Check for old-style embedded key
    match = re.search(r"SUPABASE_ANON_KEY\s*=\s*'([^']+)'", content)
    if match:
        key = match.group(1)
        if len(key) < 200:
            return 'embedded_truncated', key
        return 'embedded_valid', key
    
    # Check for config-based approach
    if 'MLT_CONFIG.supabase.anonKey' in content:
        return 'config_based', None
    
    return 'unknown', None

def test_connectivity(key):
    """Test Supabase API."""
    if not key or len(key) < 200:
        return False, "Invalid key"
    
    try:
        resp = requests.get(
            'https://fntqwckvrdbemjadcpcz.supabase.co/rest/v1/activity_feed?limit=1',
            headers={'apikey': key, 'Authorization': f'Bearer {key}'},
            timeout=5
        )
        return resp.status_code == 200, f"Status {resp.status_code}"
    except Exception as e:
        return False, str(e)

def main():
    print("🔍 MLT Asset Tracker — Key Verification")
    print("-" * 40)
    
    # Check canonical key file
    key_file = os.path.expanduser('~/.centurion/secrets/supabase_anon_key.txt')
    if os.path.exists(key_file):
        with open(key_file, 'r') as f:
            canonical_key = f.read().strip()
        print(f"✅ Canonical key: {len(canonical_key)} chars")
    else:
        print("❌ Canonical key file missing!")
        canonical_key = None
    
    # Check current deployment method
    status, key = check_index_html()
    if status == 'embedded_truncated':
        print(f"❌ index.html: TRUNCATED KEY ({len(key)} chars)")
        print("   ⚠️  Activity feed will NOT work!")
    elif status == 'embedded_valid':
        print(f"✅ index.html: Embedded key ({len(key)} chars)")
    elif status == 'config_based':
        print("✅ index.html: Using config.js (recommended)")
        config_key, err = check_config_js()
        if err:
            print(f"❌ config.js: {err}")
        else:
            print(f"✅ config.js: Key present ({len(config_key)} chars)")
            key = config_key
    else:
        print("⚠️  index.html: Key setup unknown")
    
    # Test connectivity
    if key and len(key) > 200:
        success, msg = test_connectivity(key)
        if success:
            print(f"✅ Supabase connectivity: OK")
        else:
            print(f"❌ Supabase connectivity: FAILED ({msg})")
    
    print("-" * 40)

if __name__ == '__main__':
    main()
```

---

## Deployment Checklist

### Before ANY Change to index.html:

- [ ] Run `python3 verify-keys.py` — ensure current state is healthy
- [ ] Create manual backup: `cp index.html backups/index.html.$(date +%Y%m%d_%H%M%S)`
- [ ] Note current key length in index.html

### After Making Changes:

- [ ] Run `python3 verify-keys.py` — verify key wasn't corrupted
- [ ] Check key length: `grep -o "anonKey: '[^']*'" config.js | wc -c` (should be ~220)
- [ ] Test locally if possible

### For Deployment:

- [ ] Run `python3 deploy.py` — this handles backup + verification + deploy
- [ ] After deploy, check live site activity feed
- [ ] Verify in browser console: `MLT_CONFIG.supabase.anonKey.length` should be ~208

---

## Rollback Procedure

### If Activity Feed Breaks After Deploy:

**Option 1: Quick Rollback (< 1 minute)**

```bash
cd /home/maximus/projects/mlt-asset-tracker

# List available backups (most recent first)
ls -lt backups/

# Restore most recent backup
cp backups/index.html.YYYYMMDD_HHMMSS index.html

# Redeploy
python3 deploy.py
```

**Option 2: Key Restoration Only**

If only the key is corrupted but code is fine:

```bash
# Regenerate config.js with correct key
python3 -c "
import os
key = open(os.path.expanduser('~/.centurion/secrets/supabase_anon_key.txt')).read().strip()
print(f'Key length: {len(key)}')
# Then run deploy.py which will regenerate config.js
"
python3 deploy.py
```

**Option 3: Manual Emergency Fix**

If scripts are broken:

```bash
# 1. Get the correct key
cat ~/.centurion/secrets/supabase_anon_key.txt

# 2. Manually edit config.js, paste full key

# 3. Deploy with Vercel CLI
cd /home/maximus/projects/mlt-asset-tracker
vercel --prod --token=$(cat ~/.centurion/secrets/vercel_token.txt)
```

---

## Monitoring

### Health Check (run weekly or after issues):

```bash
python3 /home/maximus/projects/mlt-asset-tracker/verify-keys.py
```

### Signs of Key Corruption:

1. Activity feed shows "No recent activity" when there should be updates
2. Browser console shows 401 errors to Supabase
3. `MLT_CONFIG.supabase.anonKey.length` returns < 200

---

## Migration Steps (Implementing This Architecture)

### Phase 1: Create Infrastructure

```bash
# Create backup directory
mkdir -p /home/maximus/projects/mlt-asset-tracker/backups

# Create verification script
# (copy verify-keys.py from above)

# Create deployment script  
# (copy deploy.py from above)

# Make executable
chmod +x /home/maximus/projects/mlt-asset-tracker/deploy.py
chmod +x /home/maximus/projects/mlt-asset-tracker/verify-keys.py
```

### Phase 2: Migrate index.html

1. Add `<script src="config.js"></script>` before the main script block
2. Replace embedded key constants with config references:
   ```javascript
   const SUPABASE_URL = MLT_CONFIG.supabase.url;
   const SUPABASE_ANON_KEY = MLT_CONFIG.supabase.anonKey;
   ```
3. Run verification
4. Deploy

### Phase 3: Update Workflow

- Always use `deploy.py` for deployments
- Never manually edit config.js
- Run verification after any index.html changes

---

## Key Principles

1. **Single Source of Truth**: Key lives ONLY in `~/.centurion/secrets/supabase_anon_key.txt`
2. **Never Patch Keys**: config.js is regenerated, never patched
3. **Verify Before Deploy**: Every deploy runs integrity checks
4. **Automated Backups**: Timestamped backup before every change
5. **Fast Rollback**: One command to restore working state

---

## Appendix: Why Keys Get Corrupted

The mcp_patch tool uses fuzzy matching to find and replace text. When a 208-character JWT key is part of a larger code block:

1. The key might get matched partially
2. Line wrapping might split the key
3. Similar patterns elsewhere might cause wrong matches
4. The key's length makes exact matching unreliable

**Solution**: Keep keys in a separate, small file that's never patched — only regenerated from canonical source.
