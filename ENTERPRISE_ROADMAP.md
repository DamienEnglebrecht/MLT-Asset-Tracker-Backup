# MLT Asset Tracker — Enterprise Feature Roadmap

**Version:** 1.0  
**Date:** November 27, 2026  
**Prepared by:** Product & Architecture Analysis

---

## Executive Summary

This document outlines the features, technologies, and capabilities needed to transform MLT Asset Tracker from a functional fleet management tool into a **world-class enterprise asset management system** capable of supporting global mining operations.

The current system handles:
- 1,472 towers (803 on hire)
- PO management with document uploads
- Invoice generation and approval workflows
- Activity feed with realtime sync
- Multi-user authentication with roles

To reach enterprise-grade status, we need to address **9 key areas** outlined below.

---

## 1. MUST-HAVE Enterprise Features

### 1.1 Multi-Tenancy / Multi-Company Support
**What it is:** Ability to manage multiple business entities (subsidiaries, regions) with isolated data but unified reporting.

**Why it matters:** As MLT expands globally, they may operate under different legal entities in Australia, Africa, South America. Each needs separate billing, compliance, but executives need consolidated views.

**Implementation Complexity:** High
- Database schema changes for tenant isolation
- UI for switching between entities
- Cross-entity reporting capabilities

### 1.2 Workflow Approval Engine
**What it is:** Configurable multi-step approval workflows for invoices, POs, asset disposals, and large transactions.

**Why it matters:** Enterprise customers like BHP, Glencore require documented approval chains for auditing. Currently, approval is binary (approve/reject). Need: Request → Manager → Finance → Final.

**Implementation Complexity:** Medium
- Workflow state machine
- Email/notification triggers
- Delegation and escalation rules

### 1.3 Contract Management Module
**What it is:** Full lifecycle management of customer contracts including terms, pricing tiers, automatic renewals, and SLA tracking.

**Why it matters:** Mining contracts are complex with volume discounts, mobilization fees, penalty clauses. Currently, job codes exist but lack contract context.

**Implementation Complexity:** Medium
- Contract entity with terms, dates, pricing rules
- Link contracts to jobs/POs
- Renewal alerts and reporting

### 1.4 Asset Lifecycle Management
**What it is:** Track assets from procurement through disposal: purchase date, warranty, depreciation, maintenance history, end-of-life planning.

**Why it matters:** Mining equipment has significant capital value. Executives need to know: When should we replace vs. repair? What's our total cost of ownership?

**Implementation Complexity:** Medium
- Extended tower metadata (purchase_date, warranty_expiry, purchase_price, residual_value)
- Depreciation calculations
- End-of-life forecasting

### 1.5 Scheduled Reports & Dashboards
**What it is:** Automated report generation and delivery (daily/weekly/monthly) to stakeholders via email or Slack.

**Why it matters:** Damien and Debbie shouldn't have to log in daily to see KPIs. Scheduled reports ensure visibility without manual effort.

**Implementation Complexity:** Low-Medium
- Report templates with parameters
- Cron-based generation
- PDF/Excel export and email delivery

---

## 2. Modern Technology Stack Improvements

### 2.1 Migrate to React/Next.js
**What it is:** Replace single-file vanilla JS (12,000+ lines in index.html) with component-based React using Next.js for server-side rendering.

**Why it matters:** 
- Current codebase is unmaintainable at scale
- Component reuse across features
- Better developer experience and testability
- SEO and performance benefits

**Implementation Complexity:** High (but essential)
- Incremental migration possible
- Keep Supabase backend
- Add TypeScript for type safety

### 2.2 Progressive Web App (PWA)
**What it is:** Enable offline-first capabilities with service workers, installable on mobile devices without app stores.

**Why it matters:** Mining sites often have poor/no internet connectivity. Field staff need to log movements offline and sync later.

**Current state:** IndexedDB queue exists but isn't a full PWA.

**Implementation Complexity:** Medium
- Service worker for caching
- Manifest file for installability
- Conflict resolution for sync

### 2.3 Real-Time Collaboration
**What it is:** Live cursors, presence indicators, and conflict-free simultaneous editing (like Google Docs).

**Why it matters:** Multiple staff may work on the same invoice or PO simultaneously. Currently, last-write-wins can cause data loss.

**Implementation Complexity:** Medium
- Supabase Realtime already in place
- Add presence channels
- Implement CRDT or OT for conflicts

### 2.4 Monorepo with Turborepo/Nx
**What it is:** Unified codebase for web app, mobile app, shared libraries, and API types.

**Why it matters:** As you add mobile apps and APIs, shared code prevents duplication and ensures consistency.

**Implementation Complexity:** Medium
- Initial setup overhead
- Long-term maintainability gains

---

## 3. AI/ML Capabilities

### 3.1 Predictive Maintenance Alerts
**What it is:** ML models analyze run hours, service history, environmental conditions to predict when towers will need maintenance.

**Why it matters:** Unplanned breakdowns at remote mine sites cost $10,000+ per day in lost revenue and mobilization. Predict failures 2 weeks ahead.

**Implementation Complexity:** High
- Requires sensor data integration (run hours, temperatures)
- Historical failure data for training
- Dashboard for maintenance recommendations

### 3.2 Invoice Anomaly Detection
**What it is:** AI flags unusual invoices: spikes in charges, missing POs, duplicate billing, pricing errors.

**Why it matters:** Manual review of 50+ invoices/week is error-prone. AI can highlight outliers for human review.

**Implementation Complexity:** Medium
- Statistical analysis of historical billing
- Rules engine + ML classification
- Alert dashboard

### 3.3 Smart Document Processing
**What it is:** OCR and AI extraction of PO documents: automatically pull PO numbers, dates, amounts, line items from uploaded PDFs.

**Why it matters:** Staff currently manually enter PO details. AI can extract in seconds with 95%+ accuracy.

**Implementation Complexity:** Medium
- Integrate with AWS Textract, Google Document AI, or Azure Form Recognizer
- Validation UI for corrections
- Learning from corrections

### 3.4 Demand Forecasting
**What it is:** Predict future tower demand based on historical patterns, seasonality, commodity prices, customer activity.

**Why it matters:** Know when to increase fleet, which customers are likely to expand, optimal pricing strategies.

**Implementation Complexity:** High
- Time-series analysis
- External data integration (commodity prices)
- Executive dashboard

### 3.5 AI-Powered Chat Assistant
**What it is:** Natural language interface: "How many towers are on hire at Moranbah?", "Show me overdue invoices for Glencore."

**Why it matters:** Faster access to information without navigating UI. Executives can query on the go.

**Implementation Complexity:** Medium
- LLM integration (Claude API, GPT-4)
- Structured query generation
- Access control for data

---

## 4. Integration Opportunities

### 4.1 Accounting Software Integration
**What it is:** Bi-directional sync with Xero, MYOB, QuickBooks for invoices, payments, and customer records.

**Priority:** HIGH — Australian mining companies typically use Xero or MYOB.

**Benefits:**
- Auto-create invoices in accounting system
- Payment status sync back to MLT
- Eliminate double-entry
- GST/tax compliance

**Implementation Complexity:** Medium
- Xero/MYOB APIs are well-documented
- OAuth authentication
- Mapping between entities

### 4.2 CRM Integration
**What it is:** Sync customer data, contacts, and opportunities with Salesforce or HubSpot.

**Why it matters:** Sales team needs visibility into customer activity, renewal dates, and expansion opportunities.

**Implementation Complexity:** Medium
- Customer/contact sync
- Activity logging
- Opportunity tracking

### 4.3 GPS/Telematics Integration
**What it is:** Real-time location tracking of towers via GPS trackers, plus runtime/status data from IoT sensors.

**Why it matters:** 
- Know exactly where every tower is (not just which site)
- Track unauthorized movement
- Automatic run-hour logging
- Proof of delivery/pickup

**Recommended Providers:** Geotab, Verizon Connect, ThingsBoard (open-source)

**Implementation Complexity:** Medium-High
- Hardware selection and deployment
- API integration for location data
- Map visualization in UI

### 4.4 IoT Sensor Integration
**What it is:** Collect runtime hours, fuel levels, generator health, light output from sensors on towers.

**Why it matters:**
- Automatic billing based on actual usage
- Predictive maintenance from real data
- Remote diagnostics
- Theft/tampering alerts

**Implementation Complexity:** High
- Sensor hardware selection
- Data ingestion pipeline
- Alert thresholds and rules

### 4.5 Mine Site Systems Integration
**What it is:** Connect with customer ERP/procurement systems (SAP, Oracle) for automated PO processing.

**Why it matters:** Large miners may want automated PO flow without manual document exchange.

**Implementation Complexity:** High
- EDI/API standards (PEPPOL, OAGIS)
- Per-customer customization

---

## 5. Advanced Reporting & Analytics

### 5.1 Executive Dashboard
**What it is:** Real-time KPIs for leadership: fleet utilization, revenue trends, customer concentration, regional performance.

**Key Metrics:**
- Overall utilization rate (target: >85%)
- Revenue per tower per day
- Customer concentration risk (top 5 = X% of revenue)
- Regional performance comparison
- Month-over-month trends

**Implementation Complexity:** Medium
- Dashboard UI with charts
- Aggregation queries
- Date range filtering

### 5.2 Customer Health Scoring
**What it is:** Algorithmic scoring of customer relationships based on payment history, volume trends, communication patterns.

**Why it matters:** Identify at-risk customers before they churn. Prioritize account management.

**Implementation Complexity:** Medium
- Scoring model based on data points
- Trend visualization
- Alert thresholds

### 5.3 Profitability Analysis
**What it is:** True profitability per customer, site, and tower including mobilization costs, maintenance, and depreciation.

**Why it matters:** Some jobs look profitable on revenue but lose money when all costs are included.

**Implementation Complexity:** Medium
- Cost allocation rules
- Margin calculations
- Comparison views

### 5.4 Custom Report Builder
**What it is:** Self-service report creation with drag-and-drop fields, filters, and visualizations.

**Why it matters:** Reduces IT dependency. Users can answer their own questions.

**Implementation Complexity:** High
- Report builder UI
- Query optimization
- Export formats

### 5.5 Business Intelligence Export
**What it is:** Data warehouse export for tools like PowerBI, Tableau, Metabase.

**Why it matters:** Enterprise customers may have existing BI infrastructure. MLT data should feed into it.

**Implementation Complexity:** Low
- Data export APIs
- Scheduled dumps
- Schema documentation

---

## 6. Mobile App Considerations

### 6.1 Native Mobile App (React Native)
**What it is:** iOS and Android app for field operations: tower pickup/delivery, photo capture, offline sync.

**Key Features:**
- Tower scanner (QR code or search)
- Movement logging with GPS
- Photo capture (before/after)
- Offline queue with auto-sync
- Push notifications for assignments

**Why it matters:** Field staff are on-site with phones, not laptops. Mobile is primary interface for operations.

**Implementation Complexity:** Medium-High
- React Native shared codebase
- Supabase mobile SDK
- Camera/GPS integration

### 6.2 Driver/Delivery App
**What it is:** Specialized app for transport drivers with route optimization and proof of delivery.

**Features:**
- Day's deliveries list
- Turn-by-turn navigation
- Digital signature capture
- Photo documentation
- Time stamps for arrival/departure

**Implementation Complexity:** Medium
- Map integration (Google/Mapbox)
- Signature component
- Route optimization API

### 6.3 Customer Portal (Mobile-Responsive)
**What it is:** Self-service portal for customers to view their towers, invoices, request moves, and approve POs.

**Why it matters:** Reduces admin burden. Customers appreciate transparency and self-service.

**Implementation Complexity:** Medium
- Separate auth for customers
- Read-only fleet view
- Invoice payment links
- Request workflows

---

## 7. Security & Compliance Features

### 7.1 Comprehensive Audit Trail
**What it is:** Immutable log of all data changes with who, what, when, and before/after values.

**Current state:** Basic audit_log table exists but needs enhancement.

**Enhancements needed:**
- Full before/after snapshots
- User session context
- IP address logging
- Audit log search/export
- Tamper-evident (hash chain)

**Implementation Complexity:** Low-Medium

### 7.2 Role-Based Access Control (RBAC) Enhancement
**What it is:** Granular permissions beyond current 4 roles. Field-level and record-level security.

**Current:** admin, operations, finance, viewer

**Needed:**
- Custom roles per customer/region
- Permission inheritance
- Field-level visibility (hide pricing from operations)
- Record-level security (only see your region)

**Implementation Complexity:** Medium

### 7.3 Multi-Factor Authentication (MFA)
**What it is:** Second factor (TOTP, SMS, or hardware key) for login security.

**Why it matters:** Enterprise security requirements. Prevents credential theft.

**Implementation Complexity:** Low
- Supabase supports MFA
- UI for setup and recovery

### 7.4 Single Sign-On (SSO)
**What it is:** Login via enterprise identity providers (Okta, Azure AD, Google Workspace).

**Why it matters:** Large customers may require SSO for their staff accessing MLT portal.

**Implementation Complexity:** Medium
- SAML/OIDC integration
- Supabase Auth supports OAuth
- Customer-specific configuration

### 7.5 SOC 2 / ISO 27001 Compliance
**What it is:** Security certifications demonstrating enterprise-grade data protection.

**Why it matters:** Enterprise customers increasingly require vendor security certifications.

**Key requirements:**
- Access controls (RBAC ✓)
- Audit logging (partial ✓)
- Encryption at rest/transit (Supabase ✓)
- Incident response procedures
- Vendor security assessments
- Regular penetration testing

**Implementation Complexity:** High (ongoing process)

### 7.6 Data Encryption & Privacy
**What it is:** End-to-end encryption for sensitive data, GDPR/Australian Privacy Act compliance.

**Features needed:**
- PII encryption at rest
- Data retention policies
- Right to deletion
- Privacy policy management
- Consent tracking

**Implementation Complexity:** Medium

---

## 8. Automation Opportunities

### 8.1 Invoice Auto-Generation
**What it is:** Automatically generate weekly invoices based on tower status at billing period end.

**Current:** Semi-manual invoice generation.

**Needed:**
- Scheduled job for each billing period
- Auto-calculate prorated days
- Apply contract pricing rules
- Queue for approval

**Implementation Complexity:** Low-Medium

### 8.2 PO Expiry Alerts
**What it is:** Automated notifications when POs are approaching expiry (30/14/7 days).

**Current:** Manual monitoring.

**Needed:**
- Scheduled daily check
- Email/Slack notifications
- Dashboard alert badge
- Escalation if ignored

**Implementation Complexity:** Low

### 8.3 Customer Communication Automation
**What it is:** Automated emails for invoice delivery, payment reminders, overdue notices.

**Current:** Manual email sending.

**Needed:**
- Email templates
- Scheduled sends
- Payment reminder sequences
- Read/response tracking

**Implementation Complexity:** Low-Medium

### 8.4 Equipment Service Reminders
**What it is:** Automatic alerts when towers reach service intervals based on run hours or calendar.

**Features:**
- Configurable service intervals
- Run-hour tracking
- Calendar-based fallback
- Assignment to service team

**Implementation Complexity:** Medium

### 8.5 Workflow Automation (Zapier/Make Style)
**What it is:** User-configurable automations: "When PO expires, notify customer AND create task."

**Why it matters:** Reduces need for developer intervention for business process changes.

**Implementation Complexity:** High
- Rules engine
- Trigger/action framework
- UI for configuration

---

## 9. UX/UI Improvements

### 9.1 Responsive Design Overhaul
**What it is:** Mobile-first design that works seamlessly on all device sizes.

**Current state:** Functional but not optimized for mobile.

**Needed:**
- Mobile navigation
- Touch-friendly interactions
- Responsive data tables
- Mobile-specific views

**Implementation Complexity:** Medium

### 9.2 Dark/Light Mode Toggle
**What it is:** User preference for color scheme.

**Current:** Dark mode only.

**Why it matters:** User preference; accessibility; different lighting conditions.

**Implementation Complexity:** Low

### 9.3 Keyboard Navigation & Shortcuts
**What it is:** Full keyboard accessibility plus power-user shortcuts.

**Examples:**
- `Cmd+K` for command palette
- Tab navigation
- Arrow key lists
- Hotkeys for common actions

**Implementation Complexity:** Low-Medium

### 9.4 Onboarding & Help System
**What it is:** Guided tours for new users, contextual help, searchable documentation.

**Why it matters:** Reduces training burden. New staff productive faster.

**Implementation Complexity:** Medium
- Tour library integration
- Help articles/videos
- In-app search

### 9.5 Notification Center
**What it is:** Centralized inbox for all alerts, mentions, and system notifications.

**Current:** Activity feed exists but lacks personal notifications.

**Needed:**
- Personal notification queue
- Read/unread state
- Notification preferences
- Push notifications (mobile/browser)

**Implementation Complexity:** Medium

### 9.6 Bulk Operations
**What it is:** Select multiple items and apply actions (approve, export, assign).

**Current:** Single-item operations only.

**Needed:**
- Multi-select UI
- Bulk action menu
- Progress indicator
- Undo capability

**Implementation Complexity:** Low-Medium

### 9.7 Advanced Search & Filters
**What it is:** Powerful search with filters, saved searches, and search history.

**Features:**
- Full-text search across entities
- Filter combinations
- Save favorite searches
- Recent searches

**Implementation Complexity:** Medium

### 9.8 Data Visualization Upgrade
**What it is:** Modern charts using libraries like Recharts, Victory, or D3 for dashboards.

**Current:** Basic/no charts.

**Needed:**
- Line charts for trends
- Bar charts for comparisons
- Pie charts for distributions
- Sparklines for inline KPIs

**Implementation Complexity:** Low-Medium

---

## Implementation Prioritization

### Phase 1: Foundation (Q1 2027)
| Feature | Complexity | Business Impact |
|---------|------------|-----------------|
| Xero/MYOB Integration | Medium | Very High |
| Invoice Auto-Generation | Low-Medium | High |
| PO Expiry Alerts | Low | High |
| Scheduled Reports | Low-Medium | High |
| MFA Authentication | Low | Medium |
| Audit Trail Enhancement | Low-Medium | Medium |

### Phase 2: Mobile & Operations (Q2 2027)
| Feature | Complexity | Business Impact |
|---------|------------|-----------------|
| PWA Implementation | Medium | Very High |
| Native Mobile App | Medium-High | Very High |
| GPS Integration | Medium-High | High |
| Bulk Operations | Low-Medium | Medium |
| Responsive Design | Medium | Medium |

### Phase 3: Intelligence (Q3 2027)
| Feature | Complexity | Business Impact |
|---------|------------|-----------------|
| Smart Document OCR | Medium | High |
| Executive Dashboard | Medium | High |
| Invoice Anomaly Detection | Medium | Medium |
| AI Chat Assistant | Medium | Medium |
| Customer Health Scoring | Medium | Medium |

### Phase 4: Enterprise Scale (Q4 2027)
| Feature | Complexity | Business Impact |
|---------|------------|-----------------|
| Multi-Tenancy | High | Very High |
| SSO Integration | Medium | High |
| Workflow Approval Engine | Medium | High |
| Contract Management | Medium | Medium |
| IoT Sensor Integration | High | High |

### Phase 5: Platform (2028+)
| Feature | Complexity | Business Impact |
|---------|------------|-----------------|
| React/Next.js Migration | High | Long-term |
| Predictive Maintenance | High | High |
| Customer Portal | Medium | Medium |
| Workflow Automation Engine | High | Medium |
| SOC 2 Certification | High | High |

---

## Technology Recommendations

### Recommended Stack for Migration

```
Frontend:
├── Next.js 14+ (App Router)
├── TypeScript
├── Tailwind CSS
├── Shadcn/UI components
├── TanStack Query (data fetching)
├── Zustand (state management)
└── Recharts (visualizations)

Backend (keep existing):
├── Supabase (Postgres + Auth + Realtime + Storage)
├── Edge Functions (Deno)
└── Add: Supabase Cron for scheduled jobs

Mobile:
├── React Native + Expo
├── Shared TypeScript types
└── Supabase Mobile SDK

AI/ML:
├── Claude API (Anthropic) for AI assistant
├── AWS Textract for document OCR
└── Custom ML models on Supabase Edge (future)

Integrations:
├── Xero API (accounting)
├── Geotab API (GPS/telematics)
├── SendGrid (email)
└── Twilio (SMS notifications)
```

---

## Competitive Benchmarks

### Enterprise Asset Management Leaders

| Feature | SAP EAM | Oracle EAM | IBM Maximo | MLT Current | MLT Target |
|---------|---------|------------|------------|-------------|------------|
| Multi-tenancy | ✅ | ✅ | ✅ | ❌ | ✅ |
| Predictive Maintenance | ✅ | ✅ | ✅ | ❌ | ✅ |
| IoT Integration | ✅ | ✅ | ✅ | ❌ | ✅ |
| Mobile App | ✅ | ✅ | ✅ | Partial | ✅ |
| Workflow Engine | ✅ | ✅ | ✅ | ❌ | ✅ |
| AI/ML Analytics | ✅ | ✅ | ✅ | ❌ | ✅ |
| Accounting Integration | ✅ | ✅ | ✅ | ❌ | ✅ |
| Real-time Sync | ✅ | ✅ | ✅ | ✅ | ✅ |
| Document Management | ✅ | ✅ | ✅ | ✅ | ✅ |

**MLT Advantage:** Purpose-built for lighting tower rental in mining. Simpler, faster to use than heavyweight ERP solutions.

---

## Estimated Investment

### Development Resources

| Phase | Duration | Team Size | Focus |
|-------|----------|-----------|-------|
| Phase 1 | 3 months | 2 devs | Integrations & automation |
| Phase 2 | 3 months | 3 devs | Mobile & operations |
| Phase 3 | 3 months | 2 devs | AI/ML & analytics |
| Phase 4 | 3 months | 3 devs | Enterprise features |
| Phase 5 | 6 months | 2-3 devs | Platform modernization |

### Third-Party Costs (Annual)

| Service | Estimated Cost |
|---------|---------------|
| Xero API (Partner) | $500-2,000 |
| GPS/Telematics | $5-15/tower/month |
| SendGrid (Email) | $500-2,000 |
| AWS Textract | $0.015/page |
| Claude API | $500-2,000 |
| Supabase Pro | $300/month |

---

## Conclusion

MLT Asset Tracker has a solid foundation. The key priorities for enterprise readiness are:

1. **Accounting Integration** — Eliminate manual invoice entry
2. **Mobile App** — Enable field operations
3. **GPS Tracking** — Real-time asset visibility
4. **Automation** — Reduce repetitive manual work
5. **Compliance** — Audit trails and security

The recommended approach is incremental improvement while planning for a React/Next.js migration to support long-term scalability.

---

*Document prepared by Product & Architecture Analysis*  
*Last updated: November 27, 2026*
