# MLT Asset Tracker - Comprehensive Code Audit Report
**Date:** November 24, 2026  
**Audited File:** `index.html` (6,077 lines)  
**Status:** 🔴 CRITICAL ISSUES FOUND

---

## 🔴 CRITICAL (Severity: 10/10) - Application Breaking

### Issue #1: CORRUPTED SUPABASE ANON KEY
**Location:** Line 2382  
**Impact:** ALL Supabase functionality is broken - no database operations will work

```javascript
const SUPABASE_ANON_KEY = 'eyJhbG...nBl4';
```

**Problem:** The anon key is truncated/corrupted. A valid Supabase anon key is approximately 200+ characters (JWT format). This key is only ~15 characters.

**Affected Features:**
- ❌ Audit logging (line 2395)
- ❌ Tower movements sync (line 2543)
- ❌ Activity feed (lines 4530, 4628)
- ❌ PO documents upload/sync (lines 5520, 5649-5664)
- ❌ PO overrides (line 2974)
- ❌ Manual POs sync (line 3381)
- ❌ Archived POs sync (line 3546, 3620)
- ❌ Invoice history sync (line 5938)
- ❌ Realtime subscriptions (all channels)

**Fix Required:** Replace with valid ~200 character JWT key from Supabase dashboard.

---

## 🟠 HIGH (Severity: 7-8/10) - Major Functionality Issues

### Issue #2: Supabase Client May Be Null
**Location:** Line 2383  
**Impact:** Silently fails if Supabase library doesn't load

```javascript
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
```

**Problem:** No user feedback when Supabase fails to initialize. All database functions check `if (!supabaseClient) return;` but users won't know data isn't syncing.

**Affected Functions:** 
- `logAudit()` (line 2392)
- `loadMovementsFromSupabase()` (line 2539)
- `saveMovementToSupabase()` (line 2585)
- `loadPOOverrides()` (line 2971)
- `loadPODocsFromSupabase()` (line 5516)
- `subscribeToPODocs()` (line 5548)
- `subscribeToActivityFeed()` (line 4585)

**Fix Required:** Add visible indicator when Supabase is unavailable.

---

### Issue #3: PO Document Upload Logs Activity With Truncated Key
**Location:** Lines 5625-5626  
**Impact:** PO upload notifications won't work due to truncated API key

```javascript
// Log to activity feed
logActivity('Uploaded PO document', `${file.name} for job ${selectedJob}`, null, selectedCustomer, 'Finance');
```

**Problem:** The `logActivity()` function makes a direct fetch call with the corrupted `SUPABASE_ANON_KEY`, so PO upload notifications won't reach other users.

---

### Issue #4: Global Script Execution Before DOM
**Location:** Lines 5578-5579  
**Impact:** Potential race condition

```javascript
// Initialize PO docs sync
loadPODocsFromSupabase();
subscribeToPODocs();
```

**Problem:** These functions are called at script parse time, not inside `DOMContentLoaded` or `showApp()`. They may execute before the user is logged in or DOM is ready.

---

## 🟡 MEDIUM (Severity: 4-6/10) - Feature Limitations

### Issue #5: No Error Recovery for Failed API Calls
**Location:** Multiple locations  
**Impact:** Data may be lost without user knowing

Error handling is inconsistent:
- Line 2548: `console.error('Failed to load movements from Supabase:', error);` - only logs
- Line 2615: `console.error('Failed to save movement to Supabase:', error);` - only logs
- Line 2993: `console.warn('Could not load PO overrides:', err);` - only warns
- Line 5667: `console.warn('Could not save PO doc reference to Supabase:', error);` - only warns

**Problem:** Users are not notified when their data fails to save to the cloud.

---

### Issue #6: Invoice History Fallback May Show Stale Data
**Location:** Lines 5950-5958  
**Impact:** Users may see outdated invoice data

```javascript
if (error) {
    console.error('Load history error:', error);
    return JSON.parse(localStorage.getItem('mlt_approved_invoices') || '[]');
}
```

**Problem:** When Supabase fails, localStorage data is used without indicating it may be outdated.

---

### Issue #7: Movement Sync Has Potential Data Loss
**Location:** Lines 2554-2577  
**Impact:** Movement data could be overwritten

```javascript
movements = data.map(m => ({...}));
```

**Problem:** When loading from Supabase, local movements are completely replaced. Any local-only movements that weren't synced will be lost.

---

### Issue #8: Realtime Subscription Error Handling
**Location:** Lines 4585-4606, 5548-5574  
**Impact:** Users don't know if realtime updates are working

```javascript
.subscribe();  // No error callback
```

**Problem:** Supabase realtime subscriptions have no error handling or retry logic.

---

## 🔵 LOW (Severity: 1-3/10) - Minor Issues & Improvements

### Issue #9: Hardcoded User Codes
**Location:** Lines 2362-2371  
**Impact:** Security/maintenance concern

```javascript
const validCodes = {
    'MICK-NR4B-73HG-KP91': { name: 'Mick', role: 'admin' },
    'MICK-JL5X-28FM-RS46': { name: 'Jake', role: 'finance' },
    ...
};
```

**Problem:** User authentication codes are hardcoded in the client-side JavaScript. Should be stored securely server-side.

---

### Issue #10: Console Logging in Production
**Location:** Multiple locations (20+ instances)  
**Impact:** Performance and debugging clutter

Examples:
- Line 2617: `console.log('Movement saved to Supabase:', movement.towerId);`
- Line 5540: `console.log('Loaded ${data.length} PO documents from Supabase');`
- Line 5555: `console.log('PO document change:', payload);`

**Problem:** Excessive console logging should be disabled or use a debug flag in production.

---

### Issue #11: Magic Numbers and Strings
**Location:** Multiple locations  
**Impact:** Maintainability

Examples:
- Line 2417: `8 * 60 * 60 * 1000` (session duration)
- Line 5598: `10 * 1024 * 1024` (max file size)
- Line 4602-4605: `30000` (refresh interval)

**Problem:** These should be constants with descriptive names.

---

### Issue #12: Duplicate CSS Rules
**Location:** Lines 581-586 and 618-640  
**Impact:** Code bloat

`.data-table` and related rules are defined twice with slightly different values.

---

### Issue #13: Mixed Data Format Handling
**Location:** Lines 6003-6010  
**Impact:** Code complexity

```javascript
// Handle both Supabase format and localStorage format
const invoiceNum = inv.invoice_number || inv.invoiceNumber;
const jobCode = inv.job_code || inv.jobCode;
```

**Problem:** Data format should be normalized on load, not on render.

---

## 📋 SUPABASE TABLES REFERENCED

The application references these Supabase tables (all will fail with corrupted key):

| Table Name | Lines Referenced | Purpose |
|------------|------------------|---------|
| `audit_log` | 2395, 2425 | User activity logging |
| `tower_movements` | 2543, 2590, 2630 | Tower movement tracking |
| `activity_feed` | 4530, 4592, 4628 | Real-time activity feed |
| `po_documents` | 5521, 5554, 5649, 5687 | PO document storage |
| `po_overrides` | 2974, 3152, 3153 | PO data overrides |
| `manual_pos` | 3381, 3431 | Manually created POs |
| `archived_pos` | 3546, 3568, 3620 | Archived PO records |
| `approved_invoices` | 5938 | Invoice history |

---

## 🔧 RECOMMENDED FIXES (Priority Order)

### Priority 1: Fix Supabase Key (CRITICAL)
1. Get valid anon key from Supabase dashboard
2. Replace line 2382 with full key
3. Test all Supabase-dependent features

### Priority 2: Add Connection Status Indicator
1. Create visible indicator showing Supabase status
2. Notify users when operations fail
3. Add retry logic for failed operations

### Priority 3: Move Sensitive Data Server-Side
1. Move user authentication to Supabase Auth
2. Remove hardcoded access codes
3. Implement proper session management

### Priority 4: Code Quality
1. Add constants for magic numbers
2. Normalize data formats
3. Remove duplicate CSS
4. Add production logging controls

---

## ✅ WORKING FEATURES (Not Affected by Supabase Issue)

These features work locally (via localStorage):
- ✅ Login/logout (local session)
- ✅ Customer/Site/Job selection
- ✅ Invoice preview and PDF generation
- ✅ CSV export
- ✅ Email client integration
- ✅ Local movement tracking
- ✅ Local PO document storage (base64)
- ✅ Tower list display
- ✅ Revenue calculations
- ✅ PO Management display

---

**Report Generated:** Automated Code Audit  
**Lines Analyzed:** 6,077  
**Issues Found:** 13 (1 Critical, 3 High, 4 Medium, 5 Low)
