-- Create isolated schema for Hindsight memory
-- Idempotent migration: safe across repaired migration histories.
CREATE SCHEMA IF NOT EXISTS hindsight;
