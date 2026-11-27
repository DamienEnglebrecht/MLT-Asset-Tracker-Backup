# MLT Asset Tracker — Change Log

All code changes must be logged here. Format:
```
## [DATE] [TIME AEST] — [WHO]
**Changed:** [file:function or component]
**Reason:** [why]
**Impact:** [what else might be affected]
**Tested:** [yes/no] [test results file if yes]
**Deployed:** [yes/no] [version if yes]
```

---

## 2026-11-27 15:45 AEST — Max (AI)
**Changed:** index.html:approveInvoice(), index.html:saveInvoiceToSupabase(), index.html:getTowerDeploymentDates()
**Reason:** Added per-tower day calculation based on deployment dates from tower_movements table
**Impact:** Invoice generation, Supabase queries, button state
**Tested:** YES — full approval flow tested, invoice saved to Supabase (INV-10W25001-MWYJQ2H7)
**Deployed:** YES — currently on production

## 2026-11-27 14:30 AEST — Max (AI)
**Changed:** index.html:saveInvoiceToSupabase()
**Reason:** Fixed undefined `user` variable — was using `user.name` but `user` was scoped to calling function
**Impact:** All invoice approvals were failing silently (activity_feed logged but Supabase insert crashed)
**Tested:** NO — deployed without full test (MISTAKE)
**Deployed:** YES
**Incident:** Debbie's 14 invoices lost, had to recover from activity_feed

## 2026-11-27 12:00 AEST — Max (AI)
**Changed:** index.html:approveInvoice() — added tower movement tracking
**Reason:** Per-tower billing based on actual deployment date
**Impact:** Introduced async/await, Supabase query dependency
**Tested:** Partial — syntax only, not full flow
**Deployed:** YES
**Incident:** Broke invoice approval, caused 14 lost invoices

---

## INCIDENTS LOG

| Date | Issue | Root Cause | Resolution | Time to Fix |
|------|-------|------------|------------|-------------|
| 27 Nov 2026 | Debbie's invoices not saving | `user.name` undefined in saveInvoiceToSupabase | Changed to getVerifiedCurrentUser()?.name | 2 hours |
| 27 Nov 2026 | 14 invoices lost | Above bug caused silent failure | Recovered from activity_feed | 30 mins |

