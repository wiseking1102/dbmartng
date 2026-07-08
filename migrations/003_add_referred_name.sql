-- Migration: 003_add_referred_name
-- Adds referred_name column to referrals table for displaying referred user names in reward history

ALTER TABLE referrals ADD COLUMN referred_name TEXT;

