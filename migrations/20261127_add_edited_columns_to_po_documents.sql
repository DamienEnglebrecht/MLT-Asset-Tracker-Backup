-- Migration: Add edited_at and edited_by columns to po_documents table
-- Date: 2026-11-27
-- Description: Track who edited PO documents and when
-- Applied via: Supabase Management API

-- Add edited_at column with default timestamp
ALTER TABLE po_documents ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ DEFAULT NOW();

-- Add edited_by column to track the user who made the edit
ALTER TABLE po_documents ADD COLUMN IF NOT EXISTS edited_by TEXT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
