-- Fix: Drop the overly permissive SELECT policy on dojo_trial_bookings
-- The current policy "Public can view their own trial bookings by email" uses USING(true)
-- which exposes all PII (name, email, phone, etc.) to everyone including anonymous users.
DROP POLICY IF EXISTS "Public can view their own trial bookings by email" ON public.dojo_trial_bookings;