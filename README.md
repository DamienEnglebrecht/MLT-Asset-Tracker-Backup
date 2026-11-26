# MLT Asset Tracker

Web application for tracking mining lighting towers for Mickala Group.

## Overview

The MLT Asset Tracker is a single-page web application built with vanilla JavaScript and Supabase backend. It provides:

- **Operations View**: Log tower movements, change status, batch entry
- **Finance View**: Generate weekly billing reports per customer
- **Tower Lookup**: Search and view individual tower details and history

## Files

- `index.html` - Main application (single-file, self-contained)
- `supabase-schema.sql` - Database schema with RLS policies
- `seed-tower-data.sql` - Sample tower data (100 towers)
- `generate-tower-sql.py` - Script to generate full tower import from fleet-data.json

## Setup

### 1. Supabase Setup

1. Create a Supabase project (or use existing: fntqwckvrdbemjadcpcz)
2. Run `supabase-schema.sql` in the SQL editor
3. Run `seed-tower-data.sql` for sample data
4. (Optional) Run `generate-tower-sql.py` to generate full tower import

### 2. Configure API Key

Update the `SUPABASE_ANON_KEY` in `index.html` with your actual anon key:

```javascript
const SUPABASE_URL = 'https://fntqwckvrdbemjadcpcz.supabase.co';
const SUPABASE_ANON_KEY = 'your-actual-anon-key';
```

### 3. Deploy to Vercel

1. Push to a Git repository
2. Connect to Vercel
3. Deploy (it's a static site, no build step required)

## Authentication

Staff members authenticate using access codes:

| Name   | Role       | Access Code          |
|--------|------------|----------------------|
| Damien | Admin      | MICK-RRMB-AUD5-4HA7 |
| Debbie | Operations | MICK-Y2SK-48XE-PB66 |

### Roles

- **Admin**: Full access to all features
- **Operations**: Can log movements, change status, search towers
- **Finance**: Can view billing reports (read-only for tower data)
- **Readonly**: View-only access

## Features

### Operations View
- Batch movement entry with From/To/Date/Status
- Quick status change buttons (On Hire, Off Hire, Repairs, Transit, Depot)
- Site list sidebar with search
- Real-time activity feed

### Finance View
- Weekly billing period selector
- Customer list with tower counts and totals
- Invoice preview with line items
- Export to CSV
- Mid-week move indicators (prorated billing)

### Tower Lookup
- Global tower search (MLT-XXXX format)
- Tower detail card with status, location, stats
- Movement and status history table
- Billing information panel
- Quick action buttons

### Offline Support
- IndexedDB queue for offline movements
- Automatic sync when connection restored
- Visual indicator for queued items

### Security
- Staff code authentication (no passwords)
- Session tokens with 8-hour expiry
- Row-level security in Supabase
- Role-based access control
- Audit trail on all changes

## Database Schema

### Tables

- `staff` - User accounts and access codes
- `customers` - Customer records (Glencore, BMA, etc.)
- `sites` - Mine sites, depots, workshops
- `towers` - The main asset table
- `movements` - Tower relocation records
- `status_changes` - Status update records
- `billing_periods` - Weekly billing cycles
- `invoices` - Generated invoice records
- `invoice_lines` - Invoice line items per tower
- `audit_log` - Comprehensive audit trail
- `sessions` - Authentication sessions

### Views

- `tower_summary` - Tower with current location and customer
- `recent_activity` - Combined movements and status changes

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Supabase (PostgreSQL + PostgREST)
- **Auth**: Custom session-based (via Supabase RPC)
- **Offline**: IndexedDB
- **Hosting**: Vercel (static)

## Design

- Dark theme (background: #0a0a0a)
- Orange accent (#f97316)
- MLT branding
- Responsive (mobile and desktop)

Based on approved mockups in `/home/maximus/projects/asset-tracker-designs/v2/`

## License

Proprietary - Mickala Group
